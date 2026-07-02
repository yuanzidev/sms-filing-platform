# 短信报备管理系统 — 后端模块设计与前后端闭环方案

## 概述

在现有前端页面的基础上，完成后端四大模块的设计与实现，打通前后端数据闭环：

1. **工作台 Dashboard** — 统计卡片、趋势图表、最近变更
2. **资质管理**（报备记录）— CRUD + 带图片 Excel 导入 + 按分组模板导出
3. **端口管理** — 主端口/码号 + 子端口/子码号管理
4. **三方 API 接入管理** — API 数据接入配置与展示

### 技术选型

- **后端框架**：FastAPI（扩展已有项目）
- **ORM**：SQLModel（SQLAlchemy + Pydantic）
- **数据库**：PostgreSQL
- **对象存储**：MinIO（S3 兼容，Docker Compose 部署，开发环境可选本地存储 fallback）
- **Excel 处理**：openpyxl（含图片提取）
- **架构**：同步单体（方案 A），预留 `BackgroundTasks` 异步扩展点

---

## 一、数据库 Schema

### 1.1 port_info — 端口信息

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| carrier | varchar(10) | idx | 移动/联通/电信 |
| operation_type | varchar(50) | | 操作类型 |
| main_port_number | varchar(100) | idx | 主端口号 |
| sub_port_number | varchar(100) | | 子端口号 |
| port_range | varchar(100) | | 码号使用范围 |
| province | varchar(50) | idx | 接入省 |
| city | varchar(50) | | 接入地市 |
| port_type | varchar(50) | | 端口类型 |
| port_activation_date | date | | 端口入网时间 |
| allow_self_extension | boolean | | 是否允许自行扩展 |
| business_attribute | varchar(50) | | 业务属性 |
| business_type | varchar(50) | idx | 业务类型 |
| business_subtype | varchar(50) | | 业务细类 |
| specific_usage | text | | 具体用途 |
| sms_signature | varchar(200) | | 短信签名 |
| is_gateway_signature | boolean | | 是否网关签名 |
| carrier_room | text | | 运营商接入机房及设备 |
| enterprise_room | text | | 企业接入机房及设备 |
| has_authorization | boolean | | 是否具有授权书 |
| auth_start_date | date | | 授权开始日期 |
| auth_end_date | date | | 授权结束日期 |
| sms_template_content | text | | 短信模板内容 |
| created_at | datetime | | |
| updated_at | datetime | | |

### 1.2 qualification_info — 资质信息

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| submit_unit | varchar(200) | | 报送单位 |
| carrier_enterprise_id | varchar(100) | | 运营商企业ID |
| enterprise_name | varchar(200) | idx | 企业名称 |
| cert_type | varchar(50) | | 单位证件类型 |
| cert_number | varchar(100) | idx | 单位证件号码 |
| app_platform_name | varchar(200) | | APP/平台名称 |
| group_code | varchar(100) | | 集团编码 |
| responsible_name | varchar(100) | | 责任人姓名 |
| responsible_cert_type | varchar(50) | | 责任人证件类型 |
| responsible_cert_number | varchar(100) | | 责任人证件号码 |
| responsible_phone | varchar(20) | | 责任人手机号 |
| handler_name | varchar(100) | | 经办人姓名 |
| handler_cert_type | varchar(50) | | 经办人证件类型 |
| handler_cert_number | varchar(100) | | 经办人证件号码 |
| handler_phone | varchar(20) | | 经办人手机号 |
| created_at | datetime | | |
| updated_at | datetime | | |

### 1.3 filing_record — 报备记录（关联表）

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| record_number | varchar(50) | unique | 报备编号 |
| port_info_id | FK→port_info | idx | 端口信息 |
| qualification_info_id | FK→qualification_info | idx | 资质信息 |
| status | varchar(20) | idx | 草稿/已报备/变更中/停用 |
| source_file | varchar(500) | | 导入来源文件名 |
| import_batch | varchar(100) | idx | 导入批次号 |
| operator_id | FK→user | | 操作人 |
| created_at | datetime | idx | |
| updated_at | datetime | | |

### 1.4 main_port — 主端口/码号

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| port_number | varchar(100) idx | 主端口号 |
| carrier | varchar(10) idx | 运营商 |
| province | varchar(50) | 归属省 |
| city | varchar(50) | 归属地市 |
| port_type | varchar(50) | 端口类型 |
| status | varchar(20) | 空闲/使用中/停用/异常 |
| created_at | datetime | |

