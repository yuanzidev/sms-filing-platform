"""Qualification info model — enterprise qualification attributes."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class QualificationInfoBase(SQLModel):
    # 企业信息
    enterprise_name: str = Field(max_length=200, index=True)
    cert_type: str | None = Field(default=None, max_length=50)
    cert_number: str | None = Field(default=None, max_length=100, index=True)
    app_platform_name: str | None = Field(default=None, max_length=200)

    # 法人
    legal_representative_name: str | None = Field(default=None, max_length=100)

    # 责任人
    responsible_name: str | None = Field(default=None, max_length=100)
    responsible_cert_type: str | None = Field(default=None, max_length=50)
    responsible_cert_number: str | None = Field(default=None, max_length=100)
    responsible_address: str | None = Field(default=None, max_length=500)
    responsible_phone: str | None = Field(default=None, max_length=20)

    # 经办人
    handler_name: str | None = Field(default=None, max_length=100)
    handler_cert_type: str | None = Field(default=None, max_length=50)
    handler_cert_number: str | None = Field(default=None, max_length=100)
    handler_address: str | None = Field(default=None, max_length=500)
    handler_phone: str | None = Field(default=None, max_length=20)

    # 签名与模板
    sms_signature: str | None = Field(default=None, max_length=200)
    signature_type: str | None = Field(default=None, max_length=100)
    signature_verified: bool | None = Field(default=None)
    is_gateway_signature: bool | None = Field(default=None)
    sms_template_content: str | None = Field(default=None)
    template_has_variable: bool | None = Field(default=None)
    template_param_type: str | None = Field(default=None, max_length=100)
    template_param_length: str | None = Field(default=None, max_length=100)

    # 业务信息
    business_attribute: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50, index=True)
    business_subtype: str | None = Field(default=None, max_length=50)
    specific_usage: str | None = Field(default=None)

    # 引流信息
    diversion_number: str | None = Field(default=None, max_length=100)
    diversion_number_type: str | None = Field(default=None, max_length=50)
    diversion_number_usage: str | None = Field(default=None, max_length=200)
    diversion_content: str | None = Field(default=None)
    link_address: str | None = Field(default=None, max_length=500)
    link_type: str | None = Field(default=None, max_length=50)

    # 签名（必填）
    signature: str = Field(max_length=200, index=True)


class QualificationInfo(QualificationInfoBase, table=True):
    __tablename__ = "qualification_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class QualificationInfoCreate(QualificationInfoBase):
    pass


class QualificationInfoUpdate(SQLModel):
    enterprise_name: str | None = None
    cert_type: str | None = None
    cert_number: str | None = None
    app_platform_name: str | None = None
    legal_representative_name: str | None = None
    responsible_name: str | None = None
    responsible_cert_type: str | None = None
    responsible_cert_number: str | None = None
    responsible_address: str | None = None
    responsible_phone: str | None = None
    handler_name: str | None = None
    handler_cert_type: str | None = None
    handler_cert_number: str | None = None
    handler_address: str | None = None
    handler_phone: str | None = None
    sms_signature: str | None = None
    signature_type: str | None = None
    signature_verified: bool | None = None
    is_gateway_signature: bool | None = None
    sms_template_content: str | None = None
    template_has_variable: bool | None = None
    template_param_type: str | None = None
    template_param_length: str | None = None
    business_attribute: str | None = None
    business_type: str | None = None
    business_subtype: str | None = None
    specific_usage: str | None = None
    diversion_number: str | None = None
    diversion_number_type: str | None = None
    diversion_number_usage: str | None = None
    diversion_content: str | None = None
    link_address: str | None = None
    link_type: str | None = None
    signature: str | None = None


class QualificationInfoPublic(QualificationInfoBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class QualificationInfosPublic(SQLModel):
    data: list[QualificationInfoPublic]
    total: int
    page: int
    page_size: int


class BatchSignatureRequest(SQLModel):
    signatures: list[str]


class BatchSignatureResponse(SQLModel):
    matched_qualifications: list[QualificationInfoPublic]
    unmatched_signatures: list[str]
