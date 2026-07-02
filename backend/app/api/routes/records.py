"""Filing records API routes."""
import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import SQLModel

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.crud.record import (
    create_filing_record,
    delete_filing_record,
    get_filing_record,
    list_filing_records,
    update_filing_record,
)
from app.crud.file_attachment import get_file_attachments_by_entity
from app.models import (
    FilingRecordCreate,
    FilingRecordPublic,
    FilingRecordsPublic,
    FilingRecordUpdate,
    Message,
    PortInfoPublic,
    QualificationInfoPublic,
)

router = APIRouter(prefix="/records", tags=["records"], dependencies=[Depends(get_current_active_superuser)])


def _record_to_public(db_obj, session) -> FilingRecordPublic:
    pi_data = PortInfoPublic.model_validate(db_obj.port_info).model_dump() if db_obj.port_info else None
    qi_data = QualificationInfoPublic.model_validate(db_obj.qualification_info).model_dump() if db_obj.qualification_info else None

    return FilingRecordPublic(
        id=db_obj.id,
        record_number=db_obj.record_number,
        status=db_obj.status,
        source_file=db_obj.source_file,
        import_batch=db_obj.import_batch,
        port_info_id=db_obj.port_info_id,
        qualification_info_id=db_obj.qualification_info_id,
        operator_id=db_obj.operator_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
        port_info=PortInfoPublic(**pi_data) if pi_data else None,
        qualification_info=QualificationInfoPublic(**qi_data) if qi_data else None,
    )


@router.get("", response_model=FilingRecordsPublic)
@router.get("/", include_in_schema=False, response_model=FilingRecordsPublic)
def read_records(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    carrier: str | None = None,
    status: str | None = None,
    enterprise_name: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
    keyword: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_filing_records(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, status=status, enterprise_name=enterprise_name,
        province=province, business_type=business_type, keyword=keyword,
    )
    data = [_record_to_public(r, session) for r in items]
    return FilingRecordsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("", response_model=FilingRecordPublic)
@router.post("/", include_in_schema=False, response_model=FilingRecordPublic)
def create_record(*, session: SessionDep, create: FilingRecordCreate, current_user: CurrentUser) -> Any:
    db_obj = create_filing_record(session=session, create=create, operator_id=current_user.id)
    session.refresh(db_obj)
    return _record_to_public(db_obj, session)


@router.get("/{id}", response_model=FilingRecordPublic)
def read_record(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    return _record_to_public(db_obj, session)


@router.patch("/{id}", response_model=FilingRecordPublic)
def update_record(*, session: SessionDep, id: uuid.UUID, update: FilingRecordUpdate) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    db_obj = update_filing_record(session=session, db_obj=db_obj, update=update)
    return _record_to_public(db_obj, session)


class ExportRequest(SQLModel):
    export_group_id: uuid.UUID
    carrier: str | None = None
    status: str | None = None
    enterprise_name: str | None = None
    province: str | None = None
    business_type: str | None = None


@router.post("/export")
def export_records(*, session: SessionDep, body: ExportRequest) -> Any:
    """Export filing records as Excel based on export group config."""
    from app.services.export import generate_export

    filters = {}
    if body.carrier:
        filters["carrier"] = body.carrier
    if body.status:
        filters["status"] = body.status
    if body.enterprise_name:
        filters["enterprise_name"] = body.enterprise_name
    if body.province:
        filters["province"] = body.province
    if body.business_type:
        filters["business_type"] = body.business_type

    output = generate_export(session, body.export_group_id, filters)

    from datetime import date
    filename = f"filing_records_{date.today().isoformat()}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{id}")
def delete_record(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    delete_filing_record(session=session, db_obj=db_obj)
    return Message(message="报备记录删除成功")
