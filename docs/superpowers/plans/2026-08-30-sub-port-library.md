# 子端口库（Sub-Port Library）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增"子端口库"模块：按主端口管理子端口（唯一性=主端口号+子端口号），表格列由字段组驱动（库级切换），固定"状态"字段（在线/下线/整改），支持导入模板生成、批量导入（upsert）、手动编辑、单条/批量删除、导入删除清单删除。

**Architecture:** 后端新增 `sub_port_record` 表（固定列 + JSON field_values），REST API 前缀 `/api/v1/sub-port-library`（superuser 保护），复用字段组（ExportGroup）驱动模板/表头/表单。前端新增 `/sub-ports` 页面（参照 port-info 页面结构），复用 DataTable / ImportDialog / StatusTag / ActionIconButton 共享组件。

**Tech Stack:** FastAPI + SQLModel + Alembic + openpyxl + pytest（真实数据库）；React + TypeScript + TanStack Router/Query/Table + ShadcnUI + pnpm。

**Spec:** `docs/superpowers/specs/2026-08-30-sub-port-library-design.md`

## Global Constraints

- 迁移 `down_revision = "b7c4e9f2a3d1"`（当前 alembic head）
- 所有子端口库 API 由 `get_current_active_superuser` 保护
- 状态枚举固定为 `("在线", "下线", "整改")`，空值默认 `"在线"`
- 唯一性：`UniqueConstraint("main_port_number", "sub_port_number")`；手动创建/编辑冲突返回 400；导入按该键 upsert
- 模板**不含示例数据行**，只含表头 + "填写说明" sheet
- commit 使用中文 conventional 格式（如 `feat(sub-port-library): ...`），**不带 AI 署名**，不使用 `--no-verify`
- 测试中构造数据使用 uuid 随机前缀，避免真实数据库多次运行时唯一键冲突
- 不触碰既有未提交改动（docker-compose.yml、frontend/src/lib/api/qualifications.ts、scripts/deploy.sh、.env.deploy.smsf）

---

### Task 1: 后端模型 + 迁移

**Files:**
- Create: `backend/app/models/sub_port_record.py`
- Modify: `backend/app/models/__init__.py`（按字母序插入 import + `__all__`）
- Create: `backend/app/alembic/versions/<rev>_create_sub_port_record.py`（`down_revision = "b7c4e9f2a3d1"`）

模型要点（完整定义见实现）：
- `SubPortRecord(SQLModel, table=True)`：`id` UUID PK（default_factory uuid4）、`main_port_number` str(100) index、`sub_port_number` str(100) index、`status` str(20) default "在线"、`field_values` dict（`sa_column=Column(JSON)`，default_factory=dict）、`created_at`/`updated_at`（`utcnow`）
- `__table_args__ = (UniqueConstraint("main_port_number", "sub_port_number", name="uq_sub_port_record_main_sub"),)`
- Schemas：`SubPortRecordCreate`（main/sub 必填、status 默认在线、field_values 默认 {}）、`SubPortRecordUpdate`（全部 optional，exclude_unset 更新）、`SubPortRecordPublic`、`SubPortRecordsPublic`（data/total/page/page_size）、`SubPortBatchDelete`（ids: list[uuid]）
- 迁移：`op.create_table("sub_port_record", ...)` + 唯一约束 + 两个索引；down 删表

**Verify:** `cd backend && uv run alembic upgrade head` 成功建表；`uv run python -c "from app.models import SubPortRecord"` 无报错

- [ ] Commit: `feat(sub-port-library): 新增子端口库数据模型与迁移`

### Task 2: 后端 CRUD

**Files:**
- Create: `backend/app/crud/sub_port_record.py`

