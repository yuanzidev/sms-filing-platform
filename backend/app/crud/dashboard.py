"""Dashboard CRUD — aggregate queries for statistics and charts."""
from datetime import date, datetime, timezone, timedelta
from typing import Any

from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select

from app.models import FilingRecord, PortInfo, MainPort, SubPort


def get_stats(session: Session) -> dict[str, Any]:
    """Get dashboard overview statistics."""
    total = session.exec(select(func.count()).select_from(FilingRecord)).one()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    new_this_month = session.exec(
        select(func.count()).select_from(FilingRecord).where(
            FilingRecord.created_at >= month_start
        )
    ).one()

    updated_this_month = session.exec(
        select(func.count()).select_from(FilingRecord).where(
            FilingRecord.updated_at >= month_start,
            FilingRecord.created_at < month_start,
        )
    ).one()

    expiring_soon = session.exec(
        select(func.count()).select_from(FilingRecord).join(PortInfo).where(
            PortInfo.auth_end_date <= date.today() + timedelta(days=30),
            PortInfo.auth_end_date >= date.today(),
        )
    ).one()

    main_port_count = session.exec(select(func.count()).select_from(MainPort)).one()
    sub_port_count = session.exec(select(func.count()).select_from(SubPort)).one()

    incomplete = session.exec(
        select(func.count()).select_from(FilingRecord).where(
            FilingRecord.status != "已报备"
        )
    ).one()

    return {
        "total_records": total,
        "new_this_month": new_this_month,
        "updated_this_month": updated_this_month,
        "incomplete": incomplete,
        "expiring_soon": expiring_soon,
        "main_port_count": main_port_count,
        "sub_port_count": sub_port_count,
    }


def get_trends(session: Session, days: int = 30) -> list[dict[str, Any]]:
    """Get daily record creation trend for last N days."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Use date_trunc for daily grouping
    stmt = (
        select(
            func.date(FilingRecord.created_at).label("date"),
            func.count().label("count"),
        )
        .where(FilingRecord.created_at >= start_date)
        .group_by(func.date(FilingRecord.created_at))
        .order_by(func.date(FilingRecord.created_at))
    )
    results = session.exec(stmt).all()

    # Fill in missing dates with zero
    trend_map = {str(r[0]): r[1] for r in results}
    filled = []
    for i in range(days):
        d = (date.today() - timedelta(days=days - 1 - i)).isoformat()
        filled.append({"date": d, "count": trend_map.get(d, 0)})

    return filled


def get_carrier_distribution(session: Session) -> list[dict[str, Any]]:
    """Get record count distribution by carrier."""
    stmt = (
        select(PortInfo.carrier, func.count())
        .join(FilingRecord, FilingRecord.port_info_id == PortInfo.id)
        .group_by(PortInfo.carrier)
    )
    results = session.exec(stmt).all()
    return [{"carrier": r[0] or "未知", "count": r[1]} for r in results]


def get_status_distribution(session: Session) -> list[dict[str, Any]]:
    """Get record count distribution by status."""
    stmt = (
        select(FilingRecord.status, func.count())
        .group_by(FilingRecord.status)
    )
    results = session.exec(stmt).all()
    return [{"status": r[0] or "未知", "count": r[1]} for r in results]


def get_recent_changes(session: Session, limit: int = 10) -> list[FilingRecord]:
    """Get most recently modified filing records."""
    stmt = (
        select(FilingRecord)
        .options(
            selectinload(FilingRecord.port_info),
            selectinload(FilingRecord.qualification_info),
        )
        .order_by(FilingRecord.updated_at.desc())
        .limit(limit)
    )
    return list(session.exec(stmt).all())
