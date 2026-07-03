# MinIO 生产启用 + 前端附件上传/下载对接 设计

日期：2026-07-03

## 概述

将后端的 MinIO 对象存储部署到生产环境，并完成前端附件上传/下载/预览的完整功能对接。后端存储抽象层和文件 API 已实现，本次主要工作为：补权限、补环境变量、前端组件从占位代码改为真正对接 API。

## 一、后端变更

### 1.1 上传权限放宽

**文件：** `backend/app/api/routes/files.py`

- `POST /files/upload` — 依赖从 `get_current_active_superuser` 改为 `CurrentUser`（所有登录用户可上传）
- `DELETE /files/{id}` — 同上

### 1.2 Docker Compose 环境变量

**文件：** `docker-compose.yml`

后端服务增加 MinIO 环境变量：

```
MINIO_ENDPOINT=${MINIO_ENDPOINT:-minio:9000}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-sms_filing}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-changethis}
MINIO_BUCKET=${MINIO_BUCKET:-sms-filing}
STORAGE_BACKEND=${STORAGE_BACKEND:-minio}
```

注意：docker-compose 内 MinIO 服务名是 `minio`，容器间通过 `minio:9000` 通信。

### 1.3 记录详情返回附件列表

**文件：** `backend/app/api/routes/records.py`

`GET /records/{id}` 端点调用已有的 `get_file_attachments_by_entity` 查询 `entity_type="filing_record"` + `entity_id=record.id` 的附件，加入返回体。

## 二、前端变更

### 2.1 新增文件 API 模块

**文件：** `frontend/src/lib/api/files.ts`（新建）

```ts
uploadFile(file: File, entityType: string, entityId: string) → FileAttachmentPublic
getFileUrl(id: string) → string  // presigned URL
deleteFile(id: string) → { message: string }
```

- `uploadFile` 用 `FormData` POST 到 `/api/v1/files/upload`
- `getFileUrl` 跟随重定向获取 presigned URL
- `deleteFile` DELETE 到 `/api/v1/files/{id}`

### 2.2 改造 FileUploadGroup

**文件：** `frontend/src/components/shared/file-upload-group.tsx`

- 上传按钮点击 → 打开文件选择器 → 选中后立即 `uploadFile`
- 上传中显示 Spinner + "上传中..."
- 成功后 items 记录返回的 `FileAttachmentPublic` 数据
- 失败 toast 提示
- 删除按钮调 `deleteFile`，成功后从列表移除
- Props 改为接收 `FileAttachmentPublic[]` 而非旧的 `AttachmentItem[]`

### 2.3 改造 AttachmentsTab

**文件：** `frontend/src/features/records/components/record-detail/tabs/attachments-tab.tsx`

当前显示 "暂无附件" 占位，改为：

- 读取 record 的 `attachments` 字段（`FileAttachmentPublic[]`）
- 图片类型（`image/*`）：用 presigned URL 作为 `<img>` src 显示缩略图
- 非图片类型：文件图标 + 文件名
- 每个文件：下载按钮（打开 presigned URL）+ 删除按钮
- 支持上传新附件（内嵌 FileUploadGroup 或独立上传入口）
- 上传时 entity_type= "filing_record"，entity_id=record.id

### 2.4 改造 AttachmentInfoSection

**文件：** `frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx`

- `onUpload` / `onRemove` 从占位代码改为真实上传/删除（调用 files API）
- 表单数据中附件存储为 `FileAttachmentPublic` 数组

## 三、涉及文件清单

**后端：**
- `backend/app/api/routes/files.py` — 权限放宽
- `backend/app/api/routes/records.py` — 详情返回附件
- `docker-compose.yml` — 后端容器 MinIO 环境变量

**前端：**
- `frontend/src/lib/api/files.ts` — 新建，文件 API 调用
- `frontend/src/components/shared/file-upload-group.tsx` — 真实上传/删除
- `frontend/src/features/records/components/record-detail/tabs/attachments-tab.tsx` — 附件展示+预览
- `frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx` — 表单附件对接

## 四、测试验证

1. Docker Compose 启动后 MinIO 自动创建 bucket（代码已有 `_ensure_bucket`）
2. 后端 `/docs` Swagger UI 测试上传/下载/删除
3. 前端：新建报备单 → 上传营业执照图片 → 保存 → 详情页附件 Tab 看到缩略图
4. 前端：点击下载按钮打开 presigned URL
5. 前端：删除附件 → 刷新后不再显示
6. 确认 MinIO 控制台（9001 端口）可看到上传文件
