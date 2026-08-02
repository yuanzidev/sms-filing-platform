"""CRUD for FilingSubPortUsage."""
import uuid

from sqlmodel import Session, func, select

from app.models import FilingSubPortUsage


def get_used_numbers(session: Session, main_port_number: str) -> set[str]:
    stmt = select(FilingSubPortUsage.port_number).where(
        FilingSubPortUsage.main_port_number == main_port_number
    )
    return set(session.exec(stmt).all())


def count_used_in_range(
    session: Session,
    main_port_number: str,
    range_start: int,
    range_end: int,
) -> int:
    width = len(str(range_end))
    start_str = str(range_start).zfill(width)
    end_str = str(range_end).zfill(width)
    stmt = select(func.count()).select_from(FilingSubPortUsage).where(
        FilingSubPortUsage.main_port_number == main_port_number,
        FilingSubPortUsage.port_number >= start_str,
        FilingSubPortUsage.port_number <= end_str,
    )
    return int(session.exec(stmt).one())


def bulk_create_usages(session: Session, records: list[dict]) -> None:
    objs = [FilingSubPortUsage(**r) for r in records]
    session.add_all(objs)
    session.flush()


def list_usages_by_task(
    session: Session, filing_task_id: uuid.UUID
) -> list[FilingSubPortUsage]:
    stmt = select(FilingSubPortUsage).where(
        FilingSubPortUsage.filing_task_id == filing_task_id
    )
    return list(session.exec(stmt).all())
