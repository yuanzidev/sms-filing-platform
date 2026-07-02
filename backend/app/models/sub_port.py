"""Sub port model — sub-port/code number management under main ports."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class SubPortBase(SQLModel):
    port_number: str = Field(max_length=100, index=True)
    carrier: str = Field(max_length=10)
    status: str = Field(default="空闲", max_length=20)


class SubPort(SubPortBase, table=True):
    __tablename__ = "sub_port"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    main_port_id: uuid.UUID = Field(foreign_key="main_port.id", index=True)
    filing_record_id: uuid.UUID | None = Field(default=None, foreign_key="filing_record.id", nullable=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    main_port: "MainPort" = Relationship()


class SubPortCreate(SQLModel):
    port_number: str = Field(max_length=100)
    main_port_id: uuid.UUID
    carrier: str = Field(max_length=10)
    status: str = Field(default="空闲", max_length=20)
    filing_record_id: uuid.UUID | None = None


class SubPortUpdate(SQLModel):
    port_number: str | None = None
    carrier: str | None = None
    status: str | None = None
    filing_record_id: uuid.UUID | None = None


class SubPortPublic(SubPortBase):
    id: uuid.UUID
    main_port_id: uuid.UUID
    main_port_number: str = ""
    filing_record_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class SubPortsPublic(SQLModel):
    data: list[SubPortPublic]
    total: int
    page: int
    page_size: int
