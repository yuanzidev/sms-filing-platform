"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import uuid
from datetime import datetime, timezone
from typing import List

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class RoleBase(SQLModel):
    """角色基础模型"""
    name: str = Field(unique=True, index=True, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: str = Field(default="[]")  # 功能权限列表，存储为JSON字符串
    host_permissions: str = Field(default="[]")  # 主机权限列表，存储为JSON字符串


class RoleCreate(SQLModel):
    """创建角色模型"""
    name: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: List[str] = Field(default_factory=list)  # 接受列表类型
    host_permissions: List[str] = Field(default_factory=list)  # 接受列表类型


class RoleUpdate(SQLModel):
    """更新角色模型"""
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: List[str] | None = Field(default=None)  # 接受列表类型
    host_permissions: List[str] | None = Field(default=None)  # 接受列表类型


class Role(RoleBase, table=True):
    """角色数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    users: List["User"] = Relationship(back_populates="role")


class RolePublic(RoleBase):
    """角色公开模型"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class RolesPublic(SQLModel):
    """角色列表响应模型"""
    data: List[RolePublic]
    count: int 