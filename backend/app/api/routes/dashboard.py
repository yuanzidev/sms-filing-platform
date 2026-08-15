"""Dashboard API routes — statistics, trends, and distributions."""
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import SQLModel

from app.api.deps import SessionDep
from app.crud.dashboard import (
    get_carrier_distribution,
    get_expiring_authorizations,
    get_recent_changes,
    get_stats,
    get_status_distribution,
    get_trends,
)
from app.models import FilingTaskPublic, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStatsPublic(SQLModel):
    total_records: int
    new_this_month: int
    updated_this_month: int
    incomplete: int
    expiring_soon: int
    main_port_count: int
    sub_port_count: int


@router.get("/stats", response_model=DashboardStatsPublic)
def dashboard_stats(session: SessionDep) -> Any:
    return get_stats(session)


@router.get("/trends")
def dashboard_trends(session: SessionDep, days: int = Query(30, ge=1, le=365)) -> Any:
    return get_trends(session, days=days)


@router.get("/carrier-dist")
def dashboard_carrier_dist(session: SessionDep) -> Any:
    return get_carrier_distribution(session)


@router.get("/status-dist")
def dashboard_status_dist(session: SessionDep) -> Any:
    return get_status_distribution(session)


@router.get("/recent-changes")
def dashboard_recent_changes(session: SessionDep, limit: int = Query(10, ge=1, le=50)) -> Any:
    tasks = get_recent_changes(session, limit=limit)
    result = []
    for t in tasks:
        operator_name = ""
        if t.operator_id:
            user = session.get(User, t.operator_id)
            if user:
                operator_name = user.full_name or user.username
        export_group_name = t.export_group_name or ""
        result.append(
            FilingTaskPublic(
                id=t.id,
                task_name=t.task_name,
                qualification_count=t.qualification_count,
                port_count=t.port_count,
                export_group_name=export_group_name,
                group_by_field=t.group_by_field,
                file_size=t.file_size,
                operator_name=operator_name,
                created_at=t.created_at,
            )
        )
    return result


@router.get("/expiring-auths")
def dashboard_expiring_auths(session: SessionDep, days: int = Query(30, ge=1, le=180)) -> Any:
    return get_expiring_authorizations(session, days=days)
