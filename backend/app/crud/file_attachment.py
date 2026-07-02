"""CRUD operations for file attachments."""
import uuid

from sqlmodel import Session, select

from app.models import FileAttachment, FileAttachmentCreate


def create_file_attachment(
    *, session: Session, create: FileAttachmentCreate, uploader_id: uuid.UUID | None = None
) -> FileAttachment:
    db_obj = FileAttachment.model_validate(create, update={"uploader_id": uploader_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_file_attachment(*, session: Session, id: uuid.UUID) -> FileAttachment | None:
    return session.get(FileAttachment, id)


def get_file_attachments_by_entity(
    *, session: Session, entity_type: str, entity_id: uuid.UUID
) -> list[FileAttachment]:
    statement = (
        select(FileAttachment)
        .where(FileAttachment.entity_type == entity_type)
        .where(FileAttachment.entity_id == entity_id)
    )
    return list(session.exec(statement).all())


def delete_file_attachment(*, session: Session, db_obj: FileAttachment) -> None:
    session.delete(db_obj)
    session.commit()
