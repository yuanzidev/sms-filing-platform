"""File attachment model — metadata for files/images stored in object storage."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class FileAttachmentBase(SQLModel):
    original_name: str = Field(max_length=500)
    stored_path: str = Field(max_length=1000)
    file_size: int = Field()
    mime_type: str = Field(max_length=100)
    md5_hash: str = Field(max_length=32, index=True)
    entity_type: str = Field(max_length=50, index=True)
    entity_id: uuid.UUID = Field(index=True)
    field_name: str | None = Field(default=None, max_length=100)


class FileAttachment(FileAttachmentBase, table=True):
    __tablename__ = "file_attachment"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    uploader_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)


class FileAttachmentCreate(SQLModel):
    original_name: str
    stored_path: str
    file_size: int
    mime_type: str
    md5_hash: str
    entity_type: str
    entity_id: uuid.UUID
    field_name: str | None = None


class FileAttachmentPublic(FileAttachmentBase):
    id: uuid.UUID
    uploader_id: uuid.UUID | None = None
    created_at: datetime


class FileAttachmentsPublic(SQLModel):
    data: list[FileAttachmentPublic]
    total: int
    page: int
    page_size: int
