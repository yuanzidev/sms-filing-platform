"""Dashboard API routes — statistics, trends, and distributions."""
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import SQLModel

from app.api.deps import SessionDep
from app.crud.dashboard import (
    get_stats,
    get_trends,
    get_carrier_distribution,
    get_status_distribution,
    get_recent_changes,
)
from app.services import record_to_public

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
    records = get_recent_changes(session, limit=limit)
    return [record_to_public(r) for r in records]
