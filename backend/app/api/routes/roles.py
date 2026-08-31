"""
Author: yuanzi
Date: 2025-12-11
Description: 角色管理路由。列表/详情对所有登录用户开放（用户表单需要角色下拉），
写操作需要 role:write 权限，超级用户放行。
"""
import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import SessionDep, require_permission
from app.core.permissions import PERMISSION_CATALOG
from app.models import (
    Message,
    Role,
    RoleCreate,
    RolePublic,
    RolesPublic,
    RoleUpdate,
    User,
)

router = APIRouter(prefix="/roles", tags=["roles"])


def _role_to_public(role: Role, session: Any) -> RolePublic:
    """数据库角色转换为公开模型：解析权限 JSON 并统计关联用户数"""
    try:
        permissions = json.loads(role.permissions) if role.permissions else []
    except (json.JSONDecodeError, TypeError):
        permissions = []

    user_count = session.exec(
        select(func.count()).select_from(User).where(User.role_id == role.id)
    ).one()

    return RolePublic(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=permissions,
        user_count=int(user_count),
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


@router.get("/permissions/catalog")
def read_permission_catalog() -> Any:
    """
    获取权限点目录（供角色表单渲染）
    """
    return [
        {
            "module": group.module,
            "label": group.label,
            "permissions": [
                {"code": item.code, "label": item.label}
                for item in group.permissions
            ],
        }
        for group in PERMISSION_CATALOG
    ]


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

    return RolesPublic(
        data=[_role_to_public(role, session) for role in roles],
        count=count,
    )


@router.post(
    "",
    dependencies=[Depends(require_permission("role:write"))],
    response_model=RolePublic,
)
@router.post(
    "/",
    dependencies=[Depends(require_permission("role:write"))],
    response_model=RolePublic,
    include_in_schema=False,
)
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
    return _role_to_public(role, session)


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
    return _role_to_public(role, session)


@router.patch(
    "/{role_id}",
    dependencies=[Depends(require_permission("role:write"))],
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
    return _role_to_public(role, session)


@router.delete(
    "/{role_id}",
    dependencies=[Depends(require_permission("role:write"))],
)
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
