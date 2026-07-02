"""CRUD operations for export groups and fields."""
import uuid

from sqlmodel import Session, select

from app.models import (
    ExportGroup,
    ExportGroupCreate,
    ExportGroupField,
    ExportGroupFieldCreate,
    ExportGroupUpdate,
)


def create_export_group(*, session: Session, create: ExportGroupCreate) -> ExportGroup:
    db_obj = ExportGroup(name=create.name, description=create.description)
    session.add(db_obj)
    session.flush()

    for fc in create.fields:
        field = ExportGroupField(
            group_id=db_obj.id,
            field_name=fc.field_name,
            field_label=fc.field_label,
            sort_order=fc.sort_order,
        )
        session.add(field)

    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_export_group(*, session: Session, id: uuid.UUID) -> ExportGroup | None:
    return session.get(ExportGroup, id)


def list_export_groups(*, session: Session) -> list[ExportGroup]:
    return list(session.exec(select(ExportGroup).order_by(ExportGroup.created_at.desc())).all())


def update_export_group(
    *, session: Session, db_obj: ExportGroup, update: ExportGroupUpdate
) -> ExportGroup:
    data = update.model_dump(exclude_unset=True)
    fields_data = data.pop("fields", None)

    db_obj.sqlmodel_update(data)

    if fields_data is not None:
        # Delete existing fields and recreate
        for f in db_obj.fields:
            session.delete(f)
        for fc in fields_data:
            field = ExportGroupField(
                group_id=db_obj.id,
                field_name=fc["field_name"],
                field_label=fc["field_label"],
                sort_order=fc.get("sort_order", 0),
            )
            session.add(field)

    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_export_group(*, session: Session, db_obj: ExportGroup) -> None:
    session.delete(db_obj)
    session.commit()
