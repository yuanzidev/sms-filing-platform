"""Export group model — user-defined field groups for Excel export."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class ExportGroupFieldBase(SQLModel):
    field_name: str = Field(max_length=100)
    field_label: str = Field(max_length=100)
    sort_order: int = Field(default=0)


class ExportGroupField(ExportGroupFieldBase, table=True):
    __tablename__ = "export_group_field"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    group_id: uuid.UUID = Field(foreign_key="export_group.id", index=True)


class ExportGroupFieldPublic(ExportGroupFieldBase):
    id: uuid.UUID
    group_id: uuid.UUID


class ExportGroupBase(SQLModel):
    name: str = Field(max_length=100)
    description: str | None = Field(default=None)


class ExportGroup(ExportGroupBase, table=True):
    __tablename__ = "export_group"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    fields: list[ExportGroupField] = Relationship(
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class ExportGroupFieldCreate(SQLModel):
    field_name: str
    field_label: str
    sort_order: int = 0


class ExportGroupCreate(ExportGroupBase):
    fields: list[ExportGroupFieldCreate] = []


class ExportGroupUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    fields: list[ExportGroupFieldCreate] | None = None


class ExportGroupPublic(ExportGroupBase):
    id: uuid.UUID
    fields: list[ExportGroupFieldPublic] = []
    created_at: datetime
    updated_at: datetime


class ExportGroupsPublic(SQLModel):
    data: list[ExportGroupPublic]
    count: int
