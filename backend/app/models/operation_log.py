"""
Author: yuanzi
Date: 2025-12-27
Description: 操作日志模型
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class OperationResult(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


class OperationLogBase(SQLModel):
    """操作日志基础模型"""
    username: str = Field(max_length=255, description="操作用户名")
    user_ip: str = Field(max_length=45, description="用户IP")
    module: str = Field(max_length=100, description="模块")
    action: str = Field(max_length=100, description="动作")
    target: str = Field(max_length=255, description="目标对象")
    result: OperationResult = Field(description="操作结果")
    detail: str | None = Field(default=None, max_length=2000, description="详情")


class OperationLog(OperationLogBase, table=True):
    """操作日志表"""
    __tablename__ = "operation_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow, description="创建时间")


class OperationLogPublic(OperationLogBase):
    id: uuid.UUID
    created_at: datetime


class OperationLogsPublic(SQLModel):
    data: list[OperationLogPublic]
    count: int

