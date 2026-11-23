"""CRUD operations for QualificationInfo."""

import uuid
from datetime import datetime
from typing import Literal

from sqlmodel import Session, col, func, or_, select

from app.models import (
    QualificationInfo,
    QualificationInfoCreate,
    QualificationInfoUpdate,
    SignatureSeriesRule,
)


def matching_series(session: Session, signature: str | None) -> str | None:
    if not signature:
        return None
    rules = session.exec(select(SignatureSeriesRule)).all()
    matches = [rule for rule in rules if rule.pattern in signature]
    return max(matches, key=lambda rule: (len(rule.pattern), rule.pattern)).series_name if matches else None


def reclassify_qualifications(session: Session) -> None:
    rules = list(session.exec(select(SignatureSeriesRule)).all())
    for item in session.exec(select(QualificationInfo)).all():
        matches = [rule for rule in rules if item.sms_signature and rule.pattern in item.sms_signature]
        series = max(matches, key=lambda rule: (len(rule.pattern), rule.pattern)).series_name if matches else None
        if item.signature_series != series:
            item.signature_series = series
            session.add(item)


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
    sms_signature_mode: Literal["contains", "exact"] = "contains",
    diversion_info: str | None = None,
    library: Literal["primary", "backup"] = "primary",
    signature_series: str | None = None,
    business_type: str | None = None,
    business_attribute: str | None = None,
) -> tuple[list[QualificationInfo], int]:
    query = select(QualificationInfo).where(QualificationInfo.library == library, QualificationInfo.archived == False)  # noqa: E712

    if enterprise_name:
        query = query.where(QualificationInfo.enterprise_name.contains(enterprise_name))
    if signature_series:
        query = query.where(QualificationInfo.signature_series == signature_series)
    if business_type:
        query = query.where(QualificationInfo.business_type == business_type)
    if business_attribute:
        query = query.where(QualificationInfo.business_attribute == business_attribute)
    if cert_number:
        query = query.where(QualificationInfo.cert_number.contains(cert_number))
    if identity_cert_number:
        query = query.where(
            or_(
                col(QualificationInfo.legal_representative_cert_number).contains(
                    identity_cert_number
                ),
                col(QualificationInfo.responsible_cert_number).contains(
                    identity_cert_number
                ),
                col(QualificationInfo.handler_cert_number).contains(
                    identity_cert_number
                ),
            )
        )
    if sms_signature:
        query = query.where(
            QualificationInfo.sms_signature == sms_signature
            if sms_signature_mode == "exact"
            else QualificationInfo.sms_signature.contains(sms_signature)
        )
    if diversion_info:
        query = query.where(
            or_(
                QualificationInfo.diversion_number.contains(diversion_info),
                QualificationInfo.diversion_short_link.contains(diversion_info),
                QualificationInfo.diversion_long_link.contains(diversion_info),
                QualificationInfo.link_address.contains(diversion_info),
            )
        )

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(QualificationInfo.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def create_qualification(
    *, session: Session, create: QualificationInfoCreate
) -> QualificationInfo:
    db_obj = QualificationInfo.model_validate(create)
    db_obj.signature_series = matching_series(session, db_obj.sms_signature)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_qualification(
    *, session: Session, db_obj: QualificationInfo, update: QualificationInfoUpdate
) -> QualificationInfo:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    db_obj.signature_series = matching_series(session, db_obj.sms_signature)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_qualification(*, session: Session, db_obj: QualificationInfo) -> None:
    session.delete(db_obj)
    session.commit()


def get_qualifications_by_signatures(
    *,
    session: Session,
    signatures: list[str],
    imported_start: datetime | None = None,
    imported_end: datetime | None = None,
    library: Literal["primary", "backup"] = "primary",
    business_type: str | None = None,
    business_attribute: str | None = None,
) -> tuple[list[QualificationInfo], list[str]]:
    query = select(QualificationInfo).where(
        QualificationInfo.sms_signature.in_(signatures),
        QualificationInfo.library == library,
        QualificationInfo.archived == False,  # noqa: E712
    )
    if imported_start is not None:
        query = query.where(QualificationInfo.created_at >= imported_start)
    if imported_end is not None:
        query = query.where(QualificationInfo.created_at < imported_end)
    if business_type:
        query = query.where(QualificationInfo.business_type == business_type)
    if business_attribute:
        query = query.where(QualificationInfo.business_attribute == business_attribute)
    results = session.exec(query.order_by(QualificationInfo.created_at.desc())).all()
    results_by_signature: dict[str, list[QualificationInfo]] = {}
    for item in results:
        if item.sms_signature:
            results_by_signature.setdefault(item.sms_signature, []).append(item)
    ordered_results = [
        item
        for signature in dict.fromkeys(signatures)
        for item in results_by_signature.get(signature, [])
    ]
    matched_sigs = set(results_by_signature)
    unmatched = [s for s in signatures if s not in matched_sigs]
    return ordered_results, unmatched
