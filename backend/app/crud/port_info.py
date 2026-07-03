"""CRUD operations for PortInfo."""
import uuid

from sqlmodel import Session, func, select

from app.models import (
    PortInfo,
    PortInfoCreate,
    PortInfoUpdate,
)


def get_port_info(*, session: Session, id: uuid.UUID) -> PortInfo | None:
    return session.get(PortInfo, id)


def list_port_infos(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
) -> tuple[list[PortInfo], int]:
    query = select(PortInfo)

    if carrier:
        query = query.where(PortInfo.carrier == carrier)
    if province:
        query = query.where(PortInfo.province == province)
    if business_type:
        query = query.where(PortInfo.business_type == business_type)

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(PortInfo.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def create_port_info(*, session: Session, create: PortInfoCreate) -> PortInfo:
    db_obj = PortInfo.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_port_info(
    *, session: Session, db_obj: PortInfo, update: PortInfoUpdate
) -> PortInfo:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_port_info(*, session: Session, db_obj: PortInfo) -> None:
    session.delete(db_obj)
    session.commit()
