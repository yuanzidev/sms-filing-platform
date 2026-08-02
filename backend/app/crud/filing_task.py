"""CRUD operations for filing tasks."""
import uuid
from datetime import date, datetime

from sqlalchemy import or_
from sqlmodel import Session, func, select

from app.models.export_group import ExportGroup
from app.models.filing_task import FilingTask, FilingTaskCreate
from app.models.user import User


def _task_name_sequence(session: Session) -> int:
    """Generate next sequence number for BEI-YYYYMMDD-NNN format."""
    prefix = f"BEI-{date.today().strftime('%Y%m%d')}-"
    stmt = select(func.max(FilingTask.task_name)).where(
        FilingTask.task_name.like(f"{prefix}%")
    )
    last = session.exec(stmt).one()
    if last and last.startswith(prefix):
        return int(last[len(prefix) :]) + 1
    return 1


def create_filing_task(
    *, session: Session, create: FilingTaskCreate, operator_id: uuid.UUID
) -> FilingTask:
    task_name = create.task_name or f"BEI-{date.today().strftime('%Y%m%d')}-{_task_name_sequence(session):03d}"
    db_obj = FilingTask(
        task_name=task_name,
        qualification_ids=[str(qid) for qid in create.qualification_ids],
        port_ids=[],  # will be set by the route after random port selection
        export_group_id=create.export_group_id,
        group_by_field=create.group_by_field,
        file_path=None,
        file_size=None,
        qualification_count=len(create.qualification_ids),
        port_count=0,  # will be updated by the route
        operator_id=operator_id,
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_filing_task(*, session: Session, id: uuid.UUID) -> FilingTask | None:
    return session.get(FilingTask, id)


def list_filing_tasks(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    start_date: date | None = None,
    end_date: date | None = None,
    keyword: str | None = None,
) -> tuple[list[FilingTask], int]:
    query = (
        select(FilingTask)
        .join(User, FilingTask.operator_id == User.id)
        .join(ExportGroup, FilingTask.export_group_id == ExportGroup.id)
    )

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        query = query.where(FilingTask.created_at >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        query = query.where(FilingTask.created_at <= end_dt)
    if keyword:
        query = query.where(
            or_(
                FilingTask.task_name.contains(keyword),
                User.full_name.contains(keyword),
                User.username.contains(keyword),
                ExportGroup.name.contains(keyword),
            )
        )

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(FilingTask.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def delete_filing_task(*, session: Session, db_obj: FilingTask) -> None:
    session.delete(db_obj)
    session.commit()
