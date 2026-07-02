# Backend Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 4 backend business modules (Dashboard, Qualification Management with Excel import/export, Port Management, Third-party API Access) on top of FastAPI + SQLModel + PostgreSQL + MinIO, then wire up frontend API calls to replace mock data.

**Architecture:** Sync FastAPI monolithic backend with SQLModel ORM. Nine new database tables across 4 business domains. MinIO (S3-compatible) for 100GB+ image storage, abstracted behind a `StorageBackend` interface with local filesystem fallback for development. Two-step Excel import (upload/preview → confirm/import) using openpyxl with embedded image extraction.

**Tech Stack:** FastAPI, SQLModel (SQLAlchemy + Pydantic), PostgreSQL 17, MinIO, openpyxl, boto3

## Global Constraints

- Python >=3.10, <4.0
- Sync architecture (no async), reserve `BackgroundTasks` extension point
- All list endpoints use `{ data, total, page, page_size }` pagination format
- List page_size max 100
- Import file size limit 50MB, single image limit 10MB
- First release: no `.xls` format, no external URL images
- Follow existing patterns: `model.py` → `crud/<name>.py` → `routes/<name>.py`
- Use `SessionDep` dependency for database sessions
- All routes protected by `get_current_active_superuser` (except dashboard view)

---

### Task 1: Add project dependencies

**Files:**
- Modify: `backend/pyproject.toml`

**Interfaces:**
- Produces: `openpyxl`, `boto3`, `minio` available in project

- [ ] **Step 1: Add openpyxl, boto3, and minio to dependencies**

```toml
# In backend/pyproject.toml, add to dependencies array:
"openpyxl<4.0.0,>=3.1.0",
"boto3<2.0.0,>=1.34.0",
"minio<8.0.0,>=7.2.0",
```

- [ ] **Step 2: Install updated dependencies**

Run: `cd backend && uv sync`
Expected: Packages installed without errors

- [ ] **Step 3: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore: add openpyxl, boto3, minio dependencies for business modules"
```

---

### Task 2: Add MinIO configuration to Settings

**Files:**
- Modify: `backend/app/core/config.py`

**Interfaces:**
- Produces: `settings.MINIO_ENDPOINT`, `settings.MINIO_ACCESS_KEY`, `settings.MINIO_SECRET_KEY`, `settings.MINIO_BUCKET`, `settings.MINIO_SECURE`, `settings.STORAGE_BACKEND` (local/minio)

- [ ] **Step 1: Add MinIO settings to the Settings class**

```python
# Add these fields inside the Settings class in backend/app/core/config.py,
# after the existing POSTGRES_DB field:

MINIO_ENDPOINT: str = "localhost:9000"
MINIO_ACCESS_KEY: str = "sms_filing"
MINIO_SECRET_KEY: str = "changethis"
MINIO_BUCKET: str = "sms-filing"
MINIO_SECURE: bool = False

# Storage backend: "local" for development, "minio" for production
STORAGE_BACKEND: Literal["local", "minio"] = "local"

# File upload limits
MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
MAX_IMAGE_SIZE: int = 10 * 1024 * 1024   # 10MB

# Local storage fallback directory
LOCAL_STORAGE_DIR: str = "./storage"
```

- [ ] **Step 2: Verify settings load correctly**

Run: `cd backend && python -c "from app.core.config import settings; print(settings.STORAGE_BACKEND)"`
Expected: `local`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/config.py
git commit -m "feat: add MinIO and storage configuration to settings"
```

---

### Task 3: Create StorageBackend abstraction and implementations

**Files:**
- Create: `backend/app/core/storage.py`

**Interfaces:**
- Produces:
  - `class StorageBackend(ABC)` with `upload(key, data, content_type) -> str`, `download(key) -> bytes`, `get_url(key, expires=3600) -> str`, `delete(key) -> None`
  - `class LocalFileStorage(StorageBackend)` — saves under `settings.LOCAL_STORAGE_DIR`
  - `class MinioStorage(StorageBackend)` — uses boto3 S3 client
  - `def get_storage() -> StorageBackend` — factory based on `settings.STORAGE_BACKEND`

- [ ] **Step 1: Write the storage module**

```python
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
```

- [ ] **Step 2: Verify import works**

Run: `cd backend && python -c "from app.core.storage import get_storage; s = get_storage(); print(type(s).__name__)"`
Expected: `LocalFileStorage`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/storage.py
git commit -m "feat: add StorageBackend abstraction with local and MinIO implementations"
```

---

### Task 4: Create all 9 SQLModel database models

**Files:**
- Create: `backend/app/models/port_info.py`
- Create: `backend/app/models/qualification_info.py`
- Create: `backend/app/models/filing_record.py`
- Create: `backend/app/models/main_port.py`
- Create: `backend/app/models/sub_port.py`
- Create: `backend/app/models/file_attachment.py`
- Create: `backend/app/models/export_group.py`
- Create: `backend/app/models/api_access_config.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: All 9 table models with Base/Create/Update/Public/table classes, plus `PortInfo`, `QualificationInfo`, `FilingRecord`, `MainPort`, `SubPort`, `FileAttachment`, `ExportGroup`, `ExportGroupField`, `ApiAccessConfig` with their Public/List response models

- [ ] **Step 1: Write port_info model**

```python
"""Port info model — detailed port-level attributes linked to filing records."""
import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class PortInfoBase(SQLModel):
    carrier: str = Field(max_length=10, index=True)
    operation_type: str | None = Field(default=None, max_length=50)
    main_port_number: str | None = Field(default=None, max_length=100, index=True)
    sub_port_number: str | None = Field(default=None, max_length=100)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50, index=True)
    city: str | None = Field(default=None, max_length=50)
    port_type: str | None = Field(default=None, max_length=50)
    port_activation_date: date | None = Field(default=None)
    allow_self_extension: bool | None = Field(default=None)
    business_attribute: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50, index=True)
    business_subtype: str | None = Field(default=None, max_length=50)
    specific_usage: str | None = Field(default=None)
    sms_signature: str | None = Field(default=None, max_length=200)
    is_gateway_signature: bool | None = Field(default=None)
    carrier_room: str | None = Field(default=None)
    enterprise_room: str | None = Field(default=None)
    has_authorization: bool | None = Field(default=None)
    auth_start_date: date | None = Field(default=None)
    auth_end_date: date | None = Field(default=None)
    sms_template_content: str | None = Field(default=None)


class PortInfo(PortInfoBase, table=True):
    __tablename__ = "port_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class PortInfoCreate(PortInfoBase):
    pass


class PortInfoUpdate(SQLModel):
    carrier: str | None = None
    operation_type: str | None = None
    main_port_number: str | None = None
    sub_port_number: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_type: str | None = None
    port_activation_date: date | None = None
    allow_self_extension: bool | None = None
    business_attribute: str | None = None
    business_type: str | None = None
    business_subtype: str | None = None
    specific_usage: str | None = None
    sms_signature: str | None = None
    is_gateway_signature: bool | None = None
    carrier_room: str | None = None
    enterprise_room: str | None = None
    has_authorization: bool | None = None
    auth_start_date: date | None = None
    auth_end_date: date | None = None
    sms_template_content: str | None = None


class PortInfoPublic(PortInfoBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PortInfosPublic(SQLModel):
    data: list[PortInfoPublic]
    count: int
```

- [ ] **Step 2: Write qualification_info model**

```python
"""Qualification info model — enterprise qualification attributes."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class QualificationInfoBase(SQLModel):
    submit_unit: str | None = Field(default=None, max_length=200)
    carrier_enterprise_id: str | None = Field(default=None, max_length=100)
    enterprise_name: str = Field(max_length=200, index=True)
    cert_type: str | None = Field(default=None, max_length=50)
    cert_number: str | None = Field(default=None, max_length=100, index=True)
    app_platform_name: str | None = Field(default=None, max_length=200)
    group_code: str | None = Field(default=None, max_length=100)
    responsible_name: str | None = Field(default=None, max_length=100)
    responsible_cert_type: str | None = Field(default=None, max_length=50)
    responsible_cert_number: str | None = Field(default=None, max_length=100)
    responsible_phone: str | None = Field(default=None, max_length=20)
    handler_name: str | None = Field(default=None, max_length=100)
    handler_cert_type: str | None = Field(default=None, max_length=50)
    handler_cert_number: str | None = Field(default=None, max_length=100)
    handler_phone: str | None = Field(default=None, max_length=20)


class QualificationInfo(QualificationInfoBase, table=True):
    __tablename__ = "qualification_info"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class QualificationInfoCreate(QualificationInfoBase):
    pass


class QualificationInfoUpdate(SQLModel):
    submit_unit: str | None = None
    carrier_enterprise_id: str | None = None
    enterprise_name: str | None = None
    cert_type: str | None = None
    cert_number: str | None = None
    app_platform_name: str | None = None
    group_code: str | None = None
    responsible_name: str | None = None
    responsible_cert_type: str | None = None
    responsible_cert_number: str | None = None
    responsible_phone: str | None = None
    handler_name: str | None = None
    handler_cert_type: str | None = None
    handler_cert_number: str | None = None
    handler_phone: str | None = None


class QualificationInfoPublic(QualificationInfoBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class QualificationInfosPublic(SQLModel):
    data: list[QualificationInfoPublic]
    count: int
```

