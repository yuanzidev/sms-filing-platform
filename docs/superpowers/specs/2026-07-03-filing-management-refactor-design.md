# 报备管理重构设计

## 概述

将「报备记录」模块重构为「报备管理」，核心功能从逐条录入报备记录转变为：从在库的资质池和端口池中批量组合生成 Excel 报备文件，供向其他单位提供报备信息使用。每次导出操作形成可追溯的操作记录，并提供历史文件下载。

## 数据模型变更

### 删除

- `FilingRecord` 表（含 `FilingRecordCreate`、`FilingRecordUpdate`、`FilingRecordPublic` schema）
- 级联删除依赖：创建 filing_record 时的事务逻辑

### 保留不变

- `PortInfo` — 端口信息数据池
- `QualificationInfo` — 资质信息数据池
- `ExportGroup` / `ExportGroupField` — 导出字段组配置

### 新建：`filing_task` 表

每次 Excel 导出生成操作对应一条 task 记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK | |
| `task_name` | str(256) | NOT NULL | 自动生成，格式「报备导出-YYYYMMDD-NNN」 |
| `qualification_ids` | JSON | NOT NULL | 选中资质 ID 数组 |
| `port_ids` | JSON | NOT NULL | 随机抽取的端口 ID 数组 |
| `export_group_id` | UUID | FK→export_group, NOT NULL | 使用的导出字段组 |
| `group_by_field` | str(64) | nullable | 分组排序字段名 |
| `file_path` | str(512) | nullable | MinIO object key，格式 `filing-exports/{task_id}.xlsx` |
| `file_size` | int | nullable | 文件大小（字节） |
| `qualification_count` | int | NOT NULL | 冗余字段，列表展示用 |
| `port_count` | int | NOT NULL | 冗余字段，列表展示用 |
| `operator_id` | UUID | FK→user, NOT NULL | 操作人 |
| `created_at` | datetime | NOT NULL, default=now() | 生成时间 |

### Schema

```python
class FilingTaskCreate(BaseModel):
    task_name: str | None = None  # 不传则自动生成
    qualification_ids: list[UUID]
    port_count: int | None = None  # 不传则全量端口参与
    export_group_id: UUID
    group_by_field: str | None = None

class FilingTaskPublic(BaseModel):
    id: UUID
    task_name: str
    qualification_count: int
    port_count: int
    export_group_name: str  # 关联查询
    group_by_field: str | None
    file_size: int | None
    operator_name: str  # 关联查询
    created_at: datetime

class FilingTaskDetail(FilingTaskPublic):
    qualification_ids: list[UUID]
    port_ids: list[UUID]
    file_path: str | None
    download_url: str | None  # MinIO 预签名 URL
```

## API 设计

### 删除端点

原 `/api/v1/records` 下所有 CRUD 端点及 import 相关端点。

### 新增端点

所有端点依赖 `get_current_active_user`（登录即可，操作日志记录归属）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/filing-tasks` | 分页列表，支持 `start_date`/`end_date`/`keyword` 筛选 |
| GET | `/api/v1/filing-tasks/{id}` | 单条详情 |
| POST | `/api/v1/filing-tasks` | 创建任务 + 执行导出 |
| DELETE | `/api/v1/filing-tasks/{id}` | 删除记录及 MinIO 文件 |
| GET | `/api/v1/filing-tasks/{id}/download` | 302 重定向到 MinIO 预签名 URL |

### POST 请求/响应流程

```
POST /api/v1/filing-tasks
Body: {
  "qualification_ids": [...],
  "port_count": 5,           // 可选，不传=全量
  "export_group_id": "...",
  "group_by_field": "carrier" // 可选
}

