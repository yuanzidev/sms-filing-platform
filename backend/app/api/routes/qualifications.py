"""Qualification info management routes."""
import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook

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
    QualificationInfo,
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

_QUALIFICATION_HEADERS = [
    "企业名称",
    "提交单位",
    "运营商企业ID",
    "单位证件类型",
    "单位证件号码",
    "APP/平台名称",
    "集团编码",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人手机号",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人手机号",
]


@router.get("/template")
def download_qualification_template() -> Any:
    wb = Workbook()
    ws = wb.active
    ws.title = "资质导入模板"
    for col_idx, header in enumerate(_QUALIFICATION_HEADERS, 1):
        ws.cell(row=1, column=col_idx, value=header)
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=资质导入模板.xlsx"},
    )


@router.post("/import")
def import_qualifications(
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

    # Map model field names to column index by matching Chinese headers
    header_to_field = {
        "企业名称": "enterprise_name",
        "提交单位": "submit_unit",
        "运营商企业ID": "carrier_enterprise_id",
        "单位证件类型": "cert_type",
        "单位证件号码": "cert_number",
        "APP/平台名称": "app_platform_name",
        "集团编码": "group_code",
        "责任人姓名": "responsible_name",
        "责任人证件类型": "responsible_cert_type",
        "责任人证件号码": "responsible_cert_number",
        "责任人手机号": "responsible_phone",
        "经办人姓名": "handler_name",
        "经办人证件类型": "handler_cert_type",
        "经办人证件号码": "handler_cert_number",
        "经办人手机号": "handler_phone",
    }

    header_row = [str(c) if c else "" for c in rows[0]]
    col_map: dict[str, int] = {}
    for col_idx, h in enumerate(header_row):
        if h in header_to_field:
            col_map[header_to_field[h]] = col_idx

    objects: list[QualificationInfo] = []
    for row_idx, row in enumerate(rows[1:], start=2):
        # Skip completely empty rows
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

        enterprise_name = cell("enterprise_name")
        if not enterprise_name:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 企业名称不能为空")

        objects.append(QualificationInfo(
            enterprise_name=enterprise_name,
            submit_unit=cell("submit_unit"),
            carrier_enterprise_id=cell("carrier_enterprise_id"),
            cert_type=cell("cert_type"),
            cert_number=cell("cert_number"),
            app_platform_name=cell("app_platform_name"),
            group_code=cell("group_code"),
            responsible_name=cell("responsible_name"),
            responsible_cert_type=cell("responsible_cert_type"),
            responsible_cert_number=cell("responsible_cert_number"),
            responsible_phone=cell("responsible_phone"),
            handler_name=cell("handler_name"),
            handler_cert_type=cell("handler_cert_type"),
            handler_cert_number=cell("handler_cert_number"),
            handler_phone=cell("handler_phone"),
        ))

    if not objects:
        raise HTTPException(status_code=400, detail="文件中没有有效数据")

    session.add_all(objects)
    session.commit()
    return {"count": len(objects), "message": f"成功导入 {len(objects)} 条资质信息"}


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
