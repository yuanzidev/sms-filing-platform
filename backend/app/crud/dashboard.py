"""Dashboard CRUD — aggregate queries for statistics and charts."""
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlmodel import Session, func, select

from app.models import MainPort, PortInfo, SubPort
from app.models.filing_task import FilingTask


def get_stats(session: Session) -> dict[str, Any]:
    """Get dashboard overview statistics."""
    total = session.exec(select(func.count()).select_from(FilingTask)).one()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    new_this_month = session.exec(
        select(func.count()).select_from(FilingTask).where(
            FilingTask.created_at >= month_start
        )
    ).one()

    today = date.today()
    thirty_days = today + timedelta(days=30)
    expiring_soon = session.exec(
        select(func.count()).select_from(PortInfo).where(
            PortInfo.auth_end_date >= today,
            PortInfo.auth_end_date <= thirty_days,
        )
    ).one()

    main_port_count = session.exec(select(func.count()).select_from(MainPort)).one()
    sub_port_count = session.exec(select(func.count()).select_from(SubPort)).one()

    return {
        "total_records": total,
        "new_this_month": new_this_month,
        "updated_this_month": 0,
        "incomplete": 0,
        "expiring_soon": expiring_soon,
        "main_port_count": main_port_count,
        "sub_port_count": sub_port_count,
    }


def get_trends(session: Session, days: int = 30) -> list[dict[str, Any]]:
    """Get daily task creation trend for last N days."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(
            func.date(FilingTask.created_at).label("date"),
            func.count().label("count"),
        )
        .where(FilingTask.created_at >= start_date)
        .group_by(func.date(FilingTask.created_at))
        .order_by(func.date(FilingTask.created_at))
    )
    results = session.exec(stmt).all()

    trend_map = {str(r[0]): r[1] for r in results}
    filled = []
    for i in range(days):
        d = (date.today() - timedelta(days=days - 1 - i)).isoformat()
        filled.append({"date": d, "count": trend_map.get(d, 0)})

    return filled


def get_carrier_distribution(session: Session) -> list[dict[str, Any]]:
    """Get port count distribution by carrier from PortInfo."""
    stmt = (
        select(PortInfo.carrier, func.count().label("count"))
        .group_by(PortInfo.carrier)
        .order_by(func.count().desc())
    )
    return [{"carrier": str(r[0]), "count": r[1]} for r in session.exec(stmt).all()]


def get_status_distribution(session: Session) -> list[dict[str, Any]]:  # noqa: ARG001
    """FilingTask has no status field. Return empty list as placeholder."""
    return []


def get_expiring_authorizations(session: Session, days: int = 30) -> list[dict[str, Any]]:
    """Get port_info records with auth_end_date expiring within N days."""
    today = date.today()
    cutoff = today + timedelta(days=days)
    stmt = (
        select(PortInfo)
        .where(
            PortInfo.auth_end_date >= today,
            PortInfo.auth_end_date <= cutoff,
        )
        .order_by(PortInfo.auth_end_date.asc())
        .limit(20)
    )
    results = session.exec(stmt).all()
    return [
        {
            "id": str(r.id),
            "carrier": r.carrier,
            "main_port_number": r.main_port_number,
            "sub_port_number": r.sub_port_number,
            "province": r.province,
            "enterprise_name": "",
            "auth_end_date": r.auth_end_date.isoformat() if r.auth_end_date else None,
        }
        for r in results
    ]


def get_recent_changes(session: Session, limit: int = 10) -> list[FilingTask]:
    """Get most recent filing tasks."""
    stmt = (
        select(FilingTask)
        .order_by(FilingTask.created_at.desc())
        .limit(limit)
    )
    return list(session.exec(stmt).all())
