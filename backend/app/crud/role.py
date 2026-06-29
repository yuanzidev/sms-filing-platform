"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import uuid
from typing import Any

from sqlmodel import Session, select

from app.models import Role, RoleCreate, RoleUpdate


def create_role(*, session: Session, role_create: RoleCreate) -> Role:
    """创建角色"""
    import json

    role_data = role_create.model_dump()
    # 将权限列表转换为JSON字符串
    if isinstance(role_data.get("permissions"), list):
        role_data["permissions"] = json.dumps(role_data["permissions"])
    if isinstance(role_data.get("host_permissions"), list):
        role_data["host_permissions"] = json.dumps(role_data["host_permissions"])

    db_obj = Role.model_validate(role_data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_role(*, session: Session, db_role: Role, role_in: RoleUpdate) -> Any:
    """更新角色"""
    import json

    role_data = role_in.model_dump(exclude_unset=True)
    # 将权限列表转换为JSON字符串
    if isinstance(role_data.get("permissions"), list):
        role_data["permissions"] = json.dumps(role_data["permissions"])
    if isinstance(role_data.get("host_permissions"), list):
        role_data["host_permissions"] = json.dumps(role_data["host_permissions"])

    db_role.sqlmodel_update(role_data)
    session.add(db_role)
    session.commit()
    session.refresh(db_role)
    return db_role


def get_role_by_name(*, session: Session, name: str) -> Role | None:
    """通过名称获取角色"""
    statement = select(Role).where(Role.name == name)
    session_role = session.exec(statement).first()
    return session_role