- [ ] **Step 3: Write filing_record model**

```python
"""Filing record model — joins port_info and qualification_info with status tracking."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


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
    port_info: "PortInfo" = Relationship()
    qualification_info: "QualificationInfo" = Relationship()


class FilingRecordCreate(SQLModel):
    record_number: str = Field(max_length=50)
    status: str = Field(default="草稿", max_length=20)
    port_info: "PortInfoCreate"
    qualification_info: "QualificationInfoCreate"
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
    port_info: "PortInfoPublic" | None = None
    qualification_info: "QualificationInfoPublic" | None = None


class FilingRecordsPublic(SQLModel):
    data: list[FilingRecordPublic]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 4: Write main_port model**

```python
"""Main port model — top-level port/code number management."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class MainPortBase(SQLModel):
    port_number: str = Field(max_length=100, index=True)
    carrier: str = Field(max_length=10, index=True)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50)
    city: str | None = Field(default=None, max_length=50)
    port_type: str | None = Field(default=None, max_length=50)
    status: str = Field(default="空闲", max_length=20)


class MainPort(MainPortBase, table=True):
    __tablename__ = "main_port"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class MainPortCreate(MainPortBase):
    pass


class MainPortUpdate(SQLModel):
    port_number: str | None = None
    carrier: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_type: str | None = None
    status: str | None = None


class MainPortPublic(MainPortBase):
    id: uuid.UUID
    sub_port_count: int = 0
    created_at: datetime
    updated_at: datetime


class MainPortsPublic(SQLModel):
    data: list[MainPortPublic]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 5: Write sub_port model**

```python
"""Sub port model — sub-port/code number management under main ports."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class SubPortBase(SQLModel):
    port_number: str = Field(max_length=100, index=True)
    carrier: str = Field(max_length=10)
    status: str = Field(default="空闲", max_length=20)


