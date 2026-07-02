"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Message,
    Role,
    RoleCreate,
    RoleUpdate,
    User,
)
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/roles", tags=["roles"])


class RolePublic(BaseModel):
    """角色公开模型"""
    id: str
    name: str
    description: str | None
    permissions: List[str]
    host_permissions: List[str]
    created_at: str
    updated_at: str
    user_count: int = 0


class RolesPublic(BaseModel):
    """角色列表响应模型"""
    data: List[RolePublic]
    count: int


@router.get("", response_model=RolesPublic)
@router.get("/", response_model=RolesPublic, include_in_schema=False)
def read_roles(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    获取角色列表
    """
    count_statement = select(func.count()).select_from(Role)
    count = session.exec(count_statement).one()

    statement = select(Role).offset(skip).limit(limit)
    roles = session.exec(statement).all()

    # 处理权限字段，将JSON字符串转换为数组
    role_list = []
    for role in roles:
        try:
            permissions = json.loads(role.permissions) if role.permissions else []
        except (json.JSONDecodeError, TypeError):
            permissions = []
        
        try:
            host_permissions = json.loads(role.host_permissions) if role.host_permissions else []
        except (json.JSONDecodeError, TypeError):
            host_permissions = []
        
        # 统计该角色下的用户数量
        user_count = session.exec(
            select(func.count()).select_from(User).where(User.role_id == role.id)
        ).one()

        role_list.append(RolePublic(
            id=str(role.id),
            name=role.name,
            description=role.description,
            permissions=permissions,
            host_permissions=host_permissions,
            created_at=role.created_at.isoformat(),
            updated_at=role.updated_at.isoformat(),
            user_count=int(user_count),
        ))

    return RolesPublic(data=role_list, count=count)


@router.post("", dependencies=[Depends(get_current_active_superuser)], response_model=RolePublic)
@router.post("/", dependencies=[Depends(get_current_active_superuser)], response_model=RolePublic, include_in_schema=False)
def create_role(*, session: SessionDep, role_in: RoleCreate) -> Any:
    """
    创建新角色
    """
    role = crud.get_role_by_name(session=session, name=role_in.name)
    if role:
        raise HTTPException(
            status_code=400,
            detail="该角色名称已存在",
        )

    role = crud.create_role(session=session, role_create=role_in)
    
    # 返回正确格式的角色数据
    try:
        permissions = json.loads(role.permissions) if role.permissions else []
    except (json.JSONDecodeError, TypeError):
        permissions = []
    
    try:
        host_permissions = json.loads(role.host_permissions) if role.host_permissions else []
    except (json.JSONDecodeError, TypeError):
        host_permissions = []
    
    # 统计该角色下的用户数量
    user_count = session.exec(
        select(func.count()).select_from(User).where(User.role_id == role.id)
    ).one()

    return RolePublic(
        id=str(role.id),
        name=role.name,
        description=role.description,
        permissions=permissions,
        host_permissions=host_permissions,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat(),
        user_count=int(user_count),
    )


@router.get("/{role_id}", response_model=RolePublic)
def read_role_by_id(role_id: uuid.UUID, session: SessionDep) -> Any:
    """
    根据ID获取角色
    """
    role = crud.get_role_by_id(session=session, role_id=role_id)
    if not role:
        raise HTTPException(
            status_code=404,
            detail="角色不存在",
        )
    
    # 处理权限字段，将JSON字符串转换为数组
    try:
        permissions = json.loads(role.permissions) if role.permissions else []
    except (json.JSONDecodeError, TypeError):
        permissions = []
    
    try:
        host_permissions = json.loads(role.host_permissions) if role.host_permissions else []
    except (json.JSONDecodeError, TypeError):
        host_permissions = []
    
    # 统计该角色下的用户数量
    user_count = session.exec(
        select(func.count()).select_from(User).where(User.role_id == role.id)
    ).one()

    return RolePublic(
        id=str(role.id),
        name=role.name,
        description=role.description,
        permissions=permissions,
        host_permissions=host_permissions,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat(),
        user_count=int(user_count),
    )


@router.patch(
    "/{role_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=RolePublic,
)
def update_role(
    *,
    session: SessionDep,
    role_id: uuid.UUID,
    role_in: RoleUpdate,
) -> Any:
    """
    更新角色
    """
    role = crud.get_role_by_id(session=session, role_id=role_id)
    if not role:
        raise HTTPException(
            status_code=404,
            detail="角色不存在",
        )

    if role_in.name:
        existing_role = crud.get_role_by_name(session=session, name=role_in.name)
        if existing_role and existing_role.id != role_id:
            raise HTTPException(
                status_code=409, detail="该角色名称已存在"
            )

    role = crud.update_role(session=session, db_role=role, role_in=role_in)
    
    # 返回正确格式的角色数据
    try:
        permissions = json.loads(role.permissions) if role.permissions else []
    except (json.JSONDecodeError, TypeError):
        permissions = []
    
    try:
        host_permissions = json.loads(role.host_permissions) if role.host_permissions else []
    except (json.JSONDecodeError, TypeError):
        host_permissions = []
    
    return RolePublic(
        id=str(role.id),
        name=role.name,
        description=role.description,
        permissions=permissions,
        host_permissions=host_permissions,
        created_at=role.created_at.isoformat(),
        updated_at=role.updated_at.isoformat()
    )


@router.delete("/{role_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_role(session: SessionDep, role_id: uuid.UUID) -> Message:
    """
    删除角色
    """
    role = crud.get_role_by_id(session=session, role_id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    # 检查是否有用户使用该角色
    users_with_role = session.exec(select(User).where(User.role_id == role_id)).all()
    if users_with_role:
        raise HTTPException(
            status_code=400,
            detail="无法删除角色，仍有用户使用该角色",
        )

    crud.delete_role(session=session, db_role=role)
    return Message(message="角色删除成功")
