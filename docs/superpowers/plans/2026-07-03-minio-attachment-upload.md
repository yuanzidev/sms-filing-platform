# MinIO 生产启用 + 前端附件上传/下载对接 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后端启用 MinIO 生产存储 + 前端附件上传/下载/预览功能完整对接

**Architecture:** 后端已有存储抽象层（LocalFileStorage / MinioStorage）和文件 CRUD API，本次补权限、补环境变量、记录详情返回附件列表。前端新建 files API 模块，改造 3 个组件从占位代码到真实文件操作。

**Tech Stack:** FastAPI, SQLModel, boto3 (MinIO), React, TypeScript, TanStack Query, ShadcnUI

## Global Constraints

- STORAGE_BACKEND 默认 minio 仅在 docker-compose 生产环境，本地开发仍用 local
- 文件上传权限：所有登录用户，不再限制 superuser
- 上传策略：选文件立即上传，表单只存 file ID

---

### Task 1: 放宽文件上传/删除权限

**Files:**
- Modify: `backend/app/api/routes/files.py`

**Interfaces:**
- Produces: `POST /files/upload` 和 `DELETE /files/{id}` 权限从 superuser 降为普通用户

- [ ] **Step 1: 修改 files.py 将两个端点的权限依赖从 superuser 改为当前用户**

编辑 `backend/app/api/routes/files.py`：

第 18 行，将：
```python
@router.post("/upload", dependencies=[Depends(get_current_active_superuser)])
```
改为：
```python
@router.post("/upload")
```

同时需要将 `CurrentUser` 注入到函数签名中。第 19-26 行，函数签名原来没有 `current_user` 参数，但函数体内使用了 `current_user.id`（第 60 行 `uploader_id=current_user.id`），说明函数体需要 `CurrentUser` 依赖。查看当前函数签名，确认它已经有 `current_user: CurrentUser`。

实际情况：当前签名是 `def upload_file(*, session: SessionDep, current_user: CurrentUser, file: UploadFile, ...)`，路由装饰器通过 `dependencies` 检查 superuser，同时函数参数中注入了 `CurrentUser`。只需要移除装饰器的 `dependencies=[Depends(get_current_active_superuser)]` 即可，函数参数中的 `current_user: CurrentUser` 保持不变。

第 92 行，将：
```python
@router.delete("/{id}", dependencies=[Depends(get_current_active_superuser)])
```
改为：
```python
@router.delete("/{id}")
```

- [ ] **Step 2: 验证后端启动正常**

```bash
cd backend && uv run python -c "from app.api.routes.files import router; print('OK')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/api/routes/files.py
git commit -m "fix: relax file upload/delete permission from superuser to all active users"
```

---

### Task 2: Docker Compose 后端容器添加 MinIO 环境变量

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: 在 backend 服务的 environment 中添加 MinIO 变量**

编辑 `docker-compose.yml`，在 backend 服务的 environment 块末尾（第 54 行 `SENTRY_DSN` 之后）添加：

```yaml
      # MinIO / S3-compatible object storage
      MINIO_ENDPOINT: ${MINIO_ENDPOINT:-minio:9000}
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY:-sms_filing}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY:-changethis}
      MINIO_BUCKET: ${MINIO_BUCKET:-sms-filing}
      STORAGE_BACKEND: ${STORAGE_BACKEND:-minio}
```

注意：docker-compose 中 MinIO 服务名为 `minio`，容器内网络中通过 `minio:9000` 访问。

- [ ] **Step 2: 提交**

```bash
git add docker-compose.yml
git commit -m "feat: add MinIO environment variables to backend service in docker-compose"
```

---

### Task 3: 记录详情 API 返回附件列表

**Files:**
- Modify: `backend/app/models/filing_record.py`
- Modify: `backend/app/services/__init__.py`
- Modify: `backend/app/api/routes/records.py`

**Interfaces:**
- Produces: `FilingRecordPublic` 新增 `attachments: list[FileAttachmentPublic]` 字段
- Produces: `GET /records/{id}` 返回体包含附件列表

- [ ] **Step 1: 在 FilingRecordPublic 中添加 attachments 字段**

