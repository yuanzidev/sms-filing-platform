"""Filing record model — joins port_info and qualification_info with status tracking."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow
from .port_info import PortInfo, PortInfoCreate, PortInfoPublic
from .qualification_info import QualificationInfo, QualificationInfoCreate, QualificationInfoPublic


class FilingRecordBase(SQLModel):
    record_number: str = Field(max_length=50, unique=True)
    status: str = Field(default="草稿", max_length=20, index=True)
    source_file: str | None = Field(default=None, max_length=500)
    import_batch: str | None = Field(default=None, max_length=100, index=True)


class FilingRecord(FilingRecordBase, table=True):
    __tablename__ = "filing_record"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    port_info_id: uuid.UUID = Field(foreign_key="port_info.id", index=True)
    qualification_info_id: uuid.UUID = Field(foreign_key="qualification_info.id", index=True)
    operator_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)

    # Relationships
    port_info: PortInfo = Relationship()
    qualification_info: QualificationInfo = Relationship()


class FilingRecordCreate(SQLModel):
    record_number: str = Field(max_length=50)
    status: str = Field(default="草稿", max_length=20)
    port_info: PortInfoCreate
    qualification_info: QualificationInfoCreate
    source_file: str | None = None
    import_batch: str | None = None


class FilingRecordUpdate(SQLModel):
    status: str | None = None


class FilingRecordPublic(FilingRecordBase):
    id: uuid.UUID
    port_info_id: uuid.UUID
    qualification_info_id: uuid.UUID
    operator_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    port_info: PortInfoPublic | None = None
    qualification_info: QualificationInfoPublic | None = None


class FilingRecordsPublic(SQLModel):
    data: list[FilingRecordPublic]
    total: int
    page: int
    page_size: int
