"""Port management API routes — main ports and sub ports."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.port import (
    create_main_port,
    create_sub_port,
    delete_main_port,
    delete_sub_port,
    get_main_port,
    get_sub_port,
    list_main_ports,
    list_sub_ports,
    update_main_port,
    update_sub_port,
)
from app.models import (
    MainPort,
    MainPortCreate,
    MainPortPublic,
    MainPortsPublic,
    MainPortUpdate,
    Message,
    SubPort,
    SubPortCreate,
    SubPortPublic,
    SubPortsPublic,
    SubPortUpdate,
)

router = APIRouter(prefix="/ports", tags=["ports"], dependencies=[Depends(get_current_active_superuser)])


def _main_port_to_public(db_obj: MainPort, session) -> MainPortPublic:
    sub_count = session.exec(
        select(func.count()).select_from(
            select(SubPort).where(SubPort.main_port_id == db_obj.id).subquery()
        )
    ).one()
    return MainPortPublic(
        id=db_obj.id,
        port_number=db_obj.port_number,
        carrier=db_obj.carrier,
        port_range=db_obj.port_range,
        province=db_obj.province,
        city=db_obj.city,
        port_type=db_obj.port_type,
        status=db_obj.status,
        sub_port_count=sub_count,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
    )


# ─── Main Ports ──────────────────────────────────────────────

@router.get("/main", response_model=MainPortsPublic)
def read_main_ports(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    carrier: str | None = None,
    status: str | None = None,
    province: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_main_ports(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, status=status, province=province,
    )
    data = [_main_port_to_public(mp, session) for mp in items]
    return MainPortsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("/main", response_model=MainPortPublic)
def create_main_port_endpoint(*, session: SessionDep, create: MainPortCreate) -> Any:
    db_obj = create_main_port(session=session, create=create)
    return _main_port_to_public(db_obj, session)


@router.get("/main/{id}", response_model=MainPortPublic)
def read_main_port(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    return _main_port_to_public(db_obj, session)


@router.patch("/main/{id}", response_model=MainPortPublic)
def update_main_port_endpoint(*, session: SessionDep, id: uuid.UUID, update: MainPortUpdate) -> Any:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    db_obj = update_main_port(session=session, db_obj=db_obj, update=update)
    return _main_port_to_public(db_obj, session)


@router.delete("/main/{id}")
def delete_main_port_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    delete_main_port(session=session, db_obj=db_obj)
    return Message(message="主端口删除成功")


# ─── Sub Ports ───────────────────────────────────────────────

def _sub_port_to_public(db_obj: SubPort, session) -> SubPortPublic:
    main_port = session.get(MainPort, db_obj.main_port_id)
    return SubPortPublic(
        id=db_obj.id,
        port_number=db_obj.port_number,
        main_port_id=db_obj.main_port_id,
        main_port_number=main_port.port_number if main_port else "",
        carrier=db_obj.carrier,
        status=db_obj.status,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
    )


@router.get("/sub", response_model=SubPortsPublic)
def read_sub_ports(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    main_port_id: uuid.UUID | None = None,
    carrier: str | None = None,
    status: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_sub_ports(
        session=session, skip=skip, limit=page_size,
        main_port_id=main_port_id, carrier=carrier, status=status,
    )
    data = [_sub_port_to_public(sp, session) for sp in items]
    return SubPortsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("/sub", response_model=SubPortPublic)
def create_sub_port_endpoint(*, session: SessionDep, create: SubPortCreate) -> Any:
    db_obj = create_sub_port(session=session, create=create)
    return _sub_port_to_public(db_obj, session)


@router.get("/sub/{id}", response_model=SubPortPublic)
def read_sub_port(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    return _sub_port_to_public(db_obj, session)


@router.patch("/sub/{id}", response_model=SubPortPublic)
def update_sub_port_endpoint(*, session: SessionDep, id: uuid.UUID, update: SubPortUpdate) -> Any:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    db_obj = update_sub_port(session=session, db_obj=db_obj, update=update)
    return _sub_port_to_public(db_obj, session)


@router.delete("/sub/{id}")
def delete_sub_port_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    delete_sub_port(session=session, db_obj=db_obj)
    return Message(message="子端口删除成功")
