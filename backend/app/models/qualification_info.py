"""Qualification info model — enterprise qualification attributes."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class QualificationInfoBase(SQLModel):
    submit_unit: str | None = Field(default=None, max_length=200)
    carrier_enterprise_id: str | None = Field(default=None, max_length=100)
    enterprise_name: str = Field(max_length=200, index=True)
    cert_type: str | None = Field(default=None, max_length=50)
    cert_number: str | None = Field(default=None, max_length=100, index=True)
    app_platform_name: str | None = Field(default=None, max_length=200)
    group_code: str | None = Field(default=None, max_length=100)
    responsible_name: str | None = Field(default=None, max_length=100)
    responsible_cert_type: str | None = Field(default=None, max_length=50)
    responsible_cert_number: str | None = Field(default=None, max_length=100)
    responsible_phone: str | None = Field(default=None, max_length=20)
    handler_name: str | None = Field(default=None, max_length=100)
    handler_cert_type: str | None = Field(default=None, max_length=50)
    handler_cert_number: str | None = Field(default=None, max_length=100)
    handler_phone: str | None = Field(default=None, max_length=20)
    signature: str = Field(max_length=200, index=True)


class QualificationInfo(QualificationInfoBase, table=True):
    __tablename__ = "qualification_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class QualificationInfoCreate(QualificationInfoBase):
    pass


class QualificationInfoUpdate(SQLModel):
    submit_unit: str | None = None
    carrier_enterprise_id: str | None = None
    enterprise_name: str | None = None
    cert_type: str | None = None
    cert_number: str | None = None
    app_platform_name: str | None = None
    group_code: str | None = None
    responsible_name: str | None = None
    responsible_cert_type: str | None = None
    responsible_cert_number: str | None = None
    responsible_phone: str | None = None
    handler_name: str | None = None
    handler_cert_type: str | None = None
    handler_cert_number: str | None = None
    handler_phone: str | None = None
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
