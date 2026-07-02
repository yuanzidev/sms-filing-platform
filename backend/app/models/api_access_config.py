"""API access config model — third-party API data integration configuration."""
import uuid
from datetime import datetime

from sqlalchemy import JSON
from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class ApiAccessConfigBase(SQLModel):
    name: str = Field(max_length=200)
    source_type: str | None = Field(default=None, max_length=50)
    endpoint: str | None = Field(default=None, max_length=500)
    auth_config: dict | None = Field(default=None, sa_type=JSON)
    field_mapping: dict | None = Field(default=None, sa_type=JSON)
    is_active: bool = Field(default=True)


class ApiAccessConfig(ApiAccessConfigBase, table=True):
    __tablename__ = "api_access_config"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ApiAccessConfigCreate(ApiAccessConfigBase):
    pass


class ApiAccessConfigUpdate(SQLModel):
    name: str | None = None
    source_type: str | None = None
    endpoint: str | None = None
    auth_config: dict | None = None
    field_mapping: dict | None = None
    is_active: bool | None = None


class ApiAccessConfigPublic(ApiAccessConfigBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ApiAccessConfigsPublic(SQLModel):
    data: list[ApiAccessConfigPublic]
    count: int
