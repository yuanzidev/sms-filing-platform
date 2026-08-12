"""CRUD operations for QualificationInfo."""
import uuid

from sqlmodel import Session, col, func, or_, select

from app.models import (
    QualificationInfo,
    QualificationInfoCreate,
    QualificationInfoUpdate,
)


def get_qualification(*, session: Session, id: uuid.UUID) -> QualificationInfo | None:
    return session.get(QualificationInfo, id)


def list_qualifications(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    enterprise_name: str | None = None,
    cert_number: str | None = None,
    identity_cert_number: str | None = None,
    sms_signature: str | None = None,
) -> tuple[list[QualificationInfo], int]:
    query = select(QualificationInfo)

    if enterprise_name:
        query = query.where(QualificationInfo.enterprise_name.contains(enterprise_name))
    if cert_number:
        query = query.where(QualificationInfo.cert_number.contains(cert_number))
    if identity_cert_number:
        query = query.where(
            or_(
                col(QualificationInfo.legal_representative_cert_number).contains(identity_cert_number),
                col(QualificationInfo.responsible_cert_number).contains(identity_cert_number),
                col(QualificationInfo.handler_cert_number).contains(identity_cert_number),
            )
        )
    if sms_signature:
        query = query.where(QualificationInfo.sms_signature.contains(sms_signature))

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(QualificationInfo.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def create_qualification(*, session: Session, create: QualificationInfoCreate) -> QualificationInfo:
    db_obj = QualificationInfo.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_qualification(
    *, session: Session, db_obj: QualificationInfo, update: QualificationInfoUpdate
) -> QualificationInfo:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_qualification(*, session: Session, db_obj: QualificationInfo) -> None:
    session.delete(db_obj)
    session.commit()


def get_qualifications_by_signatures(
    *, session: Session, signatures: list[str]
) -> tuple[list[QualificationInfo], list[str]]:
    unique_sigs = list(dict.fromkeys(signatures))  # 去重保序
    results = session.exec(
        select(QualificationInfo).where(QualificationInfo.sms_signature.in_(unique_sigs))
    ).all()
    matched_sigs = {r.sms_signature for r in results}
    unmatched = [s for s in unique_sigs if s not in matched_sigs]
    return list(results), unmatched
