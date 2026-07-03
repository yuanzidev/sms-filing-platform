"""Filing task model — records each Excel export operation."""
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class FilingTaskBase(SQLModel):
    task_name: str = Field(max_length=256)
    qualification_ids: list[str] = Field(sa_column=Column(JSON))
    port_ids: list[str] = Field(sa_column=Column(JSON))
    export_group_id: uuid.UUID = Field(foreign_key="export_group.id")
    group_by_field: str | None = Field(default=None, max_length=64)
    file_path: str | None = Field(default=None, max_length=512)
    file_size: int | None = Field(default=None)
    qualification_count: int
    port_count: int
    operator_id: uuid.UUID = Field(foreign_key="user.id")


class FilingTask(FilingTaskBase, table=True):
    __tablename__ = "filing_task"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)

    export_group: "ExportGroup" = Relationship()  # noqa: F821
    operator: "User" = Relationship()  # noqa: F821


class FilingTaskCreate(SQLModel):
    task_name: str | None = None  # auto-generated if not provided
    qualification_ids: list[uuid.UUID]
    port_count: int | None = None  # None means all ports
    export_group_id: uuid.UUID
    group_by_field: str | None = None


class FilingTaskPublic(SQLModel):
    id: uuid.UUID
    task_name: str
    qualification_count: int
    port_count: int
    export_group_name: str
    group_by_field: str | None
    file_size: int | None
    operator_name: str
    created_at: datetime


class FilingTaskDetail(FilingTaskPublic):
    qualification_ids: list[str]
    port_ids: list[str]
    file_path: str | None
    download_url: str | None


class FilingTasksPublic(SQLModel):
    data: list[FilingTaskPublic]
    total: int
    page: int
    page_size: int
