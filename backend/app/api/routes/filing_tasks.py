"""Filing tasks API routes — export task management."""
import io
import random
import uuid
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.storage import get_storage
from app.crud.export_group import get_export_group
from app.crud.filing_task import (
    create_filing_task as crud_create_filing_task,
)
from app.crud.filing_task import (
    delete_filing_task,
    get_filing_task,
    list_filing_tasks,
)
from app.models import (
    ExportGroup,
    FilingTaskCreate,
    FilingTaskDetail,
    FilingTaskPublic,
    FilingTasksPublic,
    Message,
    PortInfo,
    QualificationInfo,
    User,
)

router = APIRouter(prefix="/filing-tasks", tags=["filing-tasks"])


def build_field_map() -> dict[str, str]:
    """Map logical field_name to the Chinese label used as column header."""
    return {
        "carrier": "运营商",
        "operation_type": "操作类型",
        "main_port_number": "主端口号",
        "sub_port_number": "子端口号",
        "port_range": "码号使用范围",
        "province": "接入省",
        "city": "接入地市",
        "port_type": "端口类型",
        "port_activation_date": "端口入网时间",
        "allow_self_extension": "是否允许自行扩展",
        "business_attribute": "业务属性",
        "business_type": "业务类型",
        "business_subtype": "业务细类",
        "specific_usage": "具体用途",
        "sms_signature": "短信签名",
        "is_gateway_signature": "是否网关签名",
        "carrier_room": "运营商接入机房及设备",
        "enterprise_room": "企业接入机房及设备",
        "has_authorization": "是否具有授权书",
        "auth_start_date": "授权开始日期",
        "auth_end_date": "授权结束日期",
        "sms_template_content": "短信模板内容",
        "submit_unit": "报送单位",
        "carrier_enterprise_id": "运营商企业ID",
        "enterprise_name": "企业名称",
        "cert_type": "单位证件类型",
        "cert_number": "单位证件号码",
        "app_platform_name": "APP/平台名称",
        "group_code": "集团编码",
        "responsible_name": "责任人姓名",
        "responsible_cert_type": "责任人证件类型",
        "responsible_cert_number": "责任人证件号码",
        "responsible_phone": "责任人手机号",
        "handler_name": "经办人姓名",
        "handler_cert_type": "经办人证件类型",
        "handler_cert_number": "经办人证件号码",
        "handler_phone": "经办人手机号",
    }


def get_field_value(qualification: QualificationInfo, port: PortInfo, field_name: str) -> str:
    """Get field value from port_info or qualification_info directly."""
    pi_fields = {
        "carrier", "operation_type", "main_port_number", "sub_port_number",
        "port_range", "province", "city", "port_type", "port_activation_date",
        "allow_self_extension", "business_attribute", "business_type",
        "business_subtype", "specific_usage", "sms_signature",
        "is_gateway_signature", "carrier_room", "enterprise_room",
        "has_authorization", "auth_start_date", "auth_end_date",
        "sms_template_content",
    }
    qi_fields = {
        "submit_unit", "carrier_enterprise_id", "enterprise_name", "cert_type",
        "cert_number", "app_platform_name", "group_code", "responsible_name",
        "responsible_cert_type", "responsible_cert_number", "responsible_phone",
        "handler_name", "handler_cert_type", "handler_cert_number", "handler_phone",
    }

    if field_name in pi_fields:
        value = getattr(port, field_name, "")
    elif field_name in qi_fields:
        value = getattr(qualification, field_name, "")
    else:
        return ""

    if value is None:
        return ""
    if isinstance(value, bool):
        return "是" if value else "否"
    if isinstance(value, date | datetime):
        return value.isoformat()
    return str(value)


def generate_excel(
    qualifications: list[QualificationInfo],
    ports: list[PortInfo],
    export_group: ExportGroup,
    group_by_field: str | None = None,
) -> io.BytesIO:
    """Generate Excel bytes from qualification+port Cartesian product."""
    field_map = build_field_map()
    wb = Workbook()
    ws = wb.active
    ws.title = "报备导出"

    # Header style
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    sorted_fields = sorted(export_group.fields, key=lambda f: f.sort_order)
    col_names = [f.field_name for f in sorted_fields if f.field_name in field_map]

    # Write headers
    for col_idx, field_name in enumerate(col_names, 1):
        cell = ws.cell(row=1, column=col_idx, value=field_map[field_name])
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Build rows: Cartesian product
    rows: list[tuple[QualificationInfo, PortInfo]] = [
        (q, p) for q in qualifications for p in ports
    ]

    # Sort by group_by_field if specified
    if group_by_field:
        rows.sort(key=lambda r: get_field_value(r[0], r[1], group_by_field))

    # Write data rows, inserting blank separator between groups
    row_idx = 2
    prev_group_value: str | None = None
    for q, p in rows:
        if group_by_field:
            current_value = get_field_value(q, p, group_by_field)
            if prev_group_value is not None and current_value != prev_group_value:
                # Insert blank separator row
                for col_idx in range(1, len(col_names) + 1):
                    cell = ws.cell(row=row_idx, column=col_idx, value="")
                    cell.border = thin_border
                row_idx += 1
            prev_group_value = current_value

        for col_idx, field_name in enumerate(col_names, 1):
            value = get_field_value(q, p, field_name)
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
        row_idx += 1

    # Auto-fit column widths
    for col_idx in range(1, len(col_names) + 1):
        max_width = 0
        for row in ws.iter_rows(min_col=col_idx, max_col=col_idx, values_only=True):
            for cell_value in row:
                if cell_value:
                    max_width = max(max_width, len(str(cell_value)))
        letter = ws.cell(row=1, column=col_idx).column_letter
        ws.column_dimensions[letter].width = min(max_width + 4, 50)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def _get_operator_name(session, operator_id: uuid.UUID) -> str:
    user = session.get(User, operator_id)
    return user.full_name or user.username if user else "未知"


