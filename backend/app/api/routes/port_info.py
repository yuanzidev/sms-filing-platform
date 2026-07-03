"""Port info management routes."""
import io
import uuid
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook

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
    PortInfo,
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


@router.post("/import")
def import_port_infos(
    *, session: SessionDep, file: UploadFile = File(...)
) -> Any:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")

    try:
        wb = load_workbook(io.BytesIO(file.file.read()), read_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件，请检查文件格式")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 1:
        raise HTTPException(status_code=400, detail="文件为空，请导入有效的 Excel 文件")

    header_to_field = {
        "运营商": "carrier",
        "操作类型": "operation_type",
        "主端口号": "main_port_number",
        "子端口号": "sub_port_number",
        "码号使用范围": "port_range",
        "接入省": "province",
        "接入地市": "city",
        "端口类型": "port_type",
        "端口入网时间": "port_activation_date",
        "是否允许自行扩展": "allow_self_extension",
        "业务属性": "business_attribute",
        "业务类型": "business_type",
        "业务细类": "business_subtype",
        "具体用途": "specific_usage",
        "短信签名": "sms_signature",
        "是否网关签名": "is_gateway_signature",
        "运营商接入机房及设备": "carrier_room",
        "企业接入机房及设备": "enterprise_room",
        "是否具有授权书": "has_authorization",
        "授权开始日期": "auth_start_date",
        "授权结束日期": "auth_end_date",
        "短信模板内容": "sms_template_content",
    }

    header_row = [str(c) if c else "" for c in rows[0]]
    col_map: dict[str, int] = {}
    for col_idx, h in enumerate(header_row):
        if h in header_to_field:
            col_map[header_to_field[h]] = col_idx

    objects: list[PortInfo] = []
    for row_idx, row in enumerate(rows[1:], start=2):
        if all(c is None or str(c).strip() == "" for c in row):
            continue

        def cell(col_name: str) -> str | None:
            if col_name not in col_map:
                return None
            idx = col_map[col_name]
            if idx >= len(row):
                return None
            v = row[idx]
            if v is None or str(v).strip() == "":
                return None
            return str(v).strip()

        def parse_bool(col_name: str) -> bool | None:
            v = cell(col_name)
            if v is None:
                return None
            return v in ("是", "true", "True", "1", "TRUE")

        def parse_date(col_name: str):
            if col_name not in col_map:
                return None
            idx = col_map[col_name]
            if idx >= len(row):
                return None
            v = row[idx]
            if v is None:
                return None
            from datetime import date, datetime
            if isinstance(v, datetime):
                return v.date()
            if isinstance(v, date):
                return v
            s = str(v).strip()
            if not s:
                return None
            try:
                return date.fromisoformat(s)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"第{row_idx}行: 日期格式无效，请使用 YYYY-MM-DD 格式",
                )

        carrier = cell("carrier")
        if not carrier:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 运营商不能为空")

        objects.append(PortInfo(
            carrier=carrier,
            operation_type=cell("operation_type"),
            main_port_number=cell("main_port_number"),
            sub_port_number=cell("sub_port_number"),
            port_range=cell("port_range"),
            province=cell("province"),
            city=cell("city"),
            port_type=cell("port_type"),
            port_activation_date=parse_date("port_activation_date"),
            allow_self_extension=parse_bool("allow_self_extension"),
            business_attribute=cell("business_attribute"),
            business_type=cell("business_type"),
            business_subtype=cell("business_subtype"),
            specific_usage=cell("specific_usage"),
            sms_signature=cell("sms_signature"),
            is_gateway_signature=parse_bool("is_gateway_signature"),
            carrier_room=cell("carrier_room"),
            enterprise_room=cell("enterprise_room"),
            has_authorization=parse_bool("has_authorization"),
            auth_start_date=parse_date("auth_start_date"),
            auth_end_date=parse_date("auth_end_date"),
            sms_template_content=cell("sms_template_content"),
        ))

    if not objects:
        raise HTTPException(status_code=400, detail="文件中没有有效数据")

    session.add_all(objects)
    session.commit()
    return {"count": len(objects), "message": f"成功导入 {len(objects)} 条端口信息"}


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