编辑 `backend/app/models/filing_record.py`，在 `FilingRecordPublic` 类（约第 46 行）中添加附件字段。先看一下 imports，确保 `FileAttachmentPublic` 可用。

查看文件头部 imports，需要添加 `FileAttachmentPublic` 的导入。`backend/app/models/__init__.py` 已经导出了 `FileAttachmentPublic`，所以可以从 `app.models` 导入。

在 `FilingRecordPublic` 的 `qualification_info` 字段后添加：

```python
    attachments: list[Any] = []
```

注：使用 `list[Any]` 并在 `record_to_public` 中填充，避免在 model 层引入 `FileAttachmentPublic` 的循环导入风险。实际序列化时由 Pydantic 处理。

或者，更简洁的做法是在 `record_to_public` 中直接添加 attachments，而不改 `FilingRecordPublic` 模型——但这需要模型支持 extra 字段。更好的做法：

在 `FilingRecordPublic` 中添加字段：

```python
    attachments: list[Any] = []
```

并在 `from typing import Any` 中确认 `Any` 已导入。查看文件头部，当前没有 `Any` 导入。

编辑 `backend/app/models/filing_record.py`，在 imports 中添加 `Any`，并在 `FilingRecordPublic` 中添加字段：

```python
# 文件头部 import 区（第 3 行附近），确保有 Any：
from typing import Any
```

实际上当前 imports 只有：
```python
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel
```

需要添加 `Any`。

完整修改：

1. 第 1 行后添加：`from typing import Any`
2. `FilingRecordPublic` 类中，`qualification_info` 字段后添加：
```python
    attachments: list[Any] = []
```

- [ ] **Step 2: 修改 record_to_public 填充 attachments**

编辑 `backend/app/services/__init__.py`，修改 `record_to_public` 函数，添加 session 参数（注意：这会改变函数签名）。

但这样会影响现有的调用方（`records.py` 中的 `read_record` 和 `update_record`）。

更好的做法：不在 `record_to_public` 中处理，而是在 `read_record` 端点中单独查询附件并合并到返回体。

编辑 `backend/app/api/routes/records.py` 中的 `read_record` 函数（约第 64 行）：

当前代码：
```python
def read_record(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    return record_to_public(db_obj)
```

改为：
```python
def read_record(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_filing_record(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="报备记录不存在")
    result = record_to_public(db_obj)
    attachments = get_file_attachments_by_entity(
        session=session, entity_type="filing_record", entity_id=id
    )
    result.attachments = [
        {
            "id": fa.id,
            "original_name": fa.original_name,
            "stored_path": fa.stored_path,
            "file_size": fa.file_size,
            "mime_type": fa.mime_type,
            "md5_hash": fa.md5_hash,
            "entity_type": fa.entity_type,
            "entity_id": str(fa.entity_id),
            "uploader_id": str(fa.uploader_id) if fa.uploader_id else None,
            "created_at": fa.created_at.isoformat(),
        }
        for fa in attachments
    ]
    return result
```

文件已经 import 了 `get_file_attachments_by_entity`（第 19 行），所以无需改 import。

- [ ] **Step 3: 提交**

```bash
git add backend/app/models/filing_record.py backend/app/api/routes/records.py
git commit -m "feat: include attachments in filing record detail response"
```

---

### Task 4: 前端新增 FileAttachmentPublic 类型和 files API 模块

**Files:**
- Create: `frontend/src/lib/api/files.ts`
- Modify: `frontend/src/lib/api/types.ts`

**Interfaces:**
- Produces: `FileAttachmentPublic` type, `uploadFile()`, `getFileUrl()`, `deleteFile()` functions

- [ ] **Step 1: 在 types.ts 中添加 FileAttachmentPublic 类型**

编辑 `frontend/src/lib/api/types.ts`，在文件末尾添加：

```typescript
// ─── File Attachments ──────────────────────────────────────

export interface FileAttachmentPublic {
  id: string
  original_name: string
  stored_path: string
  file_size: number
  mime_type: string
  md5_hash: string
  entity_type: string
  entity_id: string
  uploader_id: string | null
  created_at: string
}
```

