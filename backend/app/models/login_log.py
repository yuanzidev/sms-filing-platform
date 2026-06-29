"""
Author: yuanzi
Date: 2025-12-11
Description: 登录日志表模型
"""
import uuid
from datetime import datetime, timezone
from typing import List, Union

from sqlmodel import Field, Relationship, SQLModel

# 使用字符串引用避免循环导入


class LoginLogBase(SQLModel):
    """登录日志基础模型"""
    username: str = Field(max_length=255)
    status: str = Field(max_length=50)  # success, failed
    ip_address: str = Field(max_length=45)
    user_agent: str | None = Field(default=None, max_length=1000)


def utcnow() -> datetime:
    # Return timezone-aware UTC now
    return datetime.now(timezone.utc)


class LoginLog(LoginLogBase, table=True):
    """登录日志数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    login_time: datetime = Field(default_factory=utcnow)
    user_id: uuid.UUID | None = Field(foreign_key="user.id", nullable=True)
    user: Union["User", None] = Relationship(back_populates="login_logs")


class LoginLogPublic(LoginLogBase):
    """登录日志公开模型"""
    id: uuid.UUID
    login_time: datetime


class LoginLogsPublic(SQLModel):
    """登录日志列表响应模型"""
    data: List[LoginLogPublic]
    count: int 
