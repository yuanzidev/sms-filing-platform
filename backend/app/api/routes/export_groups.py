"""Export group API routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.export_group import (
    create_export_group,
    delete_export_group,
    get_export_group,
    list_export_groups,
    update_export_group,
)
from app.models import (
    ExportGroupCreate,
    ExportGroupPublic,
    ExportGroupsPublic,
    ExportGroupUpdate,
    Message,
)

router = APIRouter(prefix="/export-groups", tags=["export-groups"], dependencies=[Depends(get_current_active_superuser)])


@router.get("", response_model=ExportGroupsPublic)
@router.get("/", include_in_schema=False, response_model=ExportGroupsPublic)
def read_export_groups(session: SessionDep) -> Any:
    groups = list_export_groups(session=session)
    return ExportGroupsPublic(data=groups, count=len(groups))


@router.post("", response_model=ExportGroupPublic)
@router.post("/", include_in_schema=False, response_model=ExportGroupPublic)
def create_export_group_endpoint(*, session: SessionDep, create: ExportGroupCreate) -> Any:
    db_obj = create_export_group(session=session, create=create)
    return db_obj


@router.get("/{id}", response_model=ExportGroupPublic)
def read_export_group(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    return db_obj


@router.patch("/{id}", response_model=ExportGroupPublic)
def update_export_group_endpoint(*, session: SessionDep, id: uuid.UUID, update: ExportGroupUpdate) -> Any:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    db_obj = update_export_group(session=session, db_obj=db_obj, update=update)
    return db_obj


@router.delete("/{id}")
def delete_export_group_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    delete_export_group(session=session, db_obj=db_obj)
    return Message(message="导出分组删除成功")
