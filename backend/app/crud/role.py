"""
Author: yuanzi
Date: 2025-12-11
Description:
"""
import json
import uuid

from sqlmodel import Session, select

from app.core.timezone import utcnow
from app.models import Role, RoleCreate, RoleUpdate


def _dump_permissions(value: object) -> str | None:
    """权限列表转 JSON 字符串，非列表原样返回"""
    if isinstance(value, list):
        return json.dumps(value)
    return None


def create_role(*, session: Session, role_create: RoleCreate) -> Role:
    """创建角色"""
    role_data = role_create.model_dump()
    permissions = _dump_permissions(role_data.get("permissions"))
    if permissions is not None:
        role_data["permissions"] = permissions

    db_obj = Role.model_validate(role_data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_role(*, session: Session, db_role: Role, role_in: RoleUpdate) -> Role:
    """更新角色"""
    role_data = role_in.model_dump(exclude_unset=True)
    permissions = _dump_permissions(role_data.get("permissions"))
    if permissions is not None:
        role_data["permissions"] = permissions

    db_role.sqlmodel_update(role_data)
    db_role.updated_at = utcnow()
    session.add(db_role)
    session.commit()
    session.refresh(db_role)
    return db_role


def get_role_by_name(*, session: Session, name: str) -> Role | None:
    """通过名称获取角色"""
    statement = select(Role).where(Role.name == name)
    session_role = session.exec(statement).first()
    return session_role


def get_role_by_id(*, session: Session, role_id: uuid.UUID) -> Role | None:
    """通过ID获取角色"""
    return session.get(Role, role_id)


def delete_role(*, session: Session, db_role: Role) -> None:
    """删除角色"""
    session.delete(db_role)
    session.commit()