Response (同步生成): {
  "id": "...",
  "task_name": "报备导出-20260703-001",
  "qualification_count": 10,
  "port_count": 5,
  "file_size": 153600,
  "download_url": "https://minio/presigned-url..."
}
```

### 保留端点

- `/api/v1/qualifications` — 资质 CRUD（独立资源，作为选择池）
- `/api/v1/export-groups` — 导出字段组 CRUD
- `/api/v1/utils/port-info` — 端口数据（作为端口池）

## Excel 生成逻辑

### 端口随机抽取

1. 从 `port_info` 表全量查询，随机打乱，取前 N 条（N 为用户传入的 `port_count`）
2. 如端口总数不足 N，取实际可用数并在响应中提示
3. 资质列表 × 端口列表 → 笛卡尔积，每行为一个资质+端口的组合行

### 分组排序

- 若指定 `group_by_field`，按该字段值排序，相同值的行聚在一起
- 组与组之间插入一个空白行作为视觉分隔（仍在一个 sheet 内）
- 不指定则按资质顺序+端口顺序排列

### Excel 格式

- 基于现有 `ExportGroup` 字段配置 + `openpyxl` 生成
- 蓝色表头行（沿用现有样式），自动列宽
- 每个字段在导出时遍历 `build_field_map()` 获取中文标签作为表头

## 文件存储

- 使用 MinIO（已在 production compose 中部署）
- Object key：`filing-exports/{task_id}.xlsx`
- 下载通过 GET `/download` 端点返回 302 跳转到 MinIO 预签名 URL（有效期 1 小时）
- 删除 task 时同步删除 MinIO 文件

## 前端变更

### 路由变更

| 旧路径 | 新路径 | 行为 |
|--------|--------|------|
| `/records` | `/filing-management` | task 列表页 |
| `/records/create` | `/filing-management/create` | 新建报备页 |
| `/records/$recordId/detail` | — | 移除 |
| `/records/$recordId/edit` | — | 移除 |

### 页面结构

**报备管理列表页 (`/filing-management`)**

- 表格列：任务名称、生成时间、操作人、资质数、端口数、字段组、文件大小、操作（下载/删除）
- 筛选：时间范围选择器 + 关键词搜索
- 点击「新建报备」进入创建页

**新建报备页 (`/filing-management/create`)**

单页三步流程：

1. **选择资质**：表格展示资质池，支持搜索/筛选，支持多选勾选，显示已选数量
2. **配置导出**：选择导出字段组（下拉）、设置分组排序字段（可选下拉）、指定随机端口数量（数字输入，留空=全量）
3. **确认生成**：展示概要（资质数 N、端口数 M、预计行数 N×M），点击「生成报备」→ 调用 API → 成功后提示下载

### 侧边栏菜单

- 标签：「报备记录」→「报备管理」
- URL：`/records` → `/filing-management`
- 保留「资质管理」菜单项

### 资质管理改造

保持对话框 CRUD 模式，字段按类别在对话框中分组展示：

- **企业信息**：企业名称、证件类型、证件号码、集团编号、应用平台名称
- **负责人信息**：姓名、证件类型、证件号码、电话
- **经办人信息**：姓名、证件类型、证件号码、电话
- **提交信息**：提交单位、客户企业 ID

用分隔标题区分组（简单的视觉分组，不需要折叠面板）。

## 任务编号生成规则

```
REC → BEI-YYYYMMDD-NNN
```

- 前缀：`BEI`（报备的拼音缩写）
- 日期：当前日期
- 序号：当天内的流水号，3 位补零（001-999）

## 实施清单

- [ ] 后端：新建 `FilingTask` 模型 + 迁移
- [ ] 后端：新建 `filing_task` CRUD
- [ ] 后端：删除 `filing_record` 模型/CRUD/路由
- [ ] 后端：新建 `filing_tasks` API 路由（列表/创建/详情/删除/下载）
- [ ] 后端：端口随机抽取逻辑
- [ ] 后端：Excel 生成分组排序逻辑
- [ ] 后端：MinIO 文件上传/删除/预签名 URL 逻辑
- [ ] 后端：清理 import 相关代码
- [ ] 前端：新建 `filing-management` 列表页
- [ ] 前端：新建 `filing-management/create` 新建报备页
- [ ] 前端：删除旧 records 路由/features/hooks/api
- [ ] 前端：侧边栏菜单更新
- [ ] 前端：资质管理对话框字段分组
- [ ] 测试：后端 API 测试
- [ ] 清理旧路由的 import/export 残留代码
