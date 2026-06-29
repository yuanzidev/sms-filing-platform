"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    LoginLog,
    LoginLogPublic,
    LoginLogsPublic,
)

router = APIRouter(prefix="/login-logs", tags=["login-logs"])


@router.get("", dependencies=[Depends(get_current_active_superuser)], response_model=LoginLogsPublic)
@router.get("/", dependencies=[Depends(get_current_active_superuser)], response_model=LoginLogsPublic, include_in_schema=False)
def read_login_logs(
    session: SessionDep, 
    skip: int = 0, 
    limit: int = 100,
    username: str | None = None,
    status: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> Any:
    """
    获取登录日志列表
    """
    query = select(LoginLog)
    
    # 添加过滤条件
    if username:
        query = query.where(LoginLog.username.contains(username))
    if status:
        query = query.where(LoginLog.status == status)
    if start_date:
        query = query.where(LoginLog.login_time >= start_date)
    if end_date:
        query = query.where(LoginLog.login_time <= end_date)
    
    # 按时间倒序排列
    query = query.order_by(LoginLog.login_time.desc())
    
    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    statement = query.offset(skip).limit(limit)
    logs = session.exec(statement).all()

    return LoginLogsPublic(data=logs, count=count)


@router.get("/{log_id}", dependencies=[Depends(get_current_active_superuser)], response_model=LoginLogPublic)
def read_login_log_by_id(log_id: uuid.UUID, session: SessionDep) -> Any:
    """
    根据ID获取登录日志
    """
    log = session.get(LoginLog, log_id)
    if not log:
        raise HTTPException(
            status_code=404,
            detail="登录日志不存在",
        )
    return log


@router.delete("/{log_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_login_log(session: SessionDep, log_id: uuid.UUID) -> dict:
    """
    删除登录日志
    """
    log = session.get(LoginLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="登录日志不存在")

    session.delete(log)
    session.commit()
    return {"message": "登录日志删除成功"}


@router.delete("", dependencies=[Depends(get_current_active_superuser)])
@router.delete("/", dependencies=[Depends(get_current_active_superuser)], include_in_schema=False)
def clear_login_logs(
    session: SessionDep,
    before_date: datetime | None = None,
) -> dict:
    """
    清理登录日志
    """
    query = select(LoginLog)
    if before_date:
        query = query.where(LoginLog.login_time < before_date)
    
    logs_to_delete = session.exec(query).all()
    for log in logs_to_delete:
        session.delete(log)
    
    session.commit()
    return {"message": f"已删除 {len(logs_to_delete)} 条登录日志"} 
