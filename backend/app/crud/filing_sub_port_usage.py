"""CRUD for FilingSubPortUsage."""
import uuid

from sqlmodel import Session, func, select

from app.models import FilingSubPortUsage

# 子端口号统一固定 6 位补零格式，与分配器一致，保证按范围匹配时不遗漏。
WIDTH = 6


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
    start_str = str(range_start).zfill(WIDTH)
    end_str = str(range_end).zfill(WIDTH)
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


def delete_usages_by_task(
    session: Session, filing_task_id: uuid.UUID
) -> None:
    """删除某任务产生的占用记录（用于任务创建失败时释放号码，不 commit，由调用方一并提交）。"""
    for usage in list_usages_by_task(session, filing_task_id):
        session.delete(usage)