接口（ Produces，后续任务依赖）：
- `list_sub_port_records(*, session, page, page_size, keyword, status, main_port_number) -> tuple[list[SubPortRecord], int]`（keyword 对主/子端口号 like 模糊；status 精确；main_port_number 精确；按 created_at desc 排序）
- `get_sub_port_record(*, session, id) -> SubPortRecord | None`
- `get_by_main_and_sub(*, session, main_port_number, sub_port_number) -> SubPortRecord | None`
- `create_sub_port_record(*, session, create) -> SubPortRecord`
- `update_sub_port_record(*, session, db_obj, update) -> SubPortRecord`（exclude_unset + sqlmodel_update，并刷新 `updated_at`）
- `delete_sub_port_record(*, session, db_obj) -> None`
- `delete_sub_port_records(*, session, ids) -> int`（返回实际删除数量）

- [ ] Commit: `feat(sub-port-library): 新增子端口库 CRUD 层`

### Task 3: 后端 API 路由

**Files:**
- Create: `backend/app/api/routes/sub_port_library.py`
- Modify: `backend/app/api/main.py`（注册路由）

路由（prefix `/sub-port-library`，`dependencies=[Depends(get_current_active_superuser)]`）：

| 方法 | 路径 | 要点 |
|---|---|---|
| GET | `/template?group_id=` | 表头 = 主端口号/子端口号/状态 + 字段组各字段 label；"填写说明" sheet；无示例数据行 |
| POST | `/import/preview`（FormData: file, group_id） | 返回 `{headers, rows(前5行), unrecognized_headers, total_data_rows}` |
| POST | `/import`（FormData: file, group_id） | upsert；返回 `{total, success_count, error_count, errors, message}` |
| POST | `/import/parse-delete`（FormData: file） | 返回 `{matched_count, matched, unmatched, total}`，不删除 |
| POST | `/import/delete`（FormData: file） | 返回 `{deleted_count, unmatched, total}` |
| GET | ``（含 `/` 别名） | params: page/page_size/keyword/status/main_port_number |
| POST | `` | 唯一冲突/非法状态 400 |
| PATCH | `/{id}` | 唯一冲突 400；非法状态 400 |
| DELETE | `/{id}` | 返回 Message |
| POST | `/batch-delete` | body `{ids}`；返回 `{deleted_count}` |

解析规则（导入/预览共用 `_parse_sub_port_excel`）：
- 表头识别：固定列（主端口号/子端口号/状态）+ 字段组各字段 `field_label`；未识别进 `unrecognized_headers` 忽略
- 行校验：主/子端口号为空 → error；状态非空但不在枚举 → error；状态为空 → 默认"在线"；文件内 (主,子) 重复 → 后者 error；空行跳过不计
- 字段组字段值统一 `str(value).strip()` 存入 field_values（键 = field_name，空值存 ""）
- 返回 errors 结构 `{row, field, value, reason, suggestion}` 与资质导入一致
- 删除清单解析 `_parse_delete_list`：前几列宽松匹配表头（主端口*/子端口* 别名），否则按 0/1 列位置；空行/空值跳过；(主,子) 去重

- [ ] Commit: `feat(sub-port-library): 新增子端口库 API（模板/导入/删除清单/CRUD）`

### Task 4: 后端测试

**Files:**
- Create: `backend/app/tests/api/routes/test_sub_port_library.py`

测试清单（用例内 openpyxl 构建 Excel；字段组用例内创建，主端口号带 uuid 随机前缀）：
1. `test_download_template` — 200；表头含固定列 + 字段组字段列；"填写说明" sheet 存在；无示例数据行
2. `test_import_creates_records` — 新增入库、状态默认在线、field_values 正确
3. `test_import_upsert` — 已存在 (主,子) 被导入值覆盖
4. `test_import_validation_errors` — 缺主/子端口号、非法状态 → errors 明细且不入库
5. `test_import_duplicate_in_file` — 同文件重复行，第二条报错
6. `test_create_duplicate_400` / `test_update_duplicate_400` — 唯一性
7. `test_delete_list_parse_and_delete` — parse-delete 预览正确；delete 执行删除并返回 unmatched
8. `test_list_filters` — keyword 模糊 / status / main_port_number 精确 / 分页
9. `test_manual_crud_and_batch_delete` — POST/PATCH/DELETE/batch-delete

**Verify:** `cd backend && uv run pytest app/tests/api/routes/test_sub_port_library.py -v` 全绿；`uv run ruff check app` 通过