def _get_export_group_name(session, export_group_id: uuid.UUID) -> str:
    group = session.get(ExportGroup, export_group_id)
    return group.name if group else "未知"


def _task_to_public(session, task) -> FilingTaskPublic:
    return FilingTaskPublic(
        id=task.id,
        task_name=task.task_name,
        qualification_count=task.qualification_count,
        port_count=task.port_count,
        export_group_name=_get_export_group_name(session, task.export_group_id),
        group_by_field=task.group_by_field,
        file_size=task.file_size,
        operator_name=_get_operator_name(session, task.operator_id),
        created_at=task.created_at,
    )


def _task_to_detail(session, task) -> FilingTaskDetail:
    public = _task_to_public(session, task)
    download_url = None
    if task.file_path:
        try:
            storage = get_storage()
            download_url = storage.get_url(task.file_path)
        except Exception:
            download_url = None

    return FilingTaskDetail(
        id=public.id,
        task_name=public.task_name,
        qualification_count=public.qualification_count,
        port_count=public.port_count,
        export_group_name=public.export_group_name,
        group_by_field=public.group_by_field,
        file_size=public.file_size,
        operator_name=public.operator_name,
        created_at=public.created_at,
        qualification_ids=task.qualification_ids,
        port_ids=task.port_ids,
        file_path=task.file_path,
        download_url=download_url,
    )


@router.get("", response_model=FilingTasksPublic)
@router.get("/", include_in_schema=False, response_model=FilingTasksPublic)
def read_tasks(
    session: SessionDep,
    _current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    start_date: date | None = None,
    end_date: date | None = None,
    keyword: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_filing_tasks(
        session=session, skip=skip, limit=page_size,
        start_date=start_date, end_date=end_date, keyword=keyword,
    )
    data = [_task_to_public(session, t) for t in items]
    return FilingTasksPublic(data=data, total=total, page=page, page_size=page_size)


@router.get("/{id}", response_model=FilingTaskDetail)
def read_task(*, session: SessionDep, id: uuid.UUID) -> Any:
    task = get_filing_task(session=session, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="报备任务不存在")
    return _task_to_detail(session, task)


@router.post("", response_model=FilingTaskDetail)
@router.post("/", include_in_schema=False, response_model=FilingTaskDetail)
def create_task(*, session: SessionDep, create: FilingTaskCreate, current_user: CurrentUser) -> Any:
    # 1. Validate export group exists
    export_group = get_export_group(session=session, id=create.export_group_id)
    if not export_group:
        raise HTTPException(status_code=404, detail="导出字段组不存在")

    # 2. Load qualifications by IDs
    if not create.qualification_ids:
        raise HTTPException(status_code=400, detail="至少选择一个资质")

    qual_id_strs = [str(qid) for qid in create.qualification_ids]

    qualifications = list(
        session.exec(
            select(QualificationInfo).where(QualificationInfo.id.in_(create.qualification_ids))  # type: ignore
        ).all()
    )
    if not qualifications:
        raise HTTPException(status_code=404, detail="未找到匹配的资质信息")

    # 3. Load ports randomly
    all_ports = list(session.exec(select(PortInfo)).all())
    if not all_ports:
        raise HTTPException(status_code=404, detail="端口信息为空，请先导入端口数据")

    shuffled = list(all_ports)
    random.shuffle(shuffled)
    port_count = create.port_count or len(shuffled)
    selected_ports = shuffled[:port_count]
    selected_port_ids = [p.id for p in selected_ports]

    # 4. Create task record first (so we have an ID)
    task = crud_create_filing_task(
        session=session, create=create, operator_id=current_user.id
    )

    # 5. Generate Excel
    try:
        excel_bytes = generate_excel(
            qualifications=qualifications,
            ports=selected_ports,
            export_group=export_group,
            group_by_field=create.group_by_field,
        )
    except Exception as e:
        delete_filing_task(session=session, db_obj=task)
        raise HTTPException(status_code=500, detail=f"生成Excel失败: {e}")

    file_data = excel_bytes.read()

    # 6. Upload to storage
    file_key = f"filing-exports/{task.id}.xlsx"
    try:
        storage = get_storage()
        storage.upload(key=file_key, data=file_data, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
        delete_filing_task(session=session, db_obj=task)
        raise HTTPException(status_code=500, detail=f"文件上传失败: {e}")

    # 7. Update task record with final values
    task.qualification_ids = qual_id_strs
    task.port_ids = [str(pid) for pid in selected_port_ids]
    task.port_count = len(selected_ports)
    task.qualification_count = len(qualifications)
    task.file_path = file_key
    task.file_size = len(file_data)
    session.add(task)
    session.commit()
    session.refresh(task)

    return _task_to_detail(session, task)


@router.delete("/{id}")
def delete_task(*, session: SessionDep, id: uuid.UUID) -> Message:
    task = get_filing_task(session=session, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="报备任务不存在")

    # Delete MinIO file if exists
    if task.file_path:
        try:
            storage = get_storage()
            storage.delete(task.file_path)
        except Exception:
            pass  # File may already be gone

    delete_filing_task(session=session, db_obj=task)
    return Message(message="报备任务删除成功")


@router.get("/{id}/download")
def download_task(*, session: SessionDep, id: uuid.UUID) -> Any:
    task = get_filing_task(session=session, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="报备任务不存在")
    if not task.file_path:
        raise HTTPException(status_code=404, detail="文件不存在")

    try:
        storage = get_storage()
        url = storage.get_url(task.file_path)
        return RedirectResponse(url=url, status_code=302)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取下载链接失败: {e}")
