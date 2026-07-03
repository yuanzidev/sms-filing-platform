"""Port info management routes."""
import io
import uuid
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.port_info import (
    create_port_info,
    delete_port_info,
    get_port_info,
    list_port_infos,
    update_port_info,
)
from app.models import (
    Message,
    PortInfoCreate,
    PortInfoPublic,
    PortInfosPublic,
    PortInfoUpdate,
)

router = APIRouter(
    prefix="/port-info",
    tags=["port-info"],
    dependencies=[Depends(get_current_active_superuser)],
)

_PORT_INFO_HEADERS = [
    "运营商",
    "操作类型",
    "主端口号",
    "子端口号",
    "码号使用范围",
    "接入省",
    "接入地市",
    "端口类型",
    "端口入网时间",
    "是否允许自行扩展",
    "业务属性",
    "业务类型",
    "业务细类",
    "具体用途",
    "短信签名",
    "是否网关签名",
    "运营商接入机房及设备",
    "企业接入机房及设备",
    "是否具有授权书",
    "授权开始日期",
    "授权结束日期",
    "短信模板内容",
]


@router.get("/template")
def download_port_info_template() -> Any:
    wb = Workbook()
    ws = wb.active
    ws.title = "端口信息导入模板"
    for col_idx, header in enumerate(_PORT_INFO_HEADERS, 1):
        ws.cell(row=1, column=col_idx, value=header)
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    filename = "端口信息导入模板.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        },
    )


@router.get("", response_model=PortInfosPublic)
@router.get("/", include_in_schema=False, response_model=PortInfosPublic)
def read_port_infos(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    carrier: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_port_infos(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, province=province, business_type=business_type,
    )
    return PortInfosPublic(data=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=PortInfoPublic)
@router.post("/", include_in_schema=False, response_model=PortInfoPublic)
def create_port_info_endpoint(*, session: SessionDep, create: PortInfoCreate) -> Any:
    return create_port_info(session=session, create=create)


@router.get("/{id}", response_model=PortInfoPublic)
def read_port_info(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_port_info(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="端口信息不存在")
    return db_obj


@router.patch("/{id}", response_model=PortInfoPublic)
def update_port_info_endpoint(
    *, session: SessionDep, id: uuid.UUID, update: PortInfoUpdate
) -> Any:
    db_obj = get_port_info(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="端口信息不存在")
    return update_port_info(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}")
def delete_port_info_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_port_info(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="端口信息不存在")
    delete_port_info(session=session, db_obj=db_obj)
    return Message(message="端口信息删除成功")
