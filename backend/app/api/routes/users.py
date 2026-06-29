"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    LoginLog,
    Message,
    ResetPassword,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
    UserStatus,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
@router.get(
    "/",
    include_in_schema=False,
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(
    session: SessionDep, 
    skip: int = 0, 
    limit: int = 100,
    username: str | None = None,
    status: UserStatus | None = None,
    role_id: uuid.UUID | None = None,
) -> Any:
    """
    获取用户列表
    """
    query = select(User)
    
    # 添加过滤条件
    if username:
        query = query.where(User.username.contains(username))
    if status:
        query = query.where(User.status == status)
    if role_id:
        query = query.where(User.role_id == role_id)

    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    statement = query.offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(data=users, count=count)


@router.post(
    "", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic, include_in_schema=False
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    删除用户
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="超级用户不能删除自己"
        )
    session.delete(user)
    session.commit()
    return Message(message="用户删除成功")


@router.patch("/{user_id}/reset-password", dependencies=[Depends(get_current_active_superuser)])
def reset_user_password(
    session: SessionDep, user_id: uuid.UUID, password_data: ResetPassword
) -> Message:
    """
    重置用户密码
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    from app.core.security import get_password_hash
    user.hashed_password = get_password_hash(password_data.new_password)
    session.add(user)
    session.commit()
    return Message(message="密码重置成功")


@router.patch("/{user_id}/status", dependencies=[Depends(get_current_active_superuser)])
def update_user_status(
    session: SessionDep, user_id: uuid.UUID, status: UserStatus
) -> Message:
    """
    更新用户状态
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.status = status
    session.add(user)
    session.commit()
    return Message(message=f"用户状态已更新为 {status.value}")


@router.patch("/{user_id}/enable", dependencies=[Depends(get_current_active_superuser)])
def enable_user(session: SessionDep, user_id: uuid.UUID) -> Message:
    """
    启用用户
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.status = UserStatus.ACTIVE
    user.is_active = True
    session.add(user)
    session.commit()
    return Message(message="用户已启用")


@router.patch("/{user_id}/disable", dependencies=[Depends(get_current_active_superuser)])
def disable_user(session: SessionDep, user_id: uuid.UUID) -> Message:
    """
    禁用用户
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    user.status = UserStatus.INACTIVE
    user.is_active = False
    session.add(user)
    session.commit()
    return Message(message="用户已禁用")
