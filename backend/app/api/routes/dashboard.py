"""Dashboard API routes — statistics, trends, and distributions."""
from typing import Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.crud.dashboard import (
    get_stats,
    get_trends,
    get_carrier_distribution,
    get_status_distribution,
    get_recent_changes,
)
from app.models import FilingRecordPublic, PortInfoPublic, QualificationInfoPublic

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _record_to_public(db_obj) -> FilingRecordPublic:
    pi_data = PortInfoPublic.model_validate(db_obj.port_info).model_dump() if db_obj.port_info else None
    qi_data = QualificationInfoPublic.model_validate(db_obj.qualification_info).model_dump() if db_obj.qualification_info else None

    return FilingRecordPublic(
        id=db_obj.id,
        record_number=db_obj.record_number,
        status=db_obj.status,
        source_file=db_obj.source_file,
        import_batch=db_obj.import_batch,
        port_info_id=db_obj.port_info_id,
        qualification_info_id=db_obj.qualification_info_id,
        operator_id=db_obj.operator_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
        port_info=PortInfoPublic(**pi_data) if pi_data else None,
        qualification_info=QualificationInfoPublic(**qi_data) if qi_data else None,
    )


@router.get("/stats")
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
    return [_record_to_public(r) for r in records]
