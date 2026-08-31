"""
Author: yuanzi
Date: 2025-12-11
Description: 角色模型，permissions 以 JSON 字符串存储权限点列表（见 app.core.permissions）。
"""
import json
import uuid
from datetime import datetime
from typing import Any, List

from pydantic import field_validator
from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class RoleBase(SQLModel):
    """角色基础模型"""

    name: str = Field(unique=True, index=True, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: str = Field(default="[]")  # 权限点列表，存储为JSON字符串


class RoleCreate(SQLModel):
    """创建角色模型"""

    name: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: List[str] = Field(default_factory=list)


class RoleUpdate(SQLModel):
    """更新角色模型"""

    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permissions: List[str] | None = Field(default=None)


class Role(RoleBase, table=True):
    """角色数据库模型"""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    users: List["User"] = Relationship(back_populates="role")


class RolePublic(SQLModel):
    """角色公开模型"""

    id: uuid.UUID
    name: str
    description: str | None = None
    permissions: List[str] = Field(default_factory=list)
    user_count: int = 0
    created_at: datetime
    updated_at: datetime

    @field_validator("permissions", mode="before")
    @classmethod
    def _parse_permissions(cls, v: Any) -> Any:
        """兼容 ORM 传入的 JSON 字符串，直接序列化时解析为列表。"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v


class RolesPublic(SQLModel):
    """角色列表响应模型"""

    data: List[RolePublic]
    count: int
