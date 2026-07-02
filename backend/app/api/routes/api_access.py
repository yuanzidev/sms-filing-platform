"""Third-party API access configuration routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.api_access import (
    create_api_access_config,
    delete_api_access_config,
    get_api_access_config,
    list_api_access_configs,
    update_api_access_config,
)
from app.models import (
    ApiAccessConfigCreate,
    ApiAccessConfigPublic,
    ApiAccessConfigsPublic,
    ApiAccessConfigUpdate,
    Message,
)

router = APIRouter(
    prefix="/api-access",
    tags=["api-access"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("", response_model=ApiAccessConfigsPublic)
@router.get("/", include_in_schema=False, response_model=ApiAccessConfigsPublic)
def read_api_access_configs(session: SessionDep) -> Any:
    configs = list_api_access_configs(session=session)
    return ApiAccessConfigsPublic(data=configs, count=len(configs))


@router.post("", response_model=ApiAccessConfigPublic)
@router.post("/", include_in_schema=False, response_model=ApiAccessConfigPublic)
def create_api_endpoint(*, session: SessionDep, create: ApiAccessConfigCreate) -> Any:
    return create_api_access_config(session=session, create=create)


@router.get("/{id}", response_model=ApiAccessConfigPublic)
def read_api_access_config(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    return db_obj


@router.patch("/{id}", response_model=ApiAccessConfigPublic)
def update_api_endpoint(*, session: SessionDep, id: uuid.UUID, update: ApiAccessConfigUpdate) -> Any:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    return update_api_access_config(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}")
def delete_api_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    delete_api_access_config(session=session, db_obj=db_obj)
    return Message(message="API接入配置删除成功")


@router.get("/{id}/data")
def read_api_access_data(
    *, session: SessionDep, id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Any:
    """Display API access data (placeholder — returns empty dataset for now)."""
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")

    return {
        "data": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
        "config": db_obj,
    }