### 1.5 sub_port — 子端口/子码号

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| port_number | varchar(100) idx | 子端口号 |
| main_port_id | FK→main_port idx | 所属主端口 |
| carrier | varchar(10) | 运营商（冗余） |
| status | varchar(20) | 空闲/已分配/已报备/停用 |
| filing_record_id | FK nullable | 关联报备记录 |
| created_at / updated_at | datetime | |

### 1.6 file_attachment — 文件/图片存储

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| original_name | varchar(500) | 原始文件名 |
| stored_path | varchar(1000) | MinIO bucket + object key |
| file_size | bigint | 字节数 |
| mime_type | varchar(100) | MIME 类型 |
| md5_hash | varchar(32) idx | 文件指纹，去重和校验 |
| entity_type | varchar(50) idx | port_info / qualification_info |
| entity_id | UUID idx | 关联实体 ID |
| uploader_id | FK→user | 上传人 |
| created_at | datetime | |

### 1.7 export_group — 导出分组模板

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | varchar(100) | 分组名称 |
| description | text | 说明 |
| created_at / updated_at | datetime | |

### 1.8 export_group_field — 分组字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| group_id | FK→export_group | 所属分组 |
| field_name | varchar(100) | 字段名 |
| field_label | varchar(100) | 显示名 |
| sort_order | int | 排序 |

### 1.9 api_access_config — 三方 API 接入配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | varchar(200) | 接入名称 |
| source_type | varchar(50) | 来源类型 |
| endpoint | varchar(500) | API 地址 |
| auth_config | jsonb | 认证配置（token/key 等） |
| field_mapping | jsonb | 字段映射规则 |
| is_active | boolean | 是否启用 |
| created_at / updated_at | datetime | |

### 性能策略

- 所有外键和常用查询字段（carrier、status、enterprise_name、created_at）建索引
- 列表接口统一 `OFFSET/LIMIT` 分页
- `filing_record` 按 `created_at` 季度分区（数据量上去后启用）
- 图片不存 DB，`file_attachment` 仅记录元数据
- 列表查询只返回必要字段，详情接口才 JOIN 关联表

---

## 二、API 接口设计

### 2.1 Dashboard — `/api/v1/dashboard`

```
GET /stats            → { total_records, new_this_month, updated_this_month, incomplete, expiring_soon }
GET /trends?days=30   → [{ date, count }]
GET /carrier-dist     → [{ carrier, count }]
GET /status-dist      → [{ status, count }]
GET /recent-changes?limit=10 → FilingRecord[]
```

### 2.2 报备记录 — `/api/v1/records`

```
GET    /                          → 分页列表（carrier/status/enterprise_name/province/business_type 等筛选）
GET    /{id}                      → 详情（含 port_info + qualification_info + 附件列表）
POST   /                          → 新建（port_info + qualification_info + filing_record 三表联动）
PATCH  /{id}                      → 更新
DELETE /{id}                      → 删除

POST   /import/upload             → 上传 Excel → 解析预览
POST   /import/confirm            → 确认导入 → 批量写入
POST   /export                    → 按分组模板导出 Excel
```

### 2.3 端口管理 — `/api/v1/ports`

```
# 主端口
GET    /main          → 分页列表
GET    /main/{id}     → 详情（含子端口列表）
POST   /main          → 新增
PATCH  /main/{id}     → 更新
DELETE /main/{id}     → 删除

# 子端口
GET    /sub           → 分页列表（支持 main_port_id 筛选）
GET    /sub/{id}      → 详情
POST   /sub           → 新增
PATCH  /sub/{id}      → 更新
DELETE /sub/{id}      → 删除
```

### 2.4 导出分组 — `/api/v1/export-groups`

```
GET    /                    → 分组列表
POST   /                    → 创建分组（含字段列表）
GET    /{id}                → 详情
PATCH  /{id}                → 更新分组及字段
DELETE /{id}                → 删除
```

### 2.5 文件管理 — `/api/v1/files`

```
POST   /upload              → 上传文件/图片 → file_attachment
GET    /{id}                → 下载（MinIO presigned URL 302 重定向）
GET    /{id}/thumbnail      → 缩略图
DELETE /{id}                → 删除（含 MinIO 对象删除）
```

