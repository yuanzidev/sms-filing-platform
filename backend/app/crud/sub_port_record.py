"""CRUD operations for SubPortRecord."""

import json
import uuid

from sqlalchemy import String, cast, or_
from sqlmodel import Session, func, select

from app.core.timezone import utcnow
from app.models import (
    SubPortRecord,
    SubPortRecordCreate,
    SubPortRecordUpdate,
)


def list_sub_port_records(
    *,
    session: Session,
    page: int = 1,
    page_size: int = 20,
    keyword: str | None = None,
    status: str | None = None,
    main_port_number: str | None = None,
    sub_port_number: str | None = None,
    ids: list[uuid.UUID] | None = None,
    skip_pagination: bool = False,
) -> tuple[list[SubPortRecord], int]:
    query = select(SubPortRecord)

    if keyword:
        escaped_keyword = json.dumps(keyword, ensure_ascii=True)[1:-1]
        field_value_conditions = [
            cast(SubPortRecord.field_values, String).contains(keyword)
        ]
        if escaped_keyword != keyword:
            field_value_conditions.append(
                cast(SubPortRecord.field_values, String).contains(
                    escaped_keyword.replace("\\", "\\\\")
                )
            )
        query = query.where(
            or_(
                SubPortRecord.main_port_number.contains(keyword),
                SubPortRecord.sub_port_number.contains(keyword),
                SubPortRecord.status.contains(keyword),
                *field_value_conditions,
            )
        )
    if status:
        query = query.where(SubPortRecord.status == status)
    if main_port_number:
        query = query.where(SubPortRecord.main_port_number == main_port_number)
    if sub_port_number:
        query = query.where(SubPortRecord.sub_port_number == sub_port_number)
    if ids:
        query = query.where(SubPortRecord.id.in_(ids))  # type: ignore[attr-defined]

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    statement = query.order_by(SubPortRecord.created_at.desc())
    if not skip_pagination:
        statement = statement.offset((page - 1) * page_size).limit(page_size)
    results = session.exec(statement).all()
    return list(results), count


def get_sub_port_record(*, session: Session, id: uuid.UUID) -> SubPortRecord | None:
    return session.get(SubPortRecord, id)


def get_by_main_and_sub(
    *, session: Session, main_port_number: str, sub_port_number: str
) -> SubPortRecord | None:
    statement = select(SubPortRecord).where(
        SubPortRecord.main_port_number == main_port_number,
        SubPortRecord.sub_port_number == sub_port_number,
    )
    return session.exec(statement).first()


def create_sub_port_record(
    *, session: Session, create: SubPortRecordCreate
) -> SubPortRecord:
    db_obj = SubPortRecord.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_sub_port_record(
    *, session: Session, db_obj: SubPortRecord, update: SubPortRecordUpdate
) -> SubPortRecord:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    db_obj.updated_at = utcnow()
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_sub_port_record(*, session: Session, db_obj: SubPortRecord) -> None:
    session.delete(db_obj)
    session.commit()


def delete_sub_port_records(*, session: Session, ids: list[uuid.UUID]) -> int:
    records = list(
        session.exec(
            select(SubPortRecord).where(SubPortRecord.id.in_(ids))  # type: ignore[attr-defined]
        ).all()
    )
    for record in records:
        session.delete(record)
    session.commit()
    return len(records)
