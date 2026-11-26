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
from app.services.qualification_compliance import auto_compliance_reason


def matching_series_names(
    session: Session, signature: str | None, rules: list[SignatureSeriesRule] | None = None
) -> list[str]:
    if not signature:
        return []
    if rules is None:
        rules = list(session.exec(select(SignatureSeriesRule)).all())
    matches = [rule for rule in rules if rule.pattern in signature]
    matches.sort(key=lambda rule: (-len(rule.pattern), rule.pattern))
    return list(dict.fromkeys(rule.series_name for rule in matches))


def reclassify_qualifications(session: Session) -> None:
    rules = list(session.exec(select(SignatureSeriesRule)).all())
    for item in session.exec(select(QualificationInfo)).all():
        names = matching_series_names(session, item.sms_signature, rules)
        if item.signature_series_names != names:
            item.signature_series_names = names
            item.signature_series = names[0] if names else None
            session.add(item)


def get_qualification(*, session: Session, id: uuid.UUID) -> QualificationInfo | None:
    item = session.get(QualificationInfo, id)
    return item if item and not item.archived else None


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
    qualification_level: Literal["P0", "P1", "P2"] | None = None,
    business_type: str | None = None,
    business_attribute: str | None = None,
) -> tuple[list[QualificationInfo], int]:
    query = select(QualificationInfo).where(QualificationInfo.library == library, QualificationInfo.archived == False)  # noqa: E712

    if enterprise_name:
        query = query.where(QualificationInfo.enterprise_name.contains(enterprise_name))
    if signature_series:
        query = query.where(col(QualificationInfo.signature_series_names).contains([signature_series]))
    if qualification_level:
        query = query.where(col(QualificationInfo.qualification_levels).contains([qualification_level]))
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
    if db_obj.library == "backup" and auto_compliance_reason(
        db_obj.sms_signature, db_obj.enterprise_name, db_obj.signature_type
    ):
        db_obj.library = "primary"
    db_obj.signature_series_names = matching_series_names(session, db_obj.sms_signature)
    db_obj.signature_series = db_obj.signature_series_names[0] if db_obj.signature_series_names else None
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_qualification(
    *, session: Session, db_obj: QualificationInfo, update: QualificationInfoUpdate
) -> QualificationInfo:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    if db_obj.library == "backup" and auto_compliance_reason(
        db_obj.sms_signature, db_obj.enterprise_name, db_obj.signature_type
    ):
        db_obj.library = "primary"
    db_obj.signature_series_names = matching_series_names(session, db_obj.sms_signature)
    db_obj.signature_series = db_obj.signature_series_names[0] if db_obj.signature_series_names else None
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_qualification(*, session: Session, db_obj: QualificationInfo) -> None:
    # 保留历史报备与子端口占用的外键引用，列表及详情不再展示该资质。
    db_obj.archived = True
    session.add(db_obj)
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
