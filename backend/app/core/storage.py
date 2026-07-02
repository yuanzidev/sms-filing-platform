"""Storage backend abstraction with local and MinIO implementations."""
import io
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings


class StorageBackend(ABC):
    """Abstract storage backend for file operations."""

    @abstractmethod
    def upload(self, key: str, data: bytes, content_type: str) -> str:
        """Upload file, return object key or URL."""
        ...

    @abstractmethod
    def download(self, key: str) -> bytes:
        """Download file bytes by key."""
        ...

    @abstractmethod
    def get_url(self, key: str, expires: int = 3600) -> str:
        """Get a presigned download URL."""
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete a file by key."""
        ...


class LocalFileStorage(StorageBackend):
    """Local filesystem storage for development."""

    def __init__(self) -> None:
        self.base_dir = Path(settings.LOCAL_STORAGE_DIR)

    def _resolve(self, key: str) -> Path:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def upload(self, key: str, data: bytes, content_type: str) -> str:
        path = self._resolve(key)
        path.write_bytes(data)
        return key

    def download(self, key: str) -> bytes:
        path = self.base_dir / key
        if not path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        return path.read_bytes()

    def get_url(self, key: str, expires: int = 3600) -> str:
        return f"/api/v1/files/{key}/download"

    def delete(self, key: str) -> None:
        path = self.base_dir / key
        if path.exists():
            path.unlink()


class MinioStorage(StorageBackend):
    """MinIO/S3-compatible object storage for production."""

    def __init__(self) -> None:
        self.endpoint = settings.MINIO_ENDPOINT
        self.bucket = settings.MINIO_BUCKET
        self.client = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            self.client.create_bucket(Bucket=self.bucket)

    def upload(self, key: str, data: bytes, content_type: str) -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key

    def download(self, key: str) -> bytes:
        resp = self.client.get_object(Bucket=self.bucket, Key=key)
        return resp["Body"].read()

    def get_url(self, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)


def get_storage() -> StorageBackend:
    """Factory: return the configured storage backend."""
    if settings.STORAGE_BACKEND == "minio":
        return MinioStorage()
    return LocalFileStorage()
