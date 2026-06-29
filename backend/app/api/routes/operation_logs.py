"""
Author: yuanzi
Date: 2025-12-27
Description: 操作日志API
"""
from datetime import datetime
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    OperationLog,
    OperationLogPublic,
    OperationLogsPublic,
    OperationResult,
)

router = APIRouter(prefix="/operation-logs", tags=["operation-logs"])


@router.get("", dependencies=[Depends(get_current_active_superuser)], response_model=OperationLogsPublic)
@router.get("/", dependencies=[Depends(get_current_active_superuser)], response_model=OperationLogsPublic, include_in_schema=False)
def read_operation_logs(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    username: str | None = None,
    module: str | None = None,
    result: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> Any:
    """
    获取操作日志列表
    """
    query = select(OperationLog)
    if username:
        query = query.where(OperationLog.username.contains(username))
    if module:
        query = query.where(OperationLog.module == module)
    if result:
        # 将查询参数转换为 OperationResult（容忍大小写）
        try:
            result_enum = OperationResult(result.lower())
            query = query.where(OperationLog.result == result_enum)
        except Exception:
            # 无效的 result 过滤值，返回空结果
            return OperationLogsPublic(data=[], count=0)
    if start_date:
        query = query.where(OperationLog.created_at >= start_date)
    if end_date:
        query = query.where(OperationLog.created_at <= end_date)

    query = query.order_by(OperationLog.created_at.desc())
    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    statement = query.offset(skip).limit(limit)
    logs = session.exec(statement).all()
    return OperationLogsPublic(data=logs, count=count)


@router.get("/{log_id}", dependencies=[Depends(get_current_active_superuser)], response_model=OperationLogPublic)
def read_operation_log_by_id(log_id: uuid.UUID, session: SessionDep) -> Any:
    """
    根据ID获取操作日志
    """
    log = session.get(OperationLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="操作日志不存在")
    return log