- [ ] **Step 2: 创建 files API 模块**

创建 `frontend/src/lib/api/files.ts`：

```typescript
import api from '../api'
import type { FileAttachmentPublic } from './types'

/**
 * 上传文件（选文件立即上传）
 */
export const uploadFile = async (
  file: File,
  entityType: string,
  entityId: string,
): Promise<FileAttachmentPublic> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity_type', entityType)
  formData.append('entity_id', entityId)

  const response = await api.post('/api/v1/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return response.data
}

/**
 * 获取文件下载 URL（跟随重定向获取 presigned URL）
 */
export const getFileUrl = async (id: string): Promise<string> => {
  const response = await api.get(`/api/v1/files/${id}`, {
    maxRedirects: 0,
    validateStatus: (status) => status === 307,
  })
  return response.headers['location'] || `/api/v1/files/${id}/download`
}

/**
 * 删除文件
 */
export const deleteFile = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/files/${id}`)
  return response.data
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/lib/api/types.ts frontend/src/lib/api/files.ts
git commit -m "feat: add FileAttachmentPublic type and files API module"
```

---

### Task 5: 改造 FileUploadGroup 为真实上传/删除

**Files:**
- Modify: `frontend/src/components/shared/file-upload-group.tsx`

**Interfaces:**
- Consumes: `FileAttachmentPublic` from Task 4
- Produces: `FileUploadGroup` 组件支持真实文件上传/删除

- [ ] **Step 1: 替换 FileUploadGroup 组件实现**

重写 `frontend/src/components/shared/file-upload-group.tsx`：

```tsx
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, FileText, Download } from 'lucide-react'
import { uploadFile, deleteFile, getFileUrl } from '@/lib/api/files'
import type { FileAttachmentPublic } from '@/lib/api/types'

interface FileUploadGroupProps {
  files: FileAttachmentPublic[]
  entityType: string
  entityId: string
  onUploaded: (file: FileAttachmentPublic) => void
  onRemoved: (id: string) => void
}

