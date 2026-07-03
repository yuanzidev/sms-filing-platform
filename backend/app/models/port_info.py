"""Port info model — detailed port-level attributes linked to filing records."""
import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class PortInfoBase(SQLModel):
    carrier: str = Field(max_length=10, index=True)
    operation_type: str | None = Field(default=None, max_length=50)
    main_port_number: str | None = Field(default=None, max_length=100, index=True)
    sub_port_number: str | None = Field(default=None, max_length=100)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50, index=True)
    city: str | None = Field(default=None, max_length=50)
    port_type: str | None = Field(default=None, max_length=50)
    port_activation_date: date | None = Field(default=None)
    allow_self_extension: bool | None = Field(default=None)
    business_attribute: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50, index=True)
    business_subtype: str | None = Field(default=None, max_length=50)
    specific_usage: str | None = Field(default=None)
    sms_signature: str | None = Field(default=None, max_length=200)
    is_gateway_signature: bool | None = Field(default=None)
    carrier_room: str | None = Field(default=None)
    enterprise_room: str | None = Field(default=None)
    has_authorization: bool | None = Field(default=None)
    auth_start_date: date | None = Field(default=None)
    auth_end_date: date | None = Field(default=None)
    sms_template_content: str | None = Field(default=None)


class PortInfo(PortInfoBase, table=True):
    __tablename__ = "port_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PortInfoCreate(PortInfoBase):
    pass


class PortInfoUpdate(SQLModel):
    carrier: str | None = None
    operation_type: str | None = None
    main_port_number: str | None = None
    sub_port_number: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_type: str | None = None
    port_activation_date: date | None = None
    allow_self_extension: bool | None = None
    business_attribute: str | None = None
    business_type: str | None = None
    business_subtype: str | None = None
    specific_usage: str | None = None
    sms_signature: str | None = None
    is_gateway_signature: bool | None = None
    carrier_room: str | None = None
    enterprise_room: str | None = None
    has_authorization: bool | None = None
    auth_start_date: date | None = None
    auth_end_date: date | None = None
    sms_template_content: str | None = None


class PortInfoPublic(PortInfoBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortInfosPublic(SQLModel):
    data: list[PortInfoPublic]
    total: int
    page: int
    page_size: int
