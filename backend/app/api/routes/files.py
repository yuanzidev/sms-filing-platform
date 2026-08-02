"""File upload/download API routes."""
import hashlib
import uuid
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Form, HTTPException, Query, UploadFile

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.storage import get_storage
from app.models import FileAttachmentCreate, FileAttachmentPublic, Message

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
def upload_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile,
    entity_type: str = Form(""),
    entity_id: str = Form(""),
    field_name: str = Form(""),
) -> FileAttachmentPublic:
    """Upload a file/image. Returns file metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE // 1024 // 1024}MB limit")

    md5_hash = hashlib.md5(content).hexdigest()
    content_type = file.content_type or "application/octet-stream"
    ext = Path(file.filename).suffix or ".bin"

    # Build storage key: {entity_type}/{yyyy-mm}/{uuid}{ext}
    key = f"{entity_type or 'uploads'}/{date.today().isoformat()}/{uuid.uuid4().hex}{ext}"

    storage = get_storage()
    storage.upload(key, content, content_type)

    try:
        entity_uuid = uuid.UUID(entity_id) if entity_id else uuid.uuid4()
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid entity_id format, must be a valid UUID")

    from app.crud.file_attachment import create_file_attachment
    fa_in = FileAttachmentCreate(
        original_name=file.filename,
        stored_path=key,
        file_size=len(content),
        mime_type=content_type,
        md5_hash=md5_hash,
        entity_type=entity_type or "uploads",
        entity_id=entity_uuid,
        field_name=field_name or None,
    )
    db_obj = create_file_attachment(session=session, create=fa_in, uploader_id=current_user.id)
    return db_obj


@router.get("")
def list_files(
    *,
    session: SessionDep,
    entity_type: str = Query(...),
    entity_id: uuid.UUID = Query(...),
) -> Any:
    """List file attachments for a given entity."""
    from app.crud.file_attachment import get_file_attachments_by_entity
    return get_file_attachments_by_entity(session=session, entity_type=entity_type, entity_id=entity_id)


@router.get("/{id}")
def get_file(*, session: SessionDep, id: uuid.UUID) -> Any:
    """Redirect to presigned download URL."""
    from app.crud.file_attachment import get_file_attachment
    fa = get_file_attachment(session=session, id=id)
    if not fa:
        raise HTTPException(status_code=404, detail="File not found")

    storage = get_storage()
    url = storage.get_url(fa.stored_path)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)


@router.get("/{id}/download")
def download_file(*, session: SessionDep, id: uuid.UUID) -> Any:
    """Download file bytes directly (used when storage is local)."""
    from app.crud.file_attachment import get_file_attachment
    fa = get_file_attachment(session=session, id=id)
    if not fa:
        raise HTTPException(status_code=404, detail="File not found")

    storage = get_storage()
    content = storage.download(fa.stored_path)
    from fastapi.responses import Response
    return Response(content=content, media_type=fa.mime_type)


@router.delete("/{id}")
def delete_file(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """Delete a file and its storage object."""
    from app.crud.file_attachment import delete_file_attachment, get_file_attachment
    fa = get_file_attachment(session=session, id=id)
    if not fa:
        raise HTTPException(status_code=404, detail="File not found")

    storage = get_storage()
    try:
        storage.delete(fa.stored_path)
    except Exception:
        pass

    delete_file_attachment(session=session, db_obj=fa)
    return Message(message="File deleted successfully")