### 2.6 三方 API 接入 — `/api/v1/api-access`

```
GET    /                    → 配置列表
POST   /                    → 新增配置
PATCH  /{id}                → 更新配置
DELETE /{id}                → 删除
GET    /{id}/data           → 接入数据展示（分页，当前只读）
```

### 统一分页响应格式

```json
{ "data": [...], "total": 12345, "page": 1, "page_size": 20 }
```

---

## 三、Excel 导入导出

### 3.1 导入流程（两步式）

**Step 1 — 上传解析预览**

`POST /api/v1/records/import/upload` (multipart/form-data)

1. 接收文件存临时目录
2. openpyxl 加载 → 遍历 sheet → 提取 headers
3. 提取嵌入图片（`ws._images`，建立 (row, col)→image 映射）
4. 返回 headers、前 20 行预览、图片列标识、总行数/图片数

**Step 2 — 确认导入**

`POST /api/v1/records/import/confirm`

1. 根据 `field_mapping` 流式读取 sheet 数据
2. 每 200 行一批：
   - 普通字段直接映射到 port_info / qualification_info
   - 图片列：提取图片字节 → 上传 MinIO → 创建 file_attachment → 关联 entity
   - 三表 INSERT（一个事务）
3. 返回成功/失败计数及错误明细

### 3.2 图片提取（openpyxl）

```python
import openpyxl

wb = openpyxl.load_workbook(file_path)
ws = wb.active
for image in ws._images:
    row = image.anchor._from.row + 1  # 1-based
    col = image.anchor._from.col + 1
    img_bytes = image._data()
    # upload to MinIO ...
```

### 3.3 导出流程

`POST /api/v1/records/export` 

1. 查 export_group_field 获取字段列表
2. 根据 carrier 条件 JOIN 查询 filing_record + port_info + qualification_info
3. openpyxl 生成 xlsx 流式返回

---

## 四、文件存储

### 4.1 架构

```
FastAPI App
    │
    ├── 开发环境 → LocalFileStorage (本地文件系统)
    │
    └── 生产环境 → MinioStorage (boto3 → MinIO)
                    └── Bucket: sms-filing
                        ├── images/
                        ├── documents/
                        └── exports/
```

通过 `app/core/storage.py` 抽象 `StorageBackend` 接口：

```python
class StorageBackend(ABC):
    async def upload(self, key: str, data: bytes, content_type: str) -> str
    async def download(self, key: str) -> bytes
    async def get_url(self, key: str, expires: int = 3600) -> str
    async def delete(self, key: str) -> None
```

### 4.2 MinIO 部署

```yaml
# docker-compose.minio.yml
minio:
  image: minio/minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: sms_filing
    MINIO_ROOT_PASSWORD: changethis
  ports:
    - "9000:9000"   # API
    - "9001:9001"   # Console
  volumes:
    - minio_data:/data
```

---

## 五、开发顺序

```
1. 后端基础设施
   ├── SQLModel 模型定义（9 张表）
   ├── Alembic 迁移
   ├── MinIO Docker Compose + 存储抽象层
   └── file_attachment CRUD

2. 端口管理（最小闭环，验证前后端打通）
   ├── main_port / sub_port CRUD + API
   └── 前端替换 mock → 真实 API

3. 资质管理（核心模块）
   ├── port_info / qualification_info / filing_record CRUD + API
   ├── 分页、多条件筛选、详情（JOIN 关联）
   └── 前端替换 mock → 真实 API

4. 导出配置 + Excel 导出
   ├── export_group / export_group_field CRUD
   ├── 导出端点
   └── 前端导出入口

5. Excel 图片导入
   ├── POST /import/upload（解析预览）
   ├── POST /import/confirm（确认导入 + 图片上传）
   └── 前端导入入口 + 字段映射 UI

6. 工作台 Dashboard
   ├── 统计/趋势 API
   └── 前端对接真实数据

7. 三方 API 接入
   ├── api_access_config CRUD
   ├── api-data 展示页面对接
   └── 预留数据拉取扩展点
```

---

## 六、边界与约束

- 首期不处理 `.xls` 老格式导入
- 首期不处理外部 URL 图片引用
- 导入文件大小限制 50MB，单图限制 10MB
- MinIO 只保留当天上传的临时文件用于导入预览
- 列表接口每页最大 100 条