- [ ] Commit: `test(sub-port-library): 子端口库 API 测试`

### Task 5: 前端 API 模块

**Files:**
- Create: `frontend/src/lib/api/sub-port-library.ts`

类型（Produces）：
- `SubPortRecord { id, main_port_number, sub_port_number, status, field_values: Record<string,string>, created_at, updated_at }`
- `SubPortRecordsResponse { data, total, page, page_size }`
- `DeleteListTarget { main_port_number, sub_port_number }`；`ParseDeleteResult { matched_count, matched, unmatched, total }`；`DeleteListResult { deleted_count, unmatched, total }`

函数（模式照抄 `port-info.ts`）：`getSubPortRecords(params)`、`createSubPortRecord`、`updateSubPortRecord`、`deleteSubPortRecord`、`batchDeleteSubPortRecords(ids)`、`downloadSubPortTemplate(group_id)`（blob 下载"子端口数据导入模板.xlsx"）、`importSubPorts(file, group_id)`、`previewSubPortsImport(file, group_id)`（FormData）、`parseDeleteList(file)`、`deleteByList(file)`

- [ ] Commit: `feat(sub-port-library): 前端 API 模块`

### Task 6: 前端功能模块

**Files:**
- Create: `frontend/src/features/sub-port-library/index.tsx`（页面主体，参照 `port-info/index.tsx`）
- Create: `frontend/src/features/sub-port-library/components/sub-port-dialog.tsx`（新增/编辑）
- Create: `frontend/src/features/sub-port-library/components/import-delete-dialog.tsx`（导入删除清单）

页面要点：
- 字段组选择器：`getExportGroups()` query；选择持久化 `localStorage["sub-port-library-group-id"]`；默认第一个字段组；字段组变化清空 rowSelection
- 工具栏：新增、导入数据（ImportDialog，onImport/onPreview 携带当前 group_id）、下载模板、导入删除清单、多选批量删除（batch-delete 接口）、刷新
- 筛选：关键词（主/子端口号模糊，输入即生效）、状态下拉（全部/在线/下线/整改）、主端口号精确输入；重置按钮
- 表格列：主端口号、子端口号、状态（StatusTag + customMap：在线=绿/下线=灰/整改=橙）、当前字段组动态列（`field_values[field.field_name]`，label 用 `field.field_label`）、创建时间（formatCN）、操作（编辑/删除 + AlertDialog 确认）
- 复用：`DataTable`（enableRowSelection）、`ImportDialog`、`ActionIconButton`、`StatusTag`

sub-port-dialog：
- Props `{ open, onOpenChange, record?, group, onSuccess }`；受控 state（非 RHF，字段动态）
- 字段：主端口号/子端口号 Input（必填校验）、状态 Select 单选、字段组各字段 Input
- 提交：create / update（field_values 按 group field_name 组装）；错误 detail 为字符串时 toast 展示（唯一冲突 400）

import-delete-dialog：
- 步骤：选文件 → `parseDeleteList` 预览（将删除 N 条、未匹配 M 条明细表格）→ 确认删除 → `deleteByList` → toast + onSuccess

- [ ] Commit: `feat(sub-port-library): 子端口库页面与对话框`

### Task 7: 路由 + 侧边栏

**Files:**
- Create: `frontend/src/routes/_authenticated/sub-ports/index.tsx`（`createFileRoute('/_authenticated/sub-ports/')`，component 指向 SubPortLibraryPage）
- Modify: `frontend/src/components/layout/data/sidebar-data.ts`（"端口管理"下方新增"子端口库" `/sub-ports`，tabler 图标）

**Verify:** `cd frontend && pnpm run lint && pnpm run build` 通过（routeTree.gen.ts 自动生成）

- [ ] Commit: `feat(sub-port-library): 新增子端口库路由与菜单入口`

### Task 8: 整体验证

- 后端：`uv run pytest`（含全量回归）、`uv run ruff check .`
- 前端：`pnpm run lint`、`pnpm run build`
- 手动核对验收标准对照表（spec 末尾）
