"""Qualification info management routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.qualification import (
    create_qualification,
    delete_qualification,
    get_qualification,
    list_qualifications,
    update_qualification,
)
from app.models import (
    Message,
    QualificationInfoCreate,
    QualificationInfoPublic,
    QualificationInfosPublic,
    QualificationInfoUpdate,
)

router = APIRouter(
    prefix="/qualifications",
    tags=["qualifications"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("", response_model=QualificationInfosPublic)
@router.get("/", include_in_schema=False, response_model=QualificationInfosPublic)
def read_qualifications(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    enterprise_name: str | None = None,
    cert_number: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_qualifications(
        session=session, skip=skip, limit=page_size,
        enterprise_name=enterprise_name, cert_number=cert_number,
    )
    return QualificationInfosPublic(data=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=QualificationInfoPublic)
@router.post("/", include_in_schema=False, response_model=QualificationInfoPublic)
def create_qualification_endpoint(*, session: SessionDep, create: QualificationInfoCreate) -> Any:
    return create_qualification(session=session, create=create)


@router.get("/{id}", response_model=QualificationInfoPublic)
def read_qualification(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_qualification(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="资质信息不存在")
    return db_obj


@router.patch("/{id}", response_model=QualificationInfoPublic)
def update_qualification_endpoint(
    *, session: SessionDep, id: uuid.UUID, update: QualificationInfoUpdate
) -> Any:
    db_obj = get_qualification(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="资质信息不存在")
    return update_qualification(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}")
def delete_qualification_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_qualification(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="资质信息不存在")
    delete_qualification(session=session, db_obj=db_obj)
    return Message(message="资质信息删除成功")
