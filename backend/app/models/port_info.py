"""Port info model — detailed port-level attributes linked to filing records."""
import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class PortInfoBase(SQLModel):
    carrier: str = Field(max_length=10, index=True)
    main_port_number: str = Field(max_length=100, index=True)
    enterprise_name: str = Field(max_length=200)
    group_code: str | None = Field(default=None, max_length=100)
    carrier_room: str | None = Field(default=None)
    enterprise_room: str | None = Field(default=None)
    port_type: str = Field(max_length=50)
    operation_type: str | None = Field(default=None, max_length=100)
    authorization_letter: str | None = Field(default=None, max_length=500)
    sub_port_number: str | None = Field(default=None, max_length=100)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50, index=True)
    city: str | None = Field(default=None, max_length=50)
    port_activation_date: date | None = Field(default=None)
    allow_self_extension: bool | None = Field(default=None)
    has_authorization: bool | None = Field(default=None)
    auth_start_date: date | None = Field(default=None)
    auth_end_date: date | None = Field(default=None)
    # 新增/迁移字段
    region: str | None = Field(default=None, max_length=200)
    other_room_description: str | None = Field(default=None)
    is_green_channel: bool | None = Field(default=None)
    blacklist_whitelist_type: str | None = Field(default=None, max_length=50)
    audit_form: str | None = Field(default=None, max_length=500)
    customer_type: str | None = Field(default=None, max_length=50)


class PortInfo(PortInfoBase, table=True):
    __tablename__ = "port_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PortInfoCreate(PortInfoBase):
    pass


class PortInfoUpdate(SQLModel):
    carrier: str | None = None
    main_port_number: str | None = None
    enterprise_name: str | None = None
    group_code: str | None = None
    carrier_room: str | None = None
    enterprise_room: str | None = None
    port_type: str | None = None
    operation_type: str | None = None
    authorization_letter: str | None = None
    sub_port_number: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_activation_date: date | None = None
    allow_self_extension: bool | None = None
    has_authorization: bool | None = None
    auth_start_date: date | None = None
    auth_end_date: date | None = None
    region: str | None = None
    other_room_description: str | None = None
    is_green_channel: bool | None = None
    blacklist_whitelist_type: str | None = None
    audit_form: str | None = None
    customer_type: str | None = None


class PortInfoPublic(PortInfoBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortInfosPublic(SQLModel):
    data: list[PortInfoPublic]
    total: int
    page: int
    page_size: int
