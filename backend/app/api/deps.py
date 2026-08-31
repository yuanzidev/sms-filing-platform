"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import json
from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.permissions import ALL_PERMISSIONS
from app.core.db import engine
from app.models import TokenPayload, User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_user_permissions(user: User) -> list[str]:
    """读取用户角色上存储的权限点列表（JSON 字符串）"""
    if user.is_superuser:
        return list(ALL_PERMISSIONS)
    if not user.role or not user.role.permissions:
        return []
    try:
        permissions = json.loads(user.role.permissions)
    except (json.JSONDecodeError, TypeError):
        return []
    return [str(p) for p in permissions if isinstance(p, str)]


def require_permission(*required: str):
    """接口级权限依赖：当前用户需持有任一所需权限点，超级用户全部放行"""

    def dependency(session: SessionDep, current_user: CurrentUser) -> User:
        if current_user.is_superuser:
            return current_user
        granted = set(get_user_permissions(current_user))
        if not granted.intersection(required):
            raise HTTPException(
                status_code=403,
                detail="没有执行此操作的权限，请联系管理员分配",
            )
        return current_user

    return dependency
