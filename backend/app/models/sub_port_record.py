"""子端口库记录模型。"""
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow

SUB_PORT_STATUSES = ("在线", "下线", "整改")


class SubPortRecord(SQLModel, table=True):
    __tablename__ = "sub_port_record"
    __table_args__ = (
        UniqueConstraint(
            "main_port_number", "sub_port_number", name="uq_sub_port_record_main_sub"
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    main_port_number: str = Field(max_length=100, index=True)
    sub_port_number: str = Field(max_length=100, index=True)
    status: str = Field(default="在线", max_length=20)
    field_values: dict = Field(
        default_factory=dict, sa_column=Column(JSON, nullable=False, default=dict)
    )
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SubPortRecordCreate(SQLModel):
    main_port_number: str = Field(min_length=1, max_length=100)
    sub_port_number: str = Field(min_length=1, max_length=100)
    status: str = Field(default="在线", max_length=20)
    field_values: dict = Field(default_factory=dict)


class SubPortRecordUpdate(SQLModel):
    main_port_number: str | None = Field(default=None, max_length=100)
    sub_port_number: str | None = Field(default=None, max_length=100)
    status: str | None = Field(default=None, max_length=20)
    field_values: dict | None = None


class SubPortRecordPublic(SQLModel):
    id: uuid.UUID
    main_port_number: str
    sub_port_number: str
    status: str
    field_values: dict
    created_at: datetime
    updated_at: datetime


class SubPortRecordsPublic(SQLModel):
    data: list[SubPortRecordPublic]
    total: int
    page: int
    page_size: int


class SubPortBatchDelete(SQLModel):
    ids: list[uuid.UUID]
