"""CRUD operations for filing records (port_info + qualification_info + filing_record)."""
import uuid
from datetime import date

from sqlmodel import Session, func, select

from app.models import (
    FilingRecord,
    FilingRecordCreate,
    FilingRecordUpdate,
    PortInfo,
    QualificationInfo,
)


def _record_number_sequence(session: Session) -> int:
    """Generate next record number for REC-YYYYMMDD-XXXX format."""
    prefix = date.today().strftime("REC-%Y%m%d-")
    stmt = select(func.max(FilingRecord.record_number)).where(
        FilingRecord.record_number.like(f"{prefix}%")
    )
    last = session.exec(stmt).one()
    if last and last.startswith(prefix):
        return int(last[len(prefix) :]) + 1
    return 1


def create_filing_record(
    *, session: Session, create: FilingRecordCreate, operator_id: uuid.UUID | None = None
) -> FilingRecord:
    # 1. Create port_info
    pi = PortInfo.model_validate(create.port_info)
    session.add(pi)
    session.flush()

    # 2. Create qualification_info
    qi = QualificationInfo.model_validate(create.qualification_info)
    session.add(qi)
    session.flush()

    # 3. Create filing_record
    if not create.record_number or create.record_number == "auto":
        seq = _record_number_sequence(session)
        record_number = f"REC-{date.today().strftime('%Y%m%d')}-{seq:04d}"
    else:
        record_number = create.record_number

    fr = FilingRecord(
        record_number=record_number,
        status=create.status,
        port_info_id=pi.id,
        qualification_info_id=qi.id,
        operator_id=operator_id,
        source_file=create.source_file,
        import_batch=create.import_batch,
    )
    session.add(fr)
    session.commit()
    session.refresh(fr)
    return fr


def get_filing_record(*, session: Session, id: uuid.UUID) -> FilingRecord | None:
    return session.get(FilingRecord, id)


def list_filing_records(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    status: str | None = None,
    enterprise_name: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
    keyword: str | None = None,
) -> tuple[list[FilingRecord], int]:
    query = select(FilingRecord).join(PortInfo).join(QualificationInfo)

    if carrier:
        query = query.where(PortInfo.carrier == carrier)
    if status:
        query = query.where(FilingRecord.status == status)
    if enterprise_name:
        query = query.where(QualificationInfo.enterprise_name.contains(enterprise_name))
    if province:
        query = query.where(PortInfo.province == province)
    if business_type:
        query = query.where(PortInfo.business_type == business_type)
    if keyword:
        query = query.where(
            (QualificationInfo.enterprise_name.contains(keyword))
            | (PortInfo.main_port_number.contains(keyword))
            | (FilingRecord.record_number.contains(keyword))
        )

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(FilingRecord.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def update_filing_record(
    *, session: Session, db_obj: FilingRecord, update: FilingRecordUpdate
) -> FilingRecord:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_filing_record(*, session: Session, db_obj: FilingRecord) -> None:
    """Delete filing record and its associated port_info and qualification_info."""
    pi = session.get(PortInfo, db_obj.port_info_id)
    qi = session.get(QualificationInfo, db_obj.qualification_info_id)
    session.delete(db_obj)
    if pi:
        session.delete(pi)
    if qi:
        session.delete(qi)
    session.commit()
