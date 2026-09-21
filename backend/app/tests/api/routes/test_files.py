import hashlib
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models import FileAttachment


def test_get_local_file_returns_content(monkeypatch, client: TestClient) -> None:
    content = b"fake-png-content"
    stored_path = "sub_port_record/2026-09/test.png"

    class FakeLocalStorage:
        def get_url(self, key: str) -> str:
            return f"/api/v1/files/{key}/download"

        def download(self, key: str) -> bytes:
            assert key == stored_path
            return content

    monkeypatch.setattr("app.api.routes.files.get_storage", lambda: FakeLocalStorage())

    attachment = FileAttachment(
        original_name="image_row1_col1.png",
        stored_path=stored_path,
        file_size=len(content),
        mime_type="image/png",
        md5_hash=hashlib.md5(content).hexdigest(),
        entity_type="sub_port_record",
        entity_id=uuid.uuid4(),
    )
    with Session(engine) as session:
        session.add(attachment)
        session.commit()
        session.refresh(attachment)
        attachment_id = attachment.id

    try:
        response = client.get(f"{settings.API_V1_STR}/files/{attachment_id}")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content == content
    finally:
        with Session(engine) as session:
            saved = session.get(FileAttachment, attachment_id)
            if saved:
                session.delete(saved)
                session.commit()


def test_get_minio_file_is_proxied_through_api(
    monkeypatch, client: TestClient
) -> None:
    """MinIO's internal URL must never be returned to the browser."""
    content = b"existing-minio-image"
    stored_path = "sub_port_record_images/2026-09/existing.png"

    class FakeMinioStorage:
        def get_url(self, key: str) -> str:
            raise AssertionError("preview endpoint must not redirect to MinIO")

        def download(self, key: str) -> bytes:
            assert key == stored_path
            return content

    monkeypatch.setattr("app.api.routes.files.get_storage", lambda: FakeMinioStorage())

    attachment = FileAttachment(
        original_name="image_row1_col4.png",
        stored_path=stored_path,
        file_size=len(content),
        mime_type="image/png",
        md5_hash=hashlib.md5(content).hexdigest(),
        entity_type="sub_port_record",
        entity_id=uuid.uuid4(),
    )
    with Session(engine) as session:
        session.add(attachment)
        session.commit()
        session.refresh(attachment)
        attachment_id = attachment.id

    try:
        response = client.get(f"{settings.API_V1_STR}/files/{attachment_id}")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content == content
        assert "location" not in response.headers
    finally:
        with Session(engine) as session:
            saved = session.get(FileAttachment, attachment_id)
            if saved:
                session.delete(saved)
                session.commit()