export function FileUploadGroup({
  files,
  entityType,
  entityId,
  onUploaded,
  onRemoved,
}: FileUploadGroupProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImage = (mime: string) => mime.startsWith('image/')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadFile(file, entityType, entityId)
      onUploaded(result)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (item: FileAttachmentPublic) => {
    try {
      await deleteFile(item.id)
      onRemoved(item.id)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '删除失败')
    }
  }

  const handleDownload = (item: FileAttachmentPublic) => {
    getFileUrl(item.id).then((url) => window.open(url, '_blank'))
  }

  if (files.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">暂无附件</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          上传附件
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {files.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border px-4 py-3"
          >
            {isImage(item.mime_type) ? (
              <FileThumbnail file={item} />
            ) : (
              <FileText className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.original_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(item.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(item)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(item)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        上传附件
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function FileThumbnail({ file }: { file: FileAttachmentPublic }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getFileUrl(file.id).then(setUrl).catch(() => setFailed(true))
  }, [file.id])

  if (failed || !url) {
    return <div className="h-14 w-14 rounded bg-muted animate-pulse" />
  }

  return (
    <img
      src={url}
      alt={file.original_name}
      className="h-14 w-14 rounded object-cover"
      onError={() => setFailed(true)}
    />
  )
}
```

- [ ] **Step 2: 更新 shared 组件导出**

编辑 `frontend/src/components/shared/index.ts`，确认 `FileUploadGroup` 在导出列表中。如果之前导出的是旧的 `AttachmentItem` 类型，需要更新。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/shared/file-upload-group.tsx frontend/src/components/shared/index.ts
git commit -m "feat: wire up FileUploadGroup with real upload/delete using files API"
```

---

### Task 6: 改造 AttachmentsTab 展示附件列表

**Files:**
- Modify: `frontend/src/features/records/components/record-detail/tabs/attachments-tab.tsx`

**Interfaces:**
- Consumes: `FilingRecord` (with `attachments` field), `FileUploadGroup` from Task 5

- [ ] **Step 1: 更新 types.ts 中 FilingRecord 添加 attachments 字段**

编辑 `frontend/src/lib/api/types.ts`，在 `FilingRecord` 接口中添加：

```typescript
  attachments?: FileAttachmentPublic[]
```

由于 `FileAttachmentPublic` 定义在同一文件中，直接在 `qualification_info` 字段后添加即可。

- [ ] **Step 2: 重写 AttachmentsTab 组件**

重写 `frontend/src/features/records/components/record-detail/tabs/attachments-tab.tsx`：

```tsx
import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadGroup } from '@/components/shared/file-upload-group'

interface Props { record: FilingRecord; onAttachmentsChange: () => void }

export function AttachmentsTab({ record, onAttachmentsChange }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>附件</CardTitle></CardHeader>
      <CardContent>
        <FileUploadGroup
          files={record.attachments ?? []}
          entityType="filing_record"
          entityId={record.id}
          onUploaded={() => onAttachmentsChange()}
          onRemoved={() => onAttachmentsChange()}
        />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: 更新父组件 record-detail.tsx 以支持刷新**

需要确认 `record-detail.tsx` 中 `AttachmentsTab` 的使用方式。如果 record 数据来自 TanStack Query，`onAttachmentsChange` 应触发 query invalidation。

编辑 `frontend/src/features/records/components/record-detail/record-detail.tsx`，找到 `AttachmentsTab` 的使用处，确保传入 `onAttachmentsChange` prop 并触发 refetch：

```tsx
const queryClient = useQueryClient()
// ...
<AttachmentsTab
  record={record}
  onAttachmentsChange={() => {
    queryClient.invalidateQueries({ queryKey: ['record', record.id] })
  }}
/>
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/lib/api/types.ts frontend/src/features/records/components/record-detail/tabs/attachments-tab.tsx frontend/src/features/records/components/record-detail/record-detail.tsx
git commit -m "feat: build AttachmentsTab with file list, image preview, download and delete"
```

---

### Task 7: 改造 AttachmentInfoSection 对接真实上传（表单场景）

**Files:**
- Modify: `frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx`

**Interfaces:**
- Consumes: `FileUploadGroup` from Task 5
- Note: 表单场景中文件上传是立即上传，entity_id 需要先创建记录才能上传附件。对于新建表单（记录尚未创建），附件上传需要在记录保存后或使用临时 ID。

- [ ] **Step 1: 分析表单附件上传时机**

新建报备单时，记录尚未创建，没有 `entity_id`。后端上传接口要求 `entity_id` 有效 UUID。

方案：表单场景下，先创建记录（获得 ID），再上传附件；或者上传时使用占位 UUID，保存后更新。

采用简单方案：新建时不嵌入附件上传，附件上传只在详情页（Task 6 已处理）。表单中的 `AttachmentInfoSection` 保持为只读展示（如果有附件显示列表，没有则显示提示"保存后可在详情页上传附件"）。

- [ ] **Step 2: 更新 AttachmentInfoSection**

重写 `frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx`：

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AttachmentInfoSection() {
  return (
    <Card>
      <CardHeader><CardTitle>附件信息</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          保存后可在详情页上传附件
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx
git commit -m "feat: update AttachmentInfoSection to guide users to detail page for uploads"
```

---

### Task 8: E2E 验证

- [ ] **Step 1: 启动后端并验证文件上传**

```bash
cd backend && fastapi dev app/main.py
```

- 访问 `http://localhost:8000/docs`
- `POST /api/v1/files/upload` → 上传测试文件，确认返回 200
- `GET /api/v1/files/{id}` → 确认重定向到下载 URL
- `DELETE /api/v1/files/{id}` → 确认删除

- [ ] **Step 2: 启动前端并验证附件功能**

```bash
cd frontend && pnpm run dev
```

- 进入报备记录详情页 → 附件 Tab
- 上传图片 → 确认缩略图显示
- 上传非图片文件 → 确认文件图标显示
- 点击下载 → 确认打开文件
- 点击删除 → 确认文件从列表移除

- [ ] **Step 3: TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

确认无类型错误。