class SubPort(SubPortBase, table=True):
    __tablename__ = "sub_port"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    main_port_id: uuid.UUID = Field(foreign_key="main_port.id", index=True)
    filing_record_id: uuid.UUID | None = Field(default=None, foreign_key="filing_record.id", nullable=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    main_port: "MainPort" = Relationship()


class SubPortCreate(SQLModel):
    port_number: str = Field(max_length=100)
    main_port_id: uuid.UUID
    carrier: str = Field(max_length=10)
    status: str = Field(default="空闲", max_length=20)
    filing_record_id: uuid.UUID | None = None


class SubPortUpdate(SQLModel):
    port_number: str | None = None
    carrier: str | None = None
    status: str | None = None
    filing_record_id: uuid.UUID | None = None


class SubPortPublic(SubPortBase):
    id: uuid.UUID
    main_port_id: uuid.UUID
    main_port_number: str = ""
    filing_record_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class SubPortsPublic(SQLModel):
    data: list[SubPortPublic]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 6: Write file_attachment model**

```python
"""File attachment model — metadata for files/images stored in object storage."""
import uuid
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

from app.core.timezone import utcnow


class FileAttachmentBase(SQLModel):
    original_name: str = Field(max_length=500)
    stored_path: str = Field(max_length=1000)
    file_size: int = Field()
    mime_type: str = Field(max_length=100)
    md5_hash: str = Field(max_length=32, index=True)
    entity_type: str = Field(max_length=50, index=True)
    entity_id: uuid.UUID = Field(index=True)


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


class FileAttachmentPublic(FileAttachmentBase):
    id: uuid.UUID
    uploader_id: uuid.UUID | None = None
    created_at: datetime


class FileAttachmentsPublic(SQLModel):
    data: list[FileAttachmentPublic]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 7: Write export_group model**

```python
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
```

- [ ] **Step 8: Write api_access_config model**

```python
"""API access config model — third-party API data integration configuration."""
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class ApiAccessConfigBase(SQLModel):
    name: str = Field(max_length=200)
    source_type: str | None = Field(default=None, max_length=50)
    endpoint: str | None = Field(default=None, max_length=500)
    auth_config: dict | None = Field(default=None, sa_type="json")
    field_mapping: dict | None = Field(default=None, sa_type="json")
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
```

- [ ] **Step 9: Update models __init__.py with all new model exports**

```python
# Append to backend/app/models/__init__.py, after the existing exports:

from .port_info import (
    PortInfo,
    PortInfoCreate,
    PortInfoPublic,
    PortInfosPublic,
    PortInfoUpdate,
)
from .qualification_info import (
    QualificationInfo,
    QualificationInfoCreate,
    QualificationInfoPublic,
    QualificationInfosPublic,
    QualificationInfoUpdate,
)
from .filing_record import (
    FilingRecord,
    FilingRecordCreate,
    FilingRecordPublic,
    FilingRecordsPublic,
    FilingRecordUpdate,
)
from .main_port import (
    MainPort,
    MainPortCreate,
    MainPortPublic,
    MainPortsPublic,
    MainPortUpdate,
)
from .sub_port import (
    SubPort,
    SubPortCreate,
    SubPortPublic,
    SubPortsPublic,
    SubPortUpdate,
)
from .file_attachment import (
    FileAttachment,
    FileAttachmentCreate,
    FileAttachmentPublic,
    FileAttachmentsPublic,
)
from .export_group import (
    ExportGroup,
    ExportGroupCreate,
    ExportGroupField,
    ExportGroupFieldCreate,
    ExportGroupFieldPublic,
    ExportGroupPublic,
    ExportGroupsPublic,
    ExportGroupUpdate,
)
from .api_access_config import (
    ApiAccessConfig,
    ApiAccessConfigCreate,
    ApiAccessConfigPublic,
    ApiAccessConfigsPublic,
    ApiAccessConfigUpdate,
)
```

- [ ] **Step 10: Verify all models import without errors**

Run: `cd backend && python -c "from app.models import PortInfo, QualificationInfo, FilingRecord, MainPort, SubPort, FileAttachment, ExportGroup, ApiAccessConfig; print('All models OK')"`
Expected: `All models OK`

- [ ] **Step 11: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add all 9 business module SQLModel models"
```

---

### Task 5: Generate Alembic migration

**Files:**
- Create: `backend/app/alembic/versions/<auto>_add_business_tables.py` (auto-generated)

- [ ] **Step 1: Generate the migration**

Run: `cd backend && uv run alembic revision --autogenerate -m "add_business_tables"`
Expected: New migration file created in `versions/`

- [ ] **Step 2: Review the generated migration**

Read the generated file and verify it includes all 9 new tables with correct columns, indexes, and foreign keys.

- [ ] **Step 3: Apply the migration**

Run: `cd backend && uv run alembic upgrade head`
Expected: Migration applied without errors

- [ ] **Step 4: Verify tables exist in database**

Run: `cd backend && python -c "from app.core.db import engine; from sqlmodel import inspect; inspector = inspect(engine); print(inspector.get_table_names())"`
Expected: Lists all tables including `port_info`, `qualification_info`, `filing_record`, `main_port`, `sub_port`, `file_attachment`, `export_group`, `export_group_field`, `api_access_config`

- [ ] **Step 5: Commit**

```bash
git add backend/app/alembic/versions/
git commit -m "chore: add Alembic migration for business tables"
```

---

### Task 6: Create file_attachment CRUD

**Files:**
- Create: `backend/app/crud/file_attachment.py`

**Interfaces:**
- Produces:
  - `create_file_attachment(*, session: Session, create: FileAttachmentCreate, uploader_id: uuid.UUID | None = None) -> FileAttachment`
  - `get_file_attachment(*, session: Session, id: uuid.UUID) -> FileAttachment | None`
  - `get_file_attachments_by_entity(*, session: Session, entity_type: str, entity_id: uuid.UUID) -> list[FileAttachment]`
  - `delete_file_attachment(*, session: Session, db_obj: FileAttachment) -> None`

- [ ] **Step 1: Write the CRUD module**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/crud/file_attachment.py
git commit -m "feat: add file_attachment CRUD operations"
```

---

### Task 7: Create file upload/download API routes

**Files:**
- Create: `backend/app/api/routes/files.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
  - `POST /api/v1/files/upload` — multipart upload, returns `FileAttachmentPublic`
  - `GET /api/v1/files/{id}` — 302 redirect to presigned URL
  - `GET /api/v1/files/{id}/download` — download file bytes (for local storage)
  - `DELETE /api/v1/files/{id}` — delete file + storage object

- [ ] **Step 1: Write the files route**

```python
"""File upload/download API routes."""
import hashlib
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.storage import get_storage
from app.models import (
    FileAttachment,
    FileAttachmentCreate,
    FileAttachmentPublic,
    FileAttachmentsPublic,
    Message,
)

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", dependencies=[Depends(get_current_active_superuser)])
def upload_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile,
    entity_type: str = "",
    entity_id: str = "",
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
    from datetime import date
    key = f"{entity_type or 'uploads'}/{date.today().isoformat()}/{uuid.uuid4().hex}{ext}"

    storage = get_storage()
    storage.upload(key, content, content_type)

    entity_uuid = uuid.UUID(entity_id) if entity_id else uuid.uuid4()

    from app.crud.file_attachment import create_file_attachment
    fa_in = FileAttachmentCreate(
        original_name=file.filename,
        stored_path=key,
        file_size=len(content),
        mime_type=content_type,
        md5_hash=md5_hash,
        entity_type=entity_type or "uploads",
        entity_id=entity_uuid,
    )
    db_obj = create_file_attachment(session=session, create=fa_in, uploader_id=current_user.id)
    return db_obj


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


@router.delete("/{id}", dependencies=[Depends(get_current_active_superuser)])
def delete_file(
    *, session: SessionDep, id: uuid.UUID
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
```

- [ ] **Step 2: Register the files router in api/main.py**

```python
# Add to the imports in backend/app/api/main.py:
from app.api.routes import files

# Add after the last include_router:
api_router.include_router(files.router)
```

- [ ] **Step 3: Verify the route registers correctly**

Run: `cd backend && python -c "from app.api.main import api_router; print('routes OK')"`
Expected: `routes OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routes/files.py backend/app/api/main.py
git commit -m "feat: add file upload/download API endpoints"
```

---

### Task 8: Add MinIO to docker-compose

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add MinIO service and volume to docker-compose.yml**

```yaml
# Add under services: (alongside db, backend, frontend):
  minio:
    image: minio/minio
    container_name: sms-filing-minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-sms_filing}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-changethis}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    networks:
      - sms-filing-network

# Add under volumes: (alongside postgres-data):
  minio-data:
    driver: local
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add MinIO service to docker-compose"
```

---

### Task 9: Create main_port CRUD

**Files:**
- Create: `backend/app/crud/port.py`

**Interfaces:**
- Produces:
  - `create_main_port(*, session: Session, create: MainPortCreate) -> MainPort`
  - `get_main_port(*, session: Session, id: uuid.UUID) -> MainPort | None`
  - `list_main_ports(*, session: Session, skip: int, limit: int, carrier: str | None, status: str | None, province: str | None) -> tuple[list, int]`
  - `update_main_port(*, session: Session, db_obj: MainPort, update: MainPortUpdate) -> MainPort`
  - `delete_main_port(*, session: Session, db_obj: MainPort) -> None`

- [ ] **Step 1: Write the port CRUD module**

```python
"""CRUD operations for ports (main_port and sub_port)."""
import uuid

from sqlmodel import Session, func, select

from app.models import MainPort, MainPortCreate, MainPortUpdate, SubPort, SubPortCreate, SubPortUpdate


# ─── Main Port ───────────────────────────────────────────────

def create_main_port(*, session: Session, create: MainPortCreate) -> MainPort:
    db_obj = MainPort.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_main_port(*, session: Session, id: uuid.UUID) -> MainPort | None:
    return session.get(MainPort, id)


def list_main_ports(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    status: str | None = None,
    province: str | None = None,
) -> tuple[list[MainPort], int]:
    query = select(MainPort)
    if carrier:
        query = query.where(MainPort.carrier == carrier)
    if status:
        query = query.where(MainPort.status == status)
    if province:
        query = query.where(MainPort.province == province)

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(query.offset(skip).limit(limit).order_by(MainPort.created_at.desc())).all()
    return list(results), count


def update_main_port(*, session: Session, db_obj: MainPort, update: MainPortUpdate) -> MainPort:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_main_port(*, session: Session, db_obj: MainPort) -> None:
    session.delete(db_obj)
    session.commit()


# ─── Sub Port ────────────────────────────────────────────────

def create_sub_port(*, session: Session, create: SubPortCreate) -> SubPort:
    db_obj = SubPort.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_sub_port(*, session: Session, id: uuid.UUID) -> SubPort | None:
    return session.get(SubPort, id)


def list_sub_ports(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    main_port_id: uuid.UUID | None = None,
    carrier: str | None = None,
    status: str | None = None,
) -> tuple[list[SubPort], int]:
    query = select(SubPort)
    if main_port_id:
        query = query.where(SubPort.main_port_id == main_port_id)
    if carrier:
        query = query.where(SubPort.carrier == carrier)
    if status:
        query = query.where(SubPort.status == status)

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(query.offset(skip).limit(limit).order_by(SubPort.created_at.desc())).all()
    return list(results), count


def update_sub_port(*, session: Session, db_obj: SubPort, update: SubPortUpdate) -> SubPort:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_sub_port(*, session: Session, db_obj: SubPort) -> None:
    session.delete(db_obj)
    session.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/crud/port.py
git commit -m "feat: add main_port and sub_port CRUD operations"
```

---

### Task 10: Create port management API routes

**Files:**
- Create: `backend/app/api/routes/ports.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
  - Main port CRUD at `/api/v1/ports/main`
  - Sub port CRUD at `/api/v1/ports/sub`
  - GET main port detail includes sub_port_count

- [ ] **Step 1: Write the ports route**

```python
"""Port management API routes — main ports and sub ports."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.port import (
    create_main_port,
    create_sub_port,
    delete_main_port,
    delete_sub_port,
    get_main_port,
    get_sub_port,
    list_main_ports,
    list_sub_ports,
    update_main_port,
    update_sub_port,
)
from app.models import (
    MainPort,
    MainPortCreate,
    MainPortPublic,
    MainPortsPublic,
    MainPortUpdate,
    Message,
    SubPort,
    SubPortCreate,
    SubPortPublic,
    SubPortsPublic,
    SubPortUpdate,
)

router = APIRouter(prefix="/ports", tags=["ports"], dependencies=[Depends(get_current_active_superuser)])


def _main_port_to_public(db_obj: MainPort, session) -> MainPortPublic:
    sub_count = session.exec(
        select(func.count()).select_from(
            select(SubPort).where(SubPort.main_port_id == db_obj.id).subquery()
        )
    ).one()
    return MainPortPublic(
        id=db_obj.id,
        port_number=db_obj.port_number,
        carrier=db_obj.carrier,
        port_range=db_obj.port_range,
        province=db_obj.province,
        city=db_obj.city,
        port_type=db_obj.port_type,
        status=db_obj.status,
        sub_port_count=sub_count,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
    )


# ─── Main Ports ──────────────────────────────────────────────

@router.get("/main", response_model=MainPortsPublic)
def read_main_ports(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    carrier: str | None = None,
    status: str | None = None,
    province: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_main_ports(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, status=status, province=province,
    )
    data = [_main_port_to_public(mp, session) for mp in items]
    return MainPortsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("/main", response_model=MainPortPublic)
def create_main_port_endpoint(*, session: SessionDep, create: MainPortCreate) -> Any:
    db_obj = create_main_port(session=session, create=create)
    return _main_port_to_public(db_obj, session)


@router.get("/main/{id}", response_model=MainPortPublic)
def read_main_port(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    return _main_port_to_public(db_obj, session)


@router.patch("/main/{id}", response_model=MainPortPublic)
def update_main_port_endpoint(*, session: SessionDep, id: uuid.UUID, update: MainPortUpdate) -> Any:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    db_obj = update_main_port(session=session, db_obj=db_obj, update=update)
    return _main_port_to_public(db_obj, session)


@router.delete("/main/{id}")
def delete_main_port_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_main_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="主端口不存在")
    delete_main_port(session=session, db_obj=db_obj)
    return Message(message="主端口删除成功")


# ─── Sub Ports ───────────────────────────────────────────────

def _sub_port_to_public(db_obj: SubPort, session) -> SubPortPublic:
    main_port = session.get(MainPort, db_obj.main_port_id)
    return SubPortPublic(
        id=db_obj.id,
        port_number=db_obj.port_number,
        main_port_id=db_obj.main_port_id,
        main_port_number=main_port.port_number if main_port else "",
        carrier=db_obj.carrier,
        status=db_obj.status,
        filing_record_id=db_obj.filing_record_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
    )


@router.get("/sub", response_model=SubPortsPublic)
def read_sub_ports(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    main_port_id: uuid.UUID | None = None,
    carrier: str | None = None,
    status: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_sub_ports(
        session=session, skip=skip, limit=page_size,
        main_port_id=main_port_id, carrier=carrier, status=status,
    )
    data = [_sub_port_to_public(sp, session) for sp in items]
    return SubPortsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("/sub", response_model=SubPortPublic)
def create_sub_port_endpoint(*, session: SessionDep, create: SubPortCreate) -> Any:
    db_obj = create_sub_port(session=session, create=create)
    return _sub_port_to_public(db_obj, session)


@router.get("/sub/{id}", response_model=SubPortPublic)
def read_sub_port(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    return _sub_port_to_public(db_obj, session)


@router.patch("/sub/{id}", response_model=SubPortPublic)
def update_sub_port_endpoint(*, session: SessionDep, id: uuid.UUID, update: SubPortUpdate) -> Any:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    db_obj = update_sub_port(session=session, db_obj=db_obj, update=update)
    return _sub_port_to_public(db_obj, session)


@router.delete("/sub/{id}")
def delete_sub_port_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_sub_port(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口不存在")
    delete_sub_port(session=session, db_obj=db_obj)
    return Message(message="子端口删除成功")
```

- [ ] **Step 2: Register in api/main.py**

```python
# Add import:
from app.api.routes import ports

# Add router:
api_router.include_router(ports.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/ports.py backend/app/api/main.py
git commit -m "feat: add port management API endpoints"
```

---

### Task 11: Create filing_record CRUD

**Files:**
- Create: `backend/app/crud/record.py`

**Interfaces:**
- Produces:
  - `create_filing_record(*, session: Session, create: FilingRecordCreate, operator_id: uuid.UUID | None) -> FilingRecord`
  - `get_filing_record(*, session: Session, id: uuid.UUID) -> FilingRecord | None`
  - `list_filing_records(*, session, skip, limit, carrier, status, enterprise_name, province, business_type, keyword) -> tuple[list, int]`
  - `update_filing_record(*, session: Session, db_obj: FilingRecord, update: FilingRecordUpdate) -> FilingRecord`
  - `delete_filing_record(*, session: Session, db_obj: FilingRecord) -> None`

- [ ] **Step 1: Write the record CRUD module**

```python
"""CRUD operations for filing records (port_info + qualification_info + filing_record)."""
import uuid

from sqlmodel import Session, func, select

from app.models import (
    FilingRecord,
    FilingRecordCreate,
    FilingRecordUpdate,
    PortInfo,
    PortInfoCreate,
    QualificationInfo,
    QualificationInfoCreate,
)


def _record_number_sequence(session: Session) -> int:
    """Generate next record number for REC-YYYYMMDD-XXXX format."""
    from datetime import date
    prefix = date.today().strftime("REC-%Y%m%d-")
    stmt = select(func.max(FilingRecord.record_number)).where(
        FilingRecord.record_number.like(f"{prefix}%")
    )
    last = session.exec(stmt).one()
    if last and last.startswith(prefix):
        return int(last[len(prefix):]) + 1
    return 1


def create_filing_record(
    *, session: Session, create: FilingRecordCreate, operator_id: uuid.UUID | None = None
) -> FilingRecord:
    # 1. Create port_info
    pi = PortInfo.model_validate(create.port_info)
    session.add(pi)
    session.flush()

    # 2. Create qualification_info
    qi = QualificationInfo.model_validate(create.qualification_info)
    session.add(qi)
    session.flush()

    # 3. Create filing_record
    if not create.record_number or create.record_number == "auto":
        seq = _record_number_sequence(session)
        from datetime import date
        record_number = f"REC-{date.today().strftime('%Y%m%d')}-{seq:04d}"
    else:
        record_number = create.record_number

    fr = FilingRecord(
        record_number=record_number,
        status=create.status,
        port_info_id=pi.id,
        qualification_info_id=qi.id,
        operator_id=operator_id,
        source_file=create.source_file,
        import_batch=create.import_batch,
    )
    session.add(fr)
    session.commit()
    session.refresh(fr)
    return fr


def get_filing_record(*, session: Session, id: uuid.UUID) -> FilingRecord | None:
    return session.get(FilingRecord, id)


def list_filing_records(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    status: str | None = None,
    enterprise_name: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
    keyword: str | None = None,
) -> tuple[list[FilingRecord], int]:
    query = select(FilingRecord).join(PortInfo).join(QualificationInfo)

    if carrier:
        query = query.where(PortInfo.carrier == carrier)
    if status:
        query = query.where(FilingRecord.status == status)
    if enterprise_name:
        query = query.where(QualificationInfo.enterprise_name.contains(enterprise_name))
    if province:
        query = query.where(PortInfo.province == province)
    if business_type:
        query = query.where(PortInfo.business_type == business_type)
    if keyword:
        query = query.where(
            (QualificationInfo.enterprise_name.contains(keyword)) |
            (PortInfo.main_port_number.contains(keyword)) |
            (FilingRecord.record_number.contains(keyword))
        )

    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(FilingRecord.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count


def update_filing_record(
    *, session: Session, db_obj: FilingRecord, update: FilingRecordUpdate
) -> FilingRecord:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_filing_record(*, session: Session, db_obj: FilingRecord) -> None:
    # Also delete associated port_info and qualification_info
    pi_id = db_obj.port_info_id
    qi_id = db_obj.qualification_info_id
    session.delete(db_obj)
    session.flush()
    session.exec(select(PortInfo).where(PortInfo.id == pi_id)).first and session.delete(
        session.get(PortInfo, pi_id)
    )
    session.exec(select(QualificationInfo).where(QualificationInfo.id == qi_id)).first and session.delete(
        session.get(QualificationInfo, qi_id)
    )
    session.commit()


def batch_create_filing_records(
    *, session: Session, records: list[dict], import_batch: str, operator_id: uuid.UUID | None
) -> tuple[int, list[str]]:
    """Batch create filing records from parsed Excel data. Returns (success_count, errors)."""
    success = 0
    errors: list[str] = []
    for i, row in enumerate(records, start=1):
        try:
            pi = PortInfo(**row.get("port_info", {}))
            session.add(pi)
            session.flush()

            qi = QualificationInfo(**row.get("qualification_info", {}))
            session.add(qi)
            session.flush()

            seq = _record_number_sequence(session)
            from datetime import date
            record_number = f"REC-{date.today().strftime('%Y%m%d')}-{seq:04d}"

            fr = FilingRecord(
                record_number=record_number,
                status="已报备",
                port_info_id=pi.id,
                qualification_info_id=qi.id,
                operator_id=operator_id,
                import_batch=import_batch,
            )
            session.add(fr)
            success += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
    session.commit()
    return success, errors
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/crud/record.py
git commit -m "feat: add filing_record CRUD with three-table join operations"
```

---

### Task 12: Create filing records API routes

**Files:**
- Create: `backend/app/api/routes/records.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
    - `GET /api/v1/records` — paginated list with multi-filter
    - `GET /api/v1/records/{id}` — detail with port_info + qualification_info + attachments
    - `POST /api/v1/records` — create (three-table)
    - `PATCH /api/v1/records/{id}` — update status
    - `DELETE /api/v1/records/{id}` — delete with cascading

- [ ] **Step 1: Write the records route**

```python
"""Filing records API routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.crud.record import (
    create_filing_record,
    delete_filing_record,
    get_filing_record,
    list_filing_records,
    update_filing_record,
)
from app.crud.file_attachment import get_file_attachments_by_entity
from app.models import (
    FilingRecordCreate,
    FilingRecordPublic,
    FilingRecordsPublic,
    FilingRecordUpdate,
    Message,
    PortInfoPublic,
    QualificationInfoPublic,
)

router = APIRouter(prefix="/records", tags=["records"], dependencies=[Depends(get_current_active_superuser)])


def _record_to_public(db_obj, session) -> FilingRecordPublic:
    pi_data = PortInfoPublic.model_validate(db_obj.port_info).model_dump() if db_obj.port_info else None
    qi_data = QualificationInfoPublic.model_validate(db_obj.qualification_info).model_dump() if db_obj.qualification_info else None

    return FilingRecordPublic(
        id=db_obj.id,
        record_number=db_obj.record_number,
        status=db_obj.status,
        source_file=db_obj.source_file,
        import_batch=db_obj.import_batch,
        port_info_id=db_obj.port_info_id,
        qualification_info_id=db_obj.qualification_info_id,
        operator_id=db_obj.operator_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
        port_info=PortInfoPublic(**pi_data) if pi_data else None,
        qualification_info=QualificationInfoPublic(**qi_data) if qi_data else None,
    )


@router.get("", response_model=FilingRecordsPublic)
@router.get("/", include_in_schema=False, response_model=FilingRecordsPublic)
def read_records(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    carrier: str | None = None,
    status: str | None = None,
    enterprise_name: str | None = None,
    province: str | None = None,
    business_type: str | None = None,
    keyword: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_filing_records(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, status=status, enterprise_name=enterprise_name,
        province=province, business_type=business_type, keyword=keyword,
    )
    data = [_record_to_public(r, session) for r in items]
    return FilingRecordsPublic(data=data, total=total, page=page, page_size=page_size)


@router.post("", response_model=FilingRecordPublic)
@router.post("/", include_in_schema=False, response_model=FilingRecordPublic)
def create_record(*, session: SessionDep, create: FilingRecordCreate, current_user: CurrentUser) -> Any:
    db_obj = create_filing_record(session=session, create=create, operator_id=current_user.id)
    session.refresh(db_obj)
    return _record_to_public(db_obj, session)


@router.get("/{id}", response_model=FilingRecordPublic)
def read_record(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    return _record_to_public(db_obj, session)


@router.patch("/{id}", response_model=FilingRecordPublic)
def update_record(*, session: SessionDep, id: uuid.UUID, update: FilingRecordUpdate) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    db_obj = update_filing_record(session=session, db_obj=db_obj, update=update)
    return _record_to_public(db_obj, session)


@router.delete("/{id}")
def delete_record(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    delete_filing_record(session=session, db_obj=db_obj)
    return Message(message="报备记录删除成功")
```

- [ ] **Step 2: Register in api/main.py**

```python
# Add import:
from app.api.routes import records

# Add router:
api_router.include_router(records.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/records.py backend/app/api/main.py
git commit -m "feat: add filing records CRUD API with filtering and three-table detail"
```

---

### Task 13: Create export_group CRUD + API routes

**Files:**
- Create: `backend/app/crud/export_group.py`
- Create: `backend/app/api/routes/export_groups.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
  - CRUD for `export_group` with nested field management
  - `GET/POST/PATCH/DELETE /api/v1/export-groups`

- [ ] **Step 1: Write the export_group CRUD**

```python
"""CRUD operations for export groups and fields."""
import uuid

from sqlmodel import Session, select

from app.models import (
    ExportGroup,
    ExportGroupCreate,
    ExportGroupField,
    ExportGroupFieldCreate,
    ExportGroupUpdate,
)


def create_export_group(*, session: Session, create: ExportGroupCreate) -> ExportGroup:
    db_obj = ExportGroup(name=create.name, description=create.description)
    session.add(db_obj)
    session.flush()

    for fc in create.fields:
        field = ExportGroupField(
            group_id=db_obj.id,
            field_name=fc.field_name,
            field_label=fc.field_label,
            sort_order=fc.sort_order,
        )
        session.add(field)

    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_export_group(*, session: Session, id: uuid.UUID) -> ExportGroup | None:
    return session.get(ExportGroup, id)


def list_export_groups(*, session: Session) -> list[ExportGroup]:
    return list(session.exec(select(ExportGroup).order_by(ExportGroup.created_at.desc())).all())


def update_export_group(
    *, session: Session, db_obj: ExportGroup, update: ExportGroupUpdate
) -> ExportGroup:
    data = update.model_dump(exclude_unset=True)
    fields_data = data.pop("fields", None)

    db_obj.sqlmodel_update(data)

    if fields_data is not None:
        # Delete existing fields and recreate
        for f in db_obj.fields:
            session.delete(f)
        for fc in fields_data:
            field = ExportGroupField(
                group_id=db_obj.id,
                field_name=fc["field_name"],
                field_label=fc["field_label"],
                sort_order=fc.get("sort_order", 0),
            )
            session.add(field)

    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_export_group(*, session: Session, db_obj: ExportGroup) -> None:
    session.delete(db_obj)
    session.commit()
```

- [ ] **Step 2: Write the export_groups route**

```python
"""Export group API routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.export_group import (
    create_export_group,
    delete_export_group,
    get_export_group,
    list_export_groups,
    update_export_group,
)
from app.models import (
    ExportGroupCreate,
    ExportGroupPublic,
    ExportGroupsPublic,
    ExportGroupUpdate,
    Message,
)

router = APIRouter(prefix="/export-groups", tags=["export-groups"], dependencies=[Depends(get_current_active_superuser)])


@router.get("", response_model=ExportGroupsPublic)
@router.get("/", include_in_schema=False, response_model=ExportGroupsPublic)
def read_export_groups(session: SessionDep) -> Any:
    groups = list_export_groups(session=session)
    return ExportGroupsPublic(data=groups, count=len(groups))


@router.post("", response_model=ExportGroupPublic)
@router.post("/", include_in_schema=False, response_model=ExportGroupPublic)
def create_export_group_endpoint(*, session: SessionDep, create: ExportGroupCreate) -> Any:
    db_obj = create_export_group(session=session, create=create)
    return db_obj


@router.get("/{id}", response_model=ExportGroupPublic)
def read_export_group(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    return db_obj


@router.patch("/{id}", response_model=ExportGroupPublic)
def update_export_group_endpoint(*, session: SessionDep, id: uuid.UUID, update: ExportGroupUpdate) -> Any:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    db_obj = update_export_group(session=session, db_obj=db_obj, update=update)
    return db_obj


@router.delete("/{id}")
def delete_export_group_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_export_group(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="导出分组不存在")
    delete_export_group(session=session, db_obj=db_obj)
    return Message(message="导出分组删除成功")
```

- [ ] **Step 3: Register in api/main.py**

```python
# Add import:
from app.api.routes import export_groups

# Add router:
api_router.include_router(export_groups.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/crud/export_group.py backend/app/api/routes/export_groups.py backend/app/api/main.py
git commit -m "feat: add export group CRUD and API endpoints"
```

---

### Task 14: Create Excel export endpoint

**Files:**
- Create: `backend/app/services/export.py`
- Modify: `backend/app/api/routes/records.py`

**Interfaces:**
- Produces: `POST /api/v1/records/export` — accepts `{ export_group_id, filters }`, returns xlsx file stream

- [ ] **Step 1: Write the export service**

```python
"""Excel export service — generates .xlsx from filing records using export group config."""
import io
import uuid
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlmodel import Session

from app.crud.export_group import get_export_group
from app.models import FilingRecord, PortInfo, QualificationInfo


def build_field_map() -> dict[str, str]:
    """Map logical field_name to the model attribute path used in export.
    Returns {field_name: label} for all supported fields."""
    return {
        # Port info fields
        "carrier": "运营商",
        "operation_type": "操作类型",
        "main_port_number": "主端口号",
        "sub_port_number": "子端口号",
        "port_range": "码号使用范围",
        "province": "接入省",
        "city": "接入地市",
        "port_type": "端口类型",
        "port_activation_date": "端口入网时间",
        "allow_self_extension": "是否允许自行扩展",
        "business_attribute": "业务属性",
        "business_type": "业务类型",
        "business_subtype": "业务细类",
        "specific_usage": "具体用途",
        "sms_signature": "短信签名",
        "is_gateway_signature": "是否网关签名",
        "carrier_room": "运营商接入机房及设备",
        "enterprise_room": "企业接入机房及设备",
        "has_authorization": "是否具有授权书",
        "auth_start_date": "授权开始日期",
        "auth_end_date": "授权结束日期",
        "sms_template_content": "短信模板内容",
        # Qualification info fields
        "submit_unit": "报送单位",
        "carrier_enterprise_id": "运营商企业ID",
        "enterprise_name": "企业名称",
        "cert_type": "单位证件类型",
        "cert_number": "单位证件号码",
        "app_platform_name": "APP/平台名称",
        "group_code": "集团编码",
        "responsible_name": "责任人姓名",
        "responsible_cert_type": "责任人证件类型",
        "responsible_cert_number": "责任人证件号码",
        "responsible_phone": "责任人手机号",
        "handler_name": "经办人姓名",
        "handler_cert_type": "经办人证件类型",
        "handler_cert_number": "经办人证件号码",
        "handler_phone": "经办人手机号",
        # Record info fields
        "record_number": "报备编号",
        "status": "状态",
        "created_at": "创建时间",
    }


def get_field_value(obj: Any, field_name: str) -> str:
    """Get field value from port_info, qualification_info, or filing_record."""
    pi_fields = {
        "carrier", "operation_type", "main_port_number", "sub_port_number", "port_range",
        "province", "city", "port_type", "port_activation_date", "allow_self_extension",
        "business_attribute", "business_type", "business_subtype", "specific_usage",
        "sms_signature", "is_gateway_signature", "carrier_room", "enterprise_room",
        "has_authorization", "auth_start_date", "auth_end_date", "sms_template_content",
    }
    qi_fields = {
        "submit_unit", "carrier_enterprise_id", "enterprise_name", "cert_type",
        "cert_number", "app_platform_name", "group_code", "responsible_name",
        "responsible_cert_type", "responsible_cert_number", "responsible_phone",
        "handler_name", "handler_cert_type", "handler_cert_number", "handler_phone",
    }

    if field_name in pi_fields and obj.port_info:
        value = getattr(obj.port_info, field_name, "")
    elif field_name in qi_fields and obj.qualification_info:
        value = getattr(obj.qualification_info, field_name, "")
    else:
        value = getattr(obj, field_name, "")

    if value is None:
        return ""
    if isinstance(value, bool):
        return "是" if value else "否"
    return str(value)


def generate_export(
    session: Session,
    export_group_id: uuid.UUID,
    filters: dict[str, Any] | None = None,
) -> io.BytesIO:
    """Generate an Excel file based on export group field configuration."""
    group = get_export_group(session=session, id=export_group_id)
    if not group:
        raise ValueError("Export group not found")

    # Get records matching filters
    from app.crud.record import list_filing_records
    records, _ = list_filing_records(
        session=session, skip=0, limit=100000, **(filters or {})
    )

    field_map = build_field_map()
    wb = Workbook()
    ws = wb.active
    ws.title = "报备记录导出"

    # Header style
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    # Write headers
    sorted_fields = sorted(group.fields, key=lambda f: f.sort_order)
    col_names = [f.field_name for f in sorted_fields if f.field_name in field_map]

    for col_idx, field_name in enumerate(col_names, 1):
        cell = ws.cell(row=1, column=col_idx, value=field_map[field_name])
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Write data rows
    for row_idx, record in enumerate(records, 2):
        for col_idx, field_name in enumerate(col_names, 1):
            value = get_field_value(record, field_name)
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border

    # Auto-adjust column widths
    for col_idx, _ in enumerate(col_names, 1):
        max_width = 0
        for row in ws.iter_rows(min_col=col_idx, max_col=col_idx, values_only=True):
            for cell_value in row:
                if cell_value:
                    max_width = max(max_width, len(str(cell_value)))
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = min(max_width + 4, 50)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
```

- [ ] **Step 2: Add export endpoint to records route**

```python
# Add to backend/app/api/routes/records.py, after the existing imports:
import io
import uuid

from fastapi.responses import StreamingResponse

from app.models import ExportGroup, ExportGroupField

# Add inside the router, before the last route:

class ExportRequest(SQLModel):
    export_group_id: uuid.UUID
    carrier: str | None = None
    status: str | None = None
    enterprise_name: str | None = None
    province: str | None = None
    business_type: str | None = None


@router.post("/export")
def export_records(*, session: SessionDep, body: ExportRequest) -> Any:
    """Export filing records as Excel based on export group config."""
    from app.services.export import generate_export

    filters = {}
    if body.carrier:
        filters["carrier"] = body.carrier
    if body.status:
        filters["status"] = body.status
    if body.enterprise_name:
        filters["enterprise_name"] = body.enterprise_name
    if body.province:
        filters["province"] = body.province
    if body.business_type:
        filters["business_type"] = body.business_type

    output = generate_export(session, body.export_group_id, filters)

    from datetime import date
    filename = f"filing_records_{date.today().isoformat()}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

In the imports section, add:
```python
from sqlmodel import SQLModel
```

- [ ] **Step 3: Create services __init__.py**

```python
# Create backend/app/services/__init__.py (empty)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/ backend/app/api/routes/records.py
git commit -m "feat: add Excel export service with export group field configuration"
```

---

### Task 15: Create Excel import service (upload/preview + confirm)

**Files:**
- Create: `backend/app/services/import_service.py`
- Modify: `backend/app/api/routes/records.py`

**Interfaces:**
- Produces:
  - `POST /api/v1/records/import/upload` — multipart upload, returns `{ headers, preview_rows, image_columns, total_rows, image_count, file_token }`
  - `POST /api/v1/records/import/confirm` — accepts `{ file_token, field_mapping }`, returns `{ success_count, error_count, errors }`

- [ ] **Step 1: Write the import service**

```python
"""Excel import service with embedded image extraction."""
import hashlib
import io
import json
import os
import tempfile
import uuid
from datetime import date
from pathlib import Path
from typing import Any

import openpyxl
from sqlmodel import Session

from app.core.config import settings
from app.core.storage import get_storage


def parse_excel_preview(file_content: bytes, filename: str) -> dict[str, Any]:
    """Step 1: Parse uploaded Excel and return headers + preview + image info.
    
    Returns dict with:
      - headers: list[str] — column headers from row 1
      - preview_rows: list[list] — first 20 data rows (cell values)
      - image_columns: dict[int, str] — {col_index: "column_name"} for columns with images
      - total_rows: int — total data rows (excluding header)
      - image_count: int — total embedded images found
      - file_token: str — token to reference the temp file for confirm step
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
    ws = wb.active

    # Extract headers (row 1)
    headers = [str(cell.value) if cell.value is not None else "" for cell in next(ws.iter_rows(min_row=1, max_row=1))]

    # Build (row, col) -> image mapping
    image_map: dict[tuple[int, int], list[bytes]] = {}
    image_count = 0

    try:
        for image in ws._images:
            row = image.anchor._from.row + 1  # 1-based
            col = image.anchor._from.col + 1
            img_data = image._data()
            image_map.setdefault((row, col), []).append(img_data)
            image_count += 1
    except Exception:
        pass

    # Detect which columns have images in the first 20 rows
    image_columns: dict[int, str] = {}
    for (row, col), imgs in image_map.items():
        if row <= 21 and col <= len(headers):
            image_columns[col] = headers[col - 1] if col <= len(headers) else f"列{col}"

    # Read preview rows (rows 2-21)
    preview_rows: list[list] = []
    total_rows = ws.max_row - 1  # Exclude header
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, max_row=min(21, ws.max_row), values_only=True), start=2):
        cells = []
        for col_idx, cell_value in enumerate(row, start=1):
            has_image = (row_idx, col_idx) in image_map
            cells.append({
                "value": str(cell_value) if cell_value is not None else "",
                "has_image": has_image,
            })
        preview_rows.append(cells)

    # Save temp file for confirm step
    temp_dir = Path(settings.LOCAL_STORAGE_DIR) / "imports"
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_token = uuid.uuid4().hex
    temp_path = temp_dir / f"{file_token}.xlsx"
    temp_path.write_bytes(file_content)

    wb.close()
    return {
        "headers": headers,
        "preview_rows": preview_rows,
        "image_columns": image_columns,
        "total_rows": total_rows,
        "image_count": image_count,
        "file_token": file_token,
    }


def confirm_import(
    session: Session,
    file_token: str,
    field_mapping: dict[str, str],
    operator_id: uuid.UUID | None,
) -> dict[str, Any]:
    """Step 2: Confirm import with field mapping. Process rows in batches.
    
    field_mapping: {column_index: "field_name"} — maps Excel column to target field name
    
    Returns: {success_count, error_count, errors: [{row, message}]}
    """
    temp_dir = Path(settings.LOCAL_STORAGE_DIR) / "imports"
    temp_path = temp_dir / f"{file_token}.xlsx"
    if not temp_path.exists():
        raise FileNotFoundError("Import file expired, please re-upload")

    wb = openpyxl.load_workbook(str(temp_path))
    ws = wb.active

    # Build image map
    image_map: dict[tuple[int, int], list[bytes]] = {}
    try:
        for image in ws._images:
            row = image.anchor._from.row + 1
            col = image.anchor._from.col + 1
            image_map.setdefault((row, col), []).append(image._data())
    except Exception:
        pass

    # Parse field_mapping keys to int (Excel column index -> field name)
    col_to_field: dict[int, str] = {}
    pi_fields = {
        "carrier", "operation_type", "main_port_number", "sub_port_number", "port_range",
        "province", "city", "port_type", "port_activation_date", "allow_self_extension",
        "business_attribute", "business_type", "business_subtype", "specific_usage",
        "sms_signature", "is_gateway_signature", "carrier_room", "enterprise_room",
        "has_authorization", "auth_start_date", "auth_end_date", "sms_template_content",
    }
    qi_fields = {
        "submit_unit", "carrier_enterprise_id", "enterprise_name", "cert_type",
        "cert_number", "app_platform_name", "group_code", "responsible_name",
        "responsible_cert_type", "responsible_cert_number", "responsible_phone",
        "handler_name", "handler_cert_type", "handler_cert_number", "handler_phone",
    }

    for col_str, field_name in field_mapping.items():
        col_to_field[int(col_str)] = field_name

    import_batch = f"IMP-{date.today().isoformat()}-{uuid.uuid4().hex[:8]}"
    storage = get_storage()
    success_count = 0
    errors: list[dict] = []

    from app.models import PortInfo, QualificationInfo, FilingRecord, FileAttachment, FileAttachmentCreate
    from app.crud.file_attachment import create_file_attachment

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    batch_size = 200

    for batch_start in range(0, len(rows), batch_size):
        batch_rows = rows[batch_start:batch_start + batch_size]
        for row_offset, row in enumerate(batch_rows):
            row_idx = batch_start + row_offset + 2  # 1-based, header is row 1
            try:
                pi_data: dict[str, Any] = {}
                qi_data: dict[str, Any] = {}
                image_attachments: list[tuple[int, bytes]] = []  # (col_idx, img_bytes)

                for col_idx, field_name in col_to_field.items():
                    cell_value = row[col_idx - 1] if col_idx <= len(row) else None

                    # Check for images at this cell
                    if (row_idx, col_idx) in image_map:
                        for img_data in image_map[(row_idx, col_idx)]:
                            image_attachments.append((col_idx, img_data))

                    value = str(cell_value).strip() if cell_value is not None else ""

                    if field_name in pi_fields:
                        pi_data[field_name] = value
                    elif field_name in qi_fields:
                        qi_data[field_name] = value

                # Create port_info
                pi = PortInfo(**pi_data)
                session.add(pi)
                session.flush()

                # Create qualification_info
                qi = QualificationInfo(**qi_data)
                session.add(qi)
                session.flush()

                # Generate record number
                from app.crud.record import _record_number_sequence
                seq = _record_number_sequence(session)
                record_number = f"REC-{date.today().strftime('%Y%m%d')}-{seq:04d}"

                fr = FilingRecord(
                    record_number=record_number,
                    status="已报备",
                    port_info_id=pi.id,
                    qualification_info_id=qi.id,
                    operator_id=operator_id,
                    import_batch=import_batch,
                    source_file=temp_path.name,
                )
                session.add(fr)
                session.flush()

                # Upload images to storage and create file_attachment records
                for img_col, img_data in image_attachments:
                    md5_hash = hashlib.md5(img_data).hexdigest()
                    ext = ".png"
                    key = f"images/{date.today().isoformat()}/{uuid.uuid4().hex}{ext}"
                    storage.upload(key, img_data, "image/png")

                    fa = FileAttachmentCreate(
                        original_name=f"cell_{row_idx}_{img_col}{ext}",
                        stored_path=key,
                        file_size=len(img_data),
                        mime_type="image/png",
                        md5_hash=md5_hash,
                        entity_type="port_info",
                        entity_id=pi.id,
                    )
                    create_file_attachment(session=session, create=fa, uploader_id=operator_id)

                success_count += 1

            except Exception as e:
                errors.append({"row": row_idx, "message": str(e)})

        session.commit()

    wb.close()

    # Clean up temp file
    try:
        temp_path.unlink()
    except Exception:
        pass

    return {
        "success_count": success_count,
        "error_count": len(errors),
        "errors": errors,
        "import_batch": import_batch,
    }
```

- [ ] **Step 2: Add import endpoints to records route**

```python
# Add to backend/app/api/routes/records.py:

from fastapi import UploadFile, File
from pydantic import BaseModel

class ImportConfirmRequest(BaseModel):
    file_token: str
    field_mapping: dict[str, str]  # {col_index: field_name}


@router.post("/import/upload")
def import_upload(
    *, session: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)
) -> Any:
    """Upload Excel file for preview before import."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit")

    from app.services.import_service import parse_excel_preview
    result = parse_excel_preview(content, file.filename)
    return result


@router.post("/import/confirm")
def import_confirm(
    *, session: SessionDep, current_user: CurrentUser, body: ImportConfirmRequest
) -> Any:
    """Confirm import with field mapping. Writes data to database."""
    from app.services.import_service import confirm_import
    result = confirm_import(
        session=session,
        file_token=body.file_token,
        field_mapping=body.field_mapping,
        operator_id=current_user.id,
    )
    return result
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/import_service.py backend/app/api/routes/records.py
git commit -m "feat: add two-step Excel import with embedded image extraction"
```

---

### Task 16: Create Dashboard CRUD and API routes

**Files:**
- Create: `backend/app/crud/dashboard.py`
- Create: `backend/app/api/routes/dashboard.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
  - `GET /api/v1/dashboard/stats` — `{ total_records, new_this_month, updated_this_month, inactive_count }`
  - `GET /api/v1/dashboard/trends?days=30` — `[{ date, count }]`
  - `GET /api/v1/dashboard/carrier-dist` — `[{ carrier, count }]`
  - `GET /api/v1/dashboard/status-dist` — `[{ status, count }]`
  - `GET /api/v1/dashboard/recent-changes?limit=10` — `FilingRecordPublic[]`

- [ ] **Step 1: Write the dashboard CRUD**

```python
"""Dashboard CRUD — aggregate queries for statistics and charts."""
from datetime import date, datetime, timezone, timedelta
from typing import Any

from sqlmodel import Session, func, select, text

from app.models import FilingRecord, PortInfo, MainPort, SubPort


def get_stats(session: Session) -> dict[str, Any]:
    """Get dashboard overview statistics."""
    total = session.exec(select(func.count()).select_from(FilingRecord)).one()
    
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    new_this_month = session.exec(
        select(func.count()).select_from(FilingRecord).where(
            FilingRecord.created_at >= month_start
        )
    ).one()

    updated_this_month = session.exec(
        select(func.count()).select_from(FilingRecord).where(
            FilingRecord.updated_at >= month_start,
            FilingRecord.created_at < month_start,
        )
    ).one()

    expiring_soon = session.exec(
        select(func.count()).select_from(FilingRecord).join(PortInfo).where(
            PortInfo.auth_end_date <= date.today() + timedelta(days=30),
            PortInfo.auth_end_date >= date.today(),
        )
    ).one()

    main_port_count = session.exec(select(func.count()).select_from(MainPort)).one()
    sub_port_count = session.exec(select(func.count()).select_from(SubPort)).one()

    return {
        "total_records": total,
        "new_this_month": new_this_month,
        "updated_this_month": updated_this_month,
        "expiring_soon": expiring_soon,
        "main_port_count": main_port_count,
        "sub_port_count": sub_port_count,
    }


def get_trends(session: Session, days: int = 30) -> list[dict[str, Any]]:
    """Get daily record creation trend for last N days."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Use date_trunc for daily grouping
    stmt = (
        select(
            func.date(FilingRecord.created_at).label("date"),
            func.count().label("count"),
        )
        .where(FilingRecord.created_at >= start_date)
        .group_by(func.date(FilingRecord.created_at))
        .order_by(func.date(FilingRecord.created_at))
    )
    results = session.exec(stmt).all()
    
    # Fill in missing dates with zero
    trend_map = {str(r[0]): r[1] for r in results}
    filled = []
    for i in range(days):
        d = (date.today() - timedelta(days=days - 1 - i)).isoformat()
        filled.append({"date": d, "count": trend_map.get(d, 0)})
    
    return filled


def get_carrier_distribution(session: Session) -> list[dict[str, Any]]:
    """Get record count distribution by carrier."""
    stmt = (
        select(PortInfo.carrier, func.count())
        .join(FilingRecord, FilingRecord.port_info_id == PortInfo.id)
        .group_by(PortInfo.carrier)
    )
    results = session.exec(stmt).all()
    return [{"carrier": r[0] or "未知", "count": r[1]} for r in results]


def get_status_distribution(session: Session) -> list[dict[str, Any]]:
    """Get record count distribution by status."""
    stmt = (
        select(FilingRecord.status, func.count())
        .group_by(FilingRecord.status)
    )
    results = session.exec(stmt).all()
    return [{"status": r[0] or "未知", "count": r[1]} for r in results]


def get_recent_changes(session: Session, limit: int = 10) -> list[FilingRecord]:
    """Get most recently modified filing records."""
    stmt = (
        select(FilingRecord)
        .order_by(FilingRecord.updated_at.desc())
        .limit(limit)
    )
    return list(session.exec(stmt).all())
```

- [ ] **Step 2: Write the dashboard route**

```python
"""Dashboard API routes — statistics, trends, and distributions."""
from typing import Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.crud.dashboard import (
    get_stats,
    get_trends,
    get_carrier_distribution,
    get_status_distribution,
    get_recent_changes,
)
from app.models import FilingRecordPublic, PortInfoPublic, QualificationInfoPublic

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _record_to_public(db_obj) -> FilingRecordPublic:
    pi_data = PortInfoPublic.model_validate(db_obj.port_info).model_dump() if db_obj.port_info else None
    qi_data = QualificationInfoPublic.model_validate(db_obj.qualification_info).model_dump() if db_obj.qualification_info else None

    return FilingRecordPublic(
        id=db_obj.id,
        record_number=db_obj.record_number,
        status=db_obj.status,
        source_file=db_obj.source_file,
        import_batch=db_obj.import_batch,
        port_info_id=db_obj.port_info_id,
        qualification_info_id=db_obj.qualification_info_id,
        operator_id=db_obj.operator_id,
        created_at=db_obj.created_at,
        updated_at=db_obj.updated_at,
        port_info=PortInfoPublic(**pi_data) if pi_data else None,
        qualification_info=QualificationInfoPublic(**qi_data) if qi_data else None,
    )


@router.get("/stats")
def dashboard_stats(session: SessionDep) -> Any:
    return get_stats(session)


@router.get("/trends")
def dashboard_trends(session: SessionDep, days: int = Query(30, ge=1, le=365)) -> Any:
    return get_trends(session, days=days)


@router.get("/carrier-dist")
def dashboard_carrier_dist(session: SessionDep) -> Any:
    return get_carrier_distribution(session)


@router.get("/status-dist")
def dashboard_status_dist(session: SessionDep) -> Any:
    return get_status_distribution(session)


@router.get("/recent-changes")
def dashboard_recent_changes(session: SessionDep, limit: int = Query(10, ge=1, le=50)) -> Any:
    records = get_recent_changes(session, limit=limit)
    return [_record_to_public(r) for r in records]
```

- [ ] **Step 3: Register in api/main.py**

```python
# Add import:
from app.api.routes import dashboard

# Add router:
api_router.include_router(dashboard.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/crud/dashboard.py backend/app/api/routes/dashboard.py backend/app/api/main.py
git commit -m "feat: add dashboard statistics, trends, and distribution API"
```

---

### Task 17: Create API access config CRUD + API routes

**Files:**
- Create: `backend/app/crud/api_access.py`
- Create: `backend/app/api/routes/api_access.py`
- Modify: `backend/app/api/main.py`

**Interfaces:**
- Produces:
  - `GET /api/v1/api-access` — config list
  - `POST /api/v1/api-access` — create config
  - `PATCH /api/v1/api-access/{id}` — update config
  - `DELETE /api/v1/api-access/{id}` — delete config
  - `GET /api/v1/api-access/{id}/data` — display API data (read-only placeholder)

- [ ] **Step 1: Write the api_access CRUD**

```python
"""CRUD operations for API access configurations."""
import uuid

from sqlmodel import Session, select

from app.models import ApiAccessConfig, ApiAccessConfigCreate, ApiAccessConfigUpdate


def create_api_access_config(*, session: Session, create: ApiAccessConfigCreate) -> ApiAccessConfig:
    db_obj = ApiAccessConfig.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_api_access_config(*, session: Session, id: uuid.UUID) -> ApiAccessConfig | None:
    return session.get(ApiAccessConfig, id)


def list_api_access_configs(*, session: Session) -> list[ApiAccessConfig]:
    return list(session.exec(
        select(ApiAccessConfig).order_by(ApiAccessConfig.created_at.desc())
    ).all())


def update_api_access_config(
    *, session: Session, db_obj: ApiAccessConfig, update: ApiAccessConfigUpdate
) -> ApiAccessConfig:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_api_access_config(*, session: Session, db_obj: ApiAccessConfig) -> None:
    session.delete(db_obj)
    session.commit()
```

- [ ] **Step 2: Write the api_access route**

```python
"""Third-party API access configuration routes."""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.api_access import (
    create_api_access_config,
    delete_api_access_config,
    get_api_access_config,
    list_api_access_configs,
    update_api_access_config,
)
from app.models import (
    ApiAccessConfigCreate,
    ApiAccessConfigPublic,
    ApiAccessConfigsPublic,
    ApiAccessConfigUpdate,
    Message,
)

router = APIRouter(
    prefix="/api-access",
    tags=["api-access"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("", response_model=ApiAccessConfigsPublic)
@router.get("/", include_in_schema=False, response_model=ApiAccessConfigsPublic)
def read_api_access_configs(session: SessionDep) -> Any:
    configs = list_api_access_configs(session=session)
    return ApiAccessConfigsPublic(data=configs, count=len(configs))


@router.post("", response_model=ApiAccessConfigPublic)
@router.post("/", include_in_schema=False, response_model=ApiAccessConfigPublic)
def create_api_endpoint(*, session: SessionDep, create: ApiAccessConfigCreate) -> Any:
    return create_api_access_config(session=session, create=create)


@router.get("/{id}", response_model=ApiAccessConfigPublic)
def read_api_access_config(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    return db_obj


@router.patch("/{id}", response_model=ApiAccessConfigPublic)
def update_api_endpoint(*, session: SessionDep, id: uuid.UUID, update: ApiAccessConfigUpdate) -> Any:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    return update_api_access_config(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}")
def delete_api_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")
    delete_api_access_config(session=session, db_obj=db_obj)
    return Message(message="API接入配置删除成功")


@router.get("/{id}/data")
def read_api_access_data(
    *, session: SessionDep, id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Any:
    """Display API access data (placeholder — returns empty dataset for now)."""
    db_obj = get_api_access_config(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="API接入配置不存在")

    return {
        "data": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
        "config": db_obj,
    }
```

- [ ] **Step 3: Register in api/main.py**

```python
# Add import:
from app.api.routes import api_access

# Add router:
api_router.include_router(api_access.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/crud/api_access.py backend/app/api/routes/api_access.py backend/app/api/main.py
git commit -m "feat: add third-party API access configuration and data display endpoints"
```

---

### Task 18: Create services __init__.py

**Files:**
- Create: `backend/app/services/__init__.py`

- [ ] **Step 1: Create empty init file**

```python
"""Services package."""
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/__init__.py
git commit -m "chore: add services package init"
```

---

### Task 19: Verify all routes register and app starts

**Files:** (none modified)

- [ ] **Step 1: Start the backend and verify all routes**

Run: `cd backend && timeout 10 fastapi dev app/main.py 2>&1 || true`
Expected: Server starts without import errors

- [ ] **Step 2: Verify API docs loads**

Run: `cd backend && python -c "
from app.main import app
routes = [r.path for r in app.routes]
expected = ['/api/v1/dashboard/stats', '/api/v1/records', '/api/v1/ports/main', '/api/v1/export-groups', '/api/v1/files/upload', '/api/v1/api-access']
for e in expected:
    found = any(e in r for r in routes)
    print(f'  {e}: {\"OK\" if found else \"MISSING\"}')"`
Expected: All routes show OK

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify all backend routes register correctly"
```

---

### Task 20: Update frontend API integration — replace mock data with real API calls

**Files:**
- Modify: `frontend/src/lib/api/records.ts`
- Modify: `frontend/src/lib/api/ports.ts`
- Modify: `frontend/src/lib/api/dashboard.ts`

**Interfaces:**
- Consumes: Backend API endpoints from Tasks 10, 12, 14, 15, 16, 17
- Produces: Frontend API functions call real backend endpoints instead of mock data

- [ ] **Step 1: Update records API**

```typescript
// Add to frontend/src/lib/api/records.ts:

export interface ImportUploadResponse {
  headers: string[]
  preview_rows: { value: string; has_image: boolean }[][]
  image_columns: Record<number, string>
  total_rows: number
  image_count: number
  file_token: string
}

export interface ImportConfirmRequest {
  file_token: string
  field_mapping: Record<string, string>
}

export interface ImportConfirmResponse {
  success_count: number
  error_count: number
  errors: { row: number; message: string }[]
  import_batch: string
}

// Upload Excel for preview
export const uploadImport = async (file: File): Promise<ImportUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/records/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// Confirm import
export const confirmImport = async (body: ImportConfirmRequest): Promise<ImportConfirmResponse> => {
  const response = await api.post('/api/v1/records/import/confirm', body)
  return response.data
}

// Export records
export const exportRecords = async (body: {
  export_group_id: string
  carrier?: string
  status?: string
}): Promise<Blob> => {
  const response = await api.post('/api/v1/records/export', body, {
    responseType: 'blob',
  })
  return response.data
}
```

- [ ] **Step 2: Update ports API — add mutation endpoints**

```typescript
// Add to frontend/src/lib/api/ports.ts:

export const createMainPort = async (data: Partial<MainPort>): Promise<MainPort> => {
  const response = await api.post('/api/v1/ports/main', data)
  return response.data
}

export const updateMainPort = async (id: string, data: Partial<MainPort>): Promise<MainPort> => {
  const response = await api.patch(`/api/v1/ports/main/${id}`, data)
  return response.data
}

export const deleteMainPort = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/ports/main/${id}`)
}

export const createSubPort = async (data: Partial<SubPort>): Promise<SubPort> => {
  const response = await api.post('/api/v1/ports/sub', data)
  return response.data
}

export const updateSubPort = async (id: string, data: Partial<SubPort>): Promise<SubPort> => {
  const response = await api.patch(`/api/v1/ports/sub/${id}`, data)
  return response.data
}

export const deleteSubPort = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/ports/sub/${id}`)
}
```

- [ ] **Step 3: Update dashboard API**

```typescript
// Add to frontend/src/lib/api/dashboard.ts:

export const fetchDashboardStats = async () => {
  const response = await api.get('/api/v1/dashboard/stats')
  return response.data
}

export const fetchDashboardTrends = async (days: number = 30) => {
  const response = await api.get('/api/v1/dashboard/trends', { params: { days } })
  return response.data
}

export const fetchCarrierDistribution = async () => {
  const response = await api.get('/api/v1/dashboard/carrier-dist')
  return response.data
}

export const fetchStatusDistribution = async () => {
  const response = await api.get('/api/v1/dashboard/status-dist')
  return response.data
}

export const fetchRecentChanges = async (limit: number = 10) => {
  const response = await api.get('/api/v1/dashboard/recent-changes', { params: { limit } })
  return response.data
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/
git commit -m "feat: update frontend API layer with real backend endpoints"
```

---

## Plan Summary

**20 tasks** across 7 development phases. Total estimated: ~4-6 hours of focused work.

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1. Infrastructure | 1-8 | Dependencies, models, migration, storage, file CRUD, MinIO |
| 2. Port Management | 9-10 | main_port/sub_port CRUD + API |
| 3. Qualification Mgmt | 11-12 | filing_record CRUD + API with 3-table joins |
| 4. Export | 13-14 | Export groups + Excel export service |
| 5. Import | 15 | Two-step Excel import with image extraction |
| 6. Dashboard | 16 | Stats, trends, distributions API |
| 7. API Access + Frontend | 17-20 | API config CRUD, frontend API integration |
