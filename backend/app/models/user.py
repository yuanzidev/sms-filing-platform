"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow

from .role import Role, RolePublic
# 使用字符串引用避免循环导入
from .login_log import LoginLog


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class UserBase(SQLModel):
    """用户基础模型"""
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    username: str = Field(unique=True, index=True, max_length=100)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    status: UserStatus = Field(default=UserStatus.ACTIVE)
    last_login: datetime | None = Field(default=None)


class UserCreate(UserBase):
    """创建用户模型"""
    password: str = Field(min_length=8, max_length=40)
    role_id: uuid.UUID | None = Field(default=None)


class UserRegister(SQLModel):
    """用户注册模型"""
    email: EmailStr = Field(max_length=255)
    username: str = Field(max_length=100)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


class UserUpdate(UserBase):
    """更新用户模型"""
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    username: str | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=40)
    role_id: uuid.UUID | None = Field(default=None)


class UserUpdateMe(SQLModel):
    """用户更新个人信息模型"""
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    """更新密码模型"""
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


class ResetPassword(SQLModel):
    """重置密码模型"""
    new_password: str = Field(min_length=8, max_length=40)


class User(UserBase, table=True):
    """用户数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    role_id: uuid.UUID | None = Field(foreign_key="role.id", nullable=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    role: Role | None = Relationship(back_populates="users")
    login_logs: List["LoginLog"] = Relationship(back_populates="user")


class UserPublic(UserBase):
    """用户公开模型"""
    id: uuid.UUID
    role: RolePublic | None = None
    created_at: datetime
    updated_at: datetime


class UsersPublic(SQLModel):
    """用户列表响应模型"""
    data: list[UserPublic]
    count: int


class NewPassword(SQLModel):
    """新密码模型"""
    token: str
    new_password: str = Field(min_length=8, max_length=40)

