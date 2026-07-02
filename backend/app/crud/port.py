"""CRUD operations for ports (main_port and sub_port)."""
import uuid

from sqlmodel import Session, func, select

from app.models import MainPort, MainPortCreate, MainPortUpdate, SubPort, SubPortCreate, SubPortUpdate


# ─── Main Port ───────────────────────────────────────────────

def create_main_port(*, session: Session, create: MainPortCreate) -> MainPort:
    db_obj = MainPort.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_main_port(*, session: Session, id: uuid.UUID) -> MainPort | None:
    return session.get(MainPort, id)


def list_main_ports(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    status: str | None = None,
    province: str | None = None,
) -> tuple[list[MainPort], int]:
    query = select(MainPort)
    if carrier:
        query = query.where(MainPort.carrier == carrier)
    if status:
        query = query.where(MainPort.status == status)
    if province:
        query = query.where(MainPort.province == province)

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(query.offset(skip).limit(limit).order_by(MainPort.created_at.desc())).all()
    return list(results), count


def update_main_port(*, session: Session, db_obj: MainPort, update: MainPortUpdate) -> MainPort:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_main_port(*, session: Session, db_obj: MainPort) -> None:
    session.delete(db_obj)
    session.commit()


# ─── Sub Port ────────────────────────────────────────────────

def create_sub_port(*, session: Session, create: SubPortCreate) -> SubPort:
    db_obj = SubPort.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_sub_port(*, session: Session, id: uuid.UUID) -> SubPort | None:
    return session.get(SubPort, id)


def list_sub_ports(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    main_port_id: uuid.UUID | None = None,
    carrier: str | None = None,
    status: str | None = None,
) -> tuple[list[SubPort], int]:
    query = select(SubPort)
    if main_port_id:
        query = query.where(SubPort.main_port_id == main_port_id)
    if carrier:
        query = query.where(SubPort.carrier == carrier)
    if status:
        query = query.where(SubPort.status == status)

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(query.offset(skip).limit(limit).order_by(SubPort.created_at.desc())).all()
    return list(results), count


def update_sub_port(*, session: Session, db_obj: SubPort, update: SubPortUpdate) -> SubPort:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_sub_port(*, session: Session, db_obj: SubPort) -> None:
    session.delete(db_obj)
    session.commit()
