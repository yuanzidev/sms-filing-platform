"""Filing task model — records each Excel export operation."""
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, ForeignKey
from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class FilingTaskBase(SQLModel):
    task_name: str = Field(max_length=256)
    qualification_ids: list[str] = Field(sa_column=Column(JSON))
    port_ids: list[str] = Field(sa_column=Column(JSON))
    export_group_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(
            "export_group_id",
            ForeignKey("export_group.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    export_group_name: str | None = Field(default=None, max_length=100)
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
    port_ids: list[uuid.UUID]
    export_group_id: uuid.UUID
    group_by_field: str | None = None
    # 自动分配子端口号模式
    auto_allocate_sub_ports: bool = False
    sub_port_range_start: int | None = None
    sub_port_range_end: int | None = None
    allocation_mode: str | None = "random"
    fixed_suffix: str | None = None


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


class FilingTaskQualificationSummary(SQLModel):
    id: uuid.UUID
    enterprise_name: str
    sms_signature: str | None = None
    cert_number: str | None = None


class FilingTaskPortSummary(SQLModel):
    id: uuid.UUID
    carrier: str
    main_port_number: str
    sub_port_number: str | None = None
    enterprise_name: str
    port_type: str


class FilingTaskDetail(FilingTaskPublic):
    qualification_ids: list[str]
    port_ids: list[str]
    qualifications: list[FilingTaskQualificationSummary] = Field(default_factory=list)
    ports: list[FilingTaskPortSummary] = Field(default_factory=list)
    file_path: str | None
    download_url: str | None


class FilingTasksPublic(SQLModel):
    data: list[FilingTaskPublic]
    total: int
    page: int
    page_size: int
