"""Main port model — top-level port/code number management."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class MainPortBase(SQLModel):
    port_number: str = Field(max_length=100, index=True)
    carrier: str = Field(max_length=10, index=True)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50)
    city: str | None = Field(default=None, max_length=50)
    port_type: str | None = Field(default=None, max_length=50)
    status: str = Field(default="空闲", max_length=20)


class MainPort(MainPortBase, table=True):
    __tablename__ = "main_port"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class MainPortCreate(MainPortBase):
    pass


class MainPortUpdate(SQLModel):
    port_number: str | None = None
    carrier: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_type: str | None = None
    status: str | None = None


class MainPortPublic(MainPortBase):
    id: uuid.UUID
    sub_port_count: int = 0
    created_at: datetime
    updated_at: datetime


class MainPortsPublic(SQLModel):
    data: list[MainPortPublic]
    total: int
    page: int
    page_size: int
