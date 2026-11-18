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
    sub_port_numbers: list[str] | None = None,
    sms_signatures: list[str] | None = None,
    is_four_category: str | None = None,
    carrier: str | None = None,
    resource_name: str | None = None,
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
        query = query.where(
            or_(
                SubPortRecord.sub_port_number == sub_port_number,
                SubPortRecord.main_port_number + SubPortRecord.sub_port_number
                == sub_port_number,
            )
        )
    if sub_port_numbers:
        query = query.where(SubPortRecord.sub_port_number.in_(sub_port_numbers))
    if sms_signatures:
        query = query.where(
            SubPortRecord.field_values["sms_signature"].as_string().in_(sms_signatures)
        )
    if is_four_category:
        four_category = SubPortRecord.field_values["is_four_category"].as_string()
        query = query.where(
            or_(four_category.is_(None), four_category == "")
            if is_four_category == "__empty__"
            else four_category == is_four_category
        )
    if resource_name:
        query = query.where(
            SubPortRecord.field_values["resource_name"].as_string().contains(resource_name)
        )
    if carrier:
        query = query.where(SubPortRecord.field_values["carrier"].as_string() == carrier)
    if ids:
        query = query.where(SubPortRecord.id.in_(ids))  # type: ignore[attr-defined]

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    statement = query.order_by(SubPortRecord.created_at.asc(), SubPortRecord.id.asc())
    if not skip_pagination:
        statement = statement.offset((page - 1) * page_size).limit(page_size)
    results = session.exec(statement).all()
    return list(results), count


def get_sub_port_record(*, session: Session, id: uuid.UUID) -> SubPortRecord | None:
    return session.get(SubPortRecord, id)


def list_sub_port_filter_options(*, session: Session, field: str) -> list[str]:
    column = (
        SubPortRecord.sub_port_number
        if field == "sub_port_number"
        else SubPortRecord.main_port_number
        if field == "main_port_number"
        else SubPortRecord.field_values["carrier"].as_string()
        if field == "carrier"
        else SubPortRecord.field_values["sms_signature"].as_string()
    )
    values = session.exec(select(column).distinct()).all()
    return sorted({value for value in values if value})


def get_main_port_names(*, session: Session, main_port_numbers: set[str]) -> dict[tuple[str, str], str]:
    if not main_port_numbers:
        return {}
    records = session.exec(
        select(SubPortRecord).where(SubPortRecord.main_port_number.in_(main_port_numbers))
    ).all()
    names: dict[tuple[str, str], str] = {}
    for record in records:
        carrier = record.field_values.get("carrier", "")
        name = record.field_values.get("resource_name", "")
        if carrier and name:
            names.setdefault((record.main_port_number, carrier), name)
    return names


def get_by_main_and_sub(
    *, session: Session, main_port_number: str, sub_port_number: str
) -> SubPortRecord | None:
    statement = select(SubPortRecord).where(
        SubPortRecord.main_port_number == main_port_number,
        SubPortRecord.sub_port_number == sub_port_number,
    )
    return session.exec(statement).first()


def list_records_by_sub_port(*, session: Session, sub_port_number: str) -> list[SubPortRecord]:
    return list(session.exec(select(SubPortRecord).where(SubPortRecord.sub_port_number == sub_port_number)).all())


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


def update_sub_port_record_statuses(
    *, session: Session, updates: list[tuple[SubPortRecord, str]]
) -> int:
    for record, status in updates:
        record.status = status
        record.updated_at = utcnow()
        session.add(record)
    session.commit()
    return len(updates)


def rename_main_port_records(
    *, session: Session, main_port_number: str, carrier: str, name: str
) -> int:
    statement = select(SubPortRecord).where(
        SubPortRecord.main_port_number == main_port_number,
        SubPortRecord.field_values["carrier"].as_string() == carrier,
    )
    records = session.exec(statement).all()
    for record in records:
        record.field_values = {**record.field_values, "resource_name": name}
        record.updated_at = utcnow()
        session.add(record)
    session.commit()
    return len(records)


def overwrite_sub_port_record(
    *, session: Session, db_obj: SubPortRecord, status: str, field_values: dict
) -> SubPortRecord:
    db_obj.status = status
    db_obj.field_values = field_values
    db_obj.updated_at = utcnow()
    session.add(db_obj)
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
