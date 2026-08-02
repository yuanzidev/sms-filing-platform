# 报备平台 P0 优化与修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成报备平台 P0 三项优化——必填字段梳理、导出字段一致性、子端口范围随机生成——使用户能顺利完成资质/端口导入、字段组勾选所有字段都能正确导出、新建报备可在指定范围内自动随机生成永久唯一的子端口号。

**Architecture:** 三个独立 PR 串行：PR-1 改字段 nullable + 删导入硬校验；PR-2 抽取统一字段元数据字典并重构导出链路；PR-3 新建占用记录表 + 分配算法 + 报备流程改造。每个 PR 独立可 revert。

**Tech Stack:** FastAPI + SQLModel + Alembic + openpyxl；React + TypeScript + TanStack Query + ShadcnUI。

## Global Constraints

- 后端代码风格：`uv run ruff check .` 通过；`uv run mypy .` 通过；`uv run pytest` 通过。
- 前端代码风格：`pnpm run lint` 通过；`pnpm run build` 成功。
- 数据库改动必须有 alembic 迁移；NOT NULL → nullable 不需要数据回填。
- 测试遵循 TDD：先写失败测试，再实现，再跑通。
- 每个任务结束 `git commit`，commit message 用中文、不带 AI 署名。
- 前端字段名/中文 label 与后端 registry 必须一字不差。
- 子端口占用记录删除报备任务后保留（SET NULL）；DB 唯一约束 `(main_port_number, port_number)`。

参考 spec：`docs/superpowers/specs/2026-08-02-filing-platform-p0-optimizations-design.md`

---

## PR-1：必填字段梳理

### Task 1: 资质/端口模型字段改 nullable + Alembic 迁移

**Files:**
- Modify: `backend/app/models/qualification_info.py:19-21`
- Modify: `backend/app/models/port_info.py:14, 17`
- Create: `backend/app/alembic/versions/<new_rev>_make_legal_and_port_fields_nullable.py`
- Test: `backend/app/tests/test_alembic_migration_nullable.py`（仅做迁移应用烟测）

**Interfaces:**
- Produces: `QualificationInfo.legal_representative_cert_type/number/address` 改为 `str | None = Field(default=None, ...)`；`PortInfo.operation_type/group_code` 改为 `str | None = Field(default=None, ...)`

- [ ] **Step 1: 写迁移测试（保证可应用 + 可回滚）**

新建 `backend/app/tests/test_alembic_migration_nullable.py`：

```python
"""Smoke test for the nullable-fields migration."""
from alembic import command
from alembic.config import Config
from app.alembic.versions import latest


def test_migration_runs_cleanly(tmp_path):
    cfg = Config("app/alembic.ini")
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
```

如 `latest` 不存在或写法不可用，直接简化为只调 `command.upgrade(cfg, "head")` + 断言无异常。

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/test_alembic_migration_nullable.py -v`
Expected: FAIL（迁移文件还不存在，alembic 报错）

- [ ] **Step 3: 改模型字段为 nullable**

`backend/app/models/qualification_info.py:19-21`：

```python
# 改前
legal_representative_cert_type: str = Field(max_length=50)
legal_representative_cert_number: str = Field(max_length=100)
legal_representative_cert_address: str = Field(max_length=500)
# 改后
legal_representative_cert_type: str | None = Field(default=None, max_length=50)
legal_representative_cert_number: str | None = Field(default=None, max_length=100)
legal_representative_cert_address: str | None = Field(default=None, max_length=500)
```

`backend/app/models/port_info.py:14, 17`：

```python
# 改前
operation_type: str = Field(max_length=100)
group_code: str = Field(max_length=100)  # 找到对应行
# 改后
operation_type: str | None = Field(default=None, max_length=100)
group_code: str | None = Field(default=None, max_length=100)
```

- [ ] **Step 4: 生成 alembic 迁移**

Run: `cd backend && uv run alembic revision --autogenerate -m "make legal and port fields nullable"`

打开生成的迁移文件确认包含 5 个 `alter_column ... nullable=True`，且 `downgrade()` 是 `nullable=False`。

revision 文件示例：

```python
"""make legal and port fields nullable

Revision ID: <auto>
Revises: <previous head>
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.alter_column("qualification_info", "legal_representative_cert_type",
                    existing_type=sa.String(length=50), nullable=True)
    op.alter_column("qualification_info", "legal_representative_cert_number",
                    existing_type=sa.String(length=100), nullable=True)
    op.alter_column("qualification_info", "legal_representative_cert_address",
                    existing_type=sa.String(length=500), nullable=True)
    op.alter_column("port_info", "operation_type",
                    existing_type=sa.String(length=100), nullable=True)
    op.alter_column("port_info", "group_code",
                    existing_type=sa.String(length=100), nullable=True)


def downgrade() -> None:
    op.alter_column("port_info", "group_code",
                    existing_type=sa.String(length=100), nullable=False)
    op.alter_column("port_info", "operation_type",
                    existing_type=sa.String(length=100), nullable=False)
    op.alter_column("qualification_info", "legal_representative_cert_address",
                    existing_type=sa.String(length=500), nullable=False)
    op.alter_column("qualification_info", "legal_representative_cert_number",
                    existing_type=sa.String(length=100), nullable=False)
    op.alter_column("qualification_info", "legal_representative_cert_type",
                    existing_type=sa.String(length=50), nullable=False)
```

- [ ] **Step 5: 应用迁移并跑测试**

Run: `cd backend && uv run alembic upgrade head && uv run pytest tests/test_alembic_migration_nullable.py -v`
Expected: PASS

- [ ] **Step 6: 跑全套测试看是否有回归**

Run: `cd backend && uv run pytest -x`
Expected: 全 PASS（个别旧测试如 `test_qualifications.py` 仍传非空法人字段，不会受影响）

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/qualification_info.py backend/app/models/port_info.py \
        backend/app/alembic/versions/*_make_legal_and_port_fields_nullable.py \
        backend/app/tests/test_alembic_migration_nullable.py
git commit -m "refactor(models): 资质法人 3 字段、端口操作类型/集团编码改为 nullable"
```

---

### Task 2: 资质导入路由去除硬校验 + 模板说明

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:285-299`（删除三处 raise）
- Modify: `backend/app/api/routes/qualifications.py:155-167`（填写说明 notes 追加一条）
- Test: `backend/app/tests/api/routes/test_qualifications.py`（追加 case）

**Interfaces:**
- Produces: `POST /api/v1/qualifications/import` 接受法人 3 字段为空的 Excel；`GET /api/v1/qualifications/template` 返回的"填写说明"sheet 多一行说明。

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_qualifications.py` 末尾：

```python
def test_import_qualifications_with_empty_legal_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """法人证件类型/号码/地址为空可导入"""
    from io import BytesIO
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    headers = ["企业名称", "法人证件类型", "法人证件号码", "法人证件地址", "短信签名"]
    for col_idx, h in enumerate(headers, 1):
        ws.cell(row=1, column=col_idx, value=h)
    # 法人字段留空
    ws.cell(row=2, column=1, value="测试企业")
    ws.cell(row=2, column=5, value="测试签名")

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] >= 1


def test_qualification_template_notes_mention_optional_legal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO
    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    wb = load_workbook(BytesIO(r.content))
    notes_ws = wb["填写说明"]
    all_text = "\n".join(str(c.value) for row in notes_ws.iter_rows() for c in row if c.value)
    assert "法人证件类型" in all_text
    assert "选填" in all_text
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_qualifications.py::test_import_qualifications_with_empty_legal_fields tests/api/routes/test_qualifications.py::test_qualification_template_notes_mention_optional_legal -v`
Expected: FAIL（导入 400，模板说明里没有"选填"）

- [ ] **Step 3: 删除硬校验**

`backend/app/api/routes/qualifications.py` 找到 import_qualifications 函数中的：

```python
legal_rep_cert_type = cell("legal_representative_cert_type")
if not legal_rep_cert_type:
    raise HTTPException(status_code=400, detail=f"第{row_idx}行: 法人证件类型不能为空")

legal_rep_cert_number = cell("legal_representative_cert_number")
if not legal_rep_cert_number:
    raise HTTPException(status_code=400, detail=f"第{row_idx}行: 法人证件号码不能为空")

legal_rep_cert_address = cell("legal_representative_cert_address")
if not legal_rep_cert_address:
    raise HTTPException(status_code=400, detail=f"第{row_idx}行: 法人证件地址不能为空")
```

替换为：

```python
legal_rep_cert_type = cell("legal_representative_cert_type")
legal_rep_cert_number = cell("legal_representative_cert_number")
legal_rep_cert_address = cell("legal_representative_cert_address")
```

注意：保留 `enterprise_name` 不能为空的校验。

- [ ] **Step 4: 修改模板填写说明**

`backend/app/api/routes/qualifications.py` 内 `download_qualification_template` 的 `notes` 列表追加：

```python
notes = [
    "1. 请勿修改表头行（第一行）的列标题",
    "2. 每条数据填写一行，从第二行开始",
    "3. 图片列（单位证件图片、身份证正面/反面等）用于存放资质证明图片",
    "4. 插入方法：右键单元格 ->「插入图片」->「放置在单元格中」-> 选择图片文件",
    "5. 也可将图片直接拖入到图片列的单元格中",
    "6. 系统会自动提取每行单元格内嵌的图片，并与对应字段关联",
    "7. 支持的图片格式：PNG、JPEG、GIF、BMP、WEBP，单张不超过 10MB",
    "8. 法人证件类型/号码/地址：选填；运营商报备强依赖时再填",
]
```

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_qualifications.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): 导入去除法人字段必填校验，模板说明标注选填"
```

---

### Task 3: 端口导入路由去除硬校验 + 模板说明

**Files:**
- Modify: `backend/app/api/routes/port_info.py:191, 262-264, 278-280`
- Modify: `backend/app/api/routes/port_info.py:107-115`（notes 追加）
- Test: `backend/app/tests/api/routes/test_port_info.py`（追加 case）

**Interfaces:**
- Produces: `POST /api/v1/port-info/import` 接受 operation_type、group_code 为空的 Excel。

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_port_info.py`：

```python
def test_import_port_info_with_empty_operation_and_group(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """操作类型/集团编码为空可导入"""
    from io import BytesIO
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    headers = [
        "运营商", "主端口号", "企业名称", "端口类型",
        "运营商接入机房及设备", "企业接入机房及设备", "授权书",
    ]
    for col_idx, h in enumerate(headers, 1):
        ws.cell(row=1, column=col_idx, value=h)
    ws.cell(row=2, column=1, value="中国移动")
    ws.cell(row=2, column=2, value="10698999")
    ws.cell(row=2, column=3, value="测试企业")
    ws.cell(row=2, column=4, value="短信")
    ws.cell(row=2, column=5, value="机房A")
    ws.cell(row=2, column=6, value="机房B")
    ws.cell(row=2, column=7, value="授字001")

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    r = client.post(
        f"{settings.API_V1_STR}/port-info/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] >= 1
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_port_info.py::test_import_port_info_with_empty_operation_and_group -v`
Expected: FAIL（400 错误，提示 operation_type 不能为空）

- [ ] **Step 3: 删除硬校验**

`backend/app/api/routes/port_info.py` 内 `import_port_infos`：

`required_fields` 列表（约 line 191）改为：

```python
required_fields = ["carrier", "main_port_number", "enterprise_name", "port_type", "carrier_room", "enterprise_room", "authorization_letter"]
```

（删除 `"operation_type"`, `"group_code"`）

删除以下硬校验段：

```python
operation_type = cell("operation_type")
if not operation_type:
    raise HTTPException(status_code=400, detail=f"第{row_idx}行: 操作类型不能为空")
```

```python
group_code = cell("group_code")
if not group_code:
    raise HTTPException(status_code=400, detail=f"第{row_idx}行: 集团编码不能为空")
```

保留：`carrier`、`main_port_number`、`enterprise_name`、`port_type`、`carrier_room`、`enterprise_room`、`authorization_letter` 校验。

`objects.append(PortInfo(...))` 里 `operation_type=operation_type, group_code=group_code` 改为 `operation_type=cell("operation_type"), group_code=cell("group_code")`。

- [ ] **Step 4: 修改模板填写说明**

`port_info.py` 内 `download_port_info_template` 的 `notes` 追加：

```python
notes = [
    ...,
    "8. 操作类型、集团编码：选填",
]
```

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_port_info.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/port_info.py backend/app/tests/api/routes/test_port_info.py
git commit -m "feat(port-info): 导入去除操作类型/集团编码必填校验，模板说明标注选填"
```

---

### Task 4: 前端资质/端口表单去除必填

**Files:**
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx`
- Modify: `frontend/src/features/port-info/components/port-info-dialog.tsx`

**Interfaces:**
- Produces: 资质表单的法人证件类型/号码/地址、端口表单的操作类型/集团编码不再是必填（无红色 `*`，无 zod `.min(1)`）。

- [ ] **Step 1: 改资质表单**

`frontend/src/features/qualifications/components/qualification-dialog.tsx`：

1. 找到 formSchema 里的 `legal_representative_cert_type/number/address` 字段，去掉 `.min(1, ...)` 约束（如有）
2. 找到对应的 `<FormItem>` block，去掉 label 里的 `*` 或 `必填` 标记

示例改动（伪代码，按实际代码定位）：

```tsx
// 改前
<FormItem>
  <FormLabel>法人证件类型 *</FormLabel>
  ...
</FormItem>

// 改后
<FormItem>
  <FormLabel>法人证件类型</FormLabel>
  ...
</FormItem>
```

对法人证件类型、号码、地址三处都做此改动。

- [ ] **Step 2: 改端口表单**

`frontend/src/features/port-info/components/port-info-dialog.tsx`：

对 `operation_type`、`group_code` 做同样处理。

- [ ] **Step 3: 跑 lint 与 build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: 全 PASS

- [ ] **Step 4: 手动验证（可选）**

启动 dev server，打开资质新建/编辑弹窗，清空法人字段尝试提交——应可成功保存。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/qualifications/components/qualification-dialog.tsx \
        frontend/src/features/port-info/components/port-info-dialog.tsx
git commit -m "feat(frontend): 资质/端口表单去除法人字段、操作类型/集团编码必填标记"
```

---

## PR-2：导出字段字典 + 一致性

### Task 5: 新建 export_field_registry.py

**Files:**
- Create: `backend/app/services/export_field_registry.py`
- Test: `backend/app/tests/services/test_export_field_registry.py`

**Interfaces:**
- Produces: `ExportField` dataclass；`REGISTRY: list[ExportField]`；`all_fields() -> list[ExportField]`；`get_field(name: str) -> ExportField | None`；`field_map() -> dict[str, str]`；`field_source(name: str) -> str | None`

- [ ] **Step 1: 写失败测试**

新建 `backend/app/tests/services/test_export_field_registry.py`：

```python
"""Tests for export field registry."""
from app.services.export_field_registry import (
    REGISTRY, all_fields, get_field, field_map, field_source,
)


def test_registry_non_empty():
    assert len(REGISTRY) > 30


def test_field_map_contains_signature_type():
    """用户问题 10 重点字段必须存在"""
    fm = field_map()
    assert fm.get("signature_type") == "签名类型/来源"
    assert fm.get("sms_signature") == "短信签名"
    assert fm.get("specific_usage") == "具体用途"
    assert fm.get("diversion_number") == "引流号码"
    assert fm.get("link_address") == "引流链接"


def test_field_source_dispatch():
    assert field_source("carrier") == "port"
    assert field_source("enterprise_name") == "qualification"
    assert field_source("cert_image") == "image_qualification"
    assert field_source("auth_image") == "image_port"
    assert field_source("nonexistent_field") is None


def test_get_field_returns_object():
    f = get_field("sms_signature")
    assert f is not None
    assert f.name == "sms_signature"
    assert f.label == "短信签名"
    assert f.group == "签名与模板"


def test_no_duplicate_names():
    names = [f.name for f in REGISTRY]
    assert len(names) == len(set(names)), "registry 字段名重复"
```

新建 `backend/app/tests/services/__init__.py`（空文件）。

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py -v`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 registry**

新建 `backend/app/services/export_field_registry.py`：

```python
"""Export field metadata registry — single source of truth for exportable fields."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ExportField:
    name: str
    label: str
    source: str  # "qualification" | "port" | "image_qualification" | "image_port"
    group: str
    description: str = ""


REGISTRY: list[ExportField] = [
    # ── 端口信息（来源 port） ──
    ExportField("carrier", "运营商", "port", "端口信息"),
    ExportField("operation_type", "操作类型", "port", "端口信息"),
    ExportField("main_port_number", "主端口号", "port", "端口信息"),
    ExportField("sub_port_number", "子端口号", "port", "端口信息"),
    ExportField("port_range", "码号使用范围", "port", "端口信息"),
    ExportField("province", "接入省", "port", "端口信息"),
    ExportField("city", "接入地市", "port", "端口信息"),
    ExportField("port_type", "端口类型", "port", "端口信息"),
    ExportField("port_activation_date", "端口入网时间", "port", "端口信息"),
    ExportField("allow_self_extension", "是否允许自行扩展", "port", "端口信息"),
    ExportField("carrier_room", "运营商接入机房及设备", "port", "端口信息"),
    ExportField("enterprise_room", "企业接入机房及设备", "port", "端口信息"),
    ExportField("has_authorization", "是否具有授权书", "port", "端口信息"),
    ExportField("auth_start_date", "授权开始日期", "port", "端口信息"),
    ExportField("auth_end_date", "授权结束日期", "port", "端口信息"),
    ExportField("authorization_letter", "授权书", "port", "端口信息"),
    ExportField("group_code", "集团编码", "port", "端口信息"),
    ExportField("region", "所属地区", "port", "端口信息"),
    ExportField("other_room_description", "其他接入机房说明", "port", "端口信息"),
    ExportField("is_green_channel", "是否绿色通道", "port", "端口信息"),
    ExportField("blacklist_whitelist_type", "黑白名单类型", "port", "端口信息"),
    ExportField("audit_form", "端口审核表", "port", "端口信息"),
    ExportField("customer_type", "客户类型", "port", "端口信息"),

    # ── 业务信息（来源 port，沿用现有 build_field_map 归类） ──
    ExportField("business_attribute", "业务属性", "port", "业务信息"),
    ExportField("business_type", "业务类型", "port", "业务信息"),
    ExportField("business_subtype", "业务细类", "port", "业务信息"),
    ExportField("specific_usage", "具体用途", "port", "业务信息"),

    # ── 签名与模板（来源 qualification） ──
    ExportField("sms_signature", "短信签名", "qualification", "签名与模板"),
    ExportField("signature_type", "签名类型/来源", "qualification", "签名与模板"),
    ExportField("signature_verified", "是否签名校验", "qualification", "签名与模板"),
    ExportField("is_gateway_signature", "是否网关签名", "qualification", "签名与模板"),
    ExportField("sms_template_content", "短信模板内容", "qualification", "签名与模板"),
    ExportField("template_has_variable", "模板是否包含变量", "qualification", "签名与模板"),
    ExportField("template_param_type", "模板参数类型", "qualification", "签名与模板"),
    ExportField("template_param_length", "模板参数长度", "qualification", "签名与模板"),

    # ── 资质信息（来源 qualification） ──
    ExportField("enterprise_name", "企业名称", "qualification", "资质信息"),
    ExportField("cert_type", "单位证件类型", "qualification", "资质信息"),
    ExportField("cert_number", "单位证件号码", "qualification", "资质信息"),
    ExportField("app_platform_name", "APP/平台名称", "qualification", "资质信息"),
    ExportField("legal_representative_name", "法人姓名", "qualification", "资质信息"),
    ExportField("legal_representative_cert_type", "法人证件类型", "qualification", "资质信息"),
    ExportField("legal_representative_cert_number", "法人证件号码", "qualification", "资质信息"),
    ExportField("legal_representative_cert_address", "法人证件地址", "qualification", "资质信息"),
    ExportField("responsible_name", "责任人姓名", "qualification", "资质信息"),
    ExportField("responsible_cert_type", "责任人证件类型", "qualification", "资质信息"),
    ExportField("responsible_cert_number", "责任人证件号码", "qualification", "资质信息"),
    ExportField("responsible_address", "责任人证件地址", "qualification", "资质信息"),
    ExportField("responsible_phone", "责任人手机号", "qualification", "资质信息"),
    ExportField("handler_name", "经办人姓名", "qualification", "资质信息"),
    ExportField("handler_cert_type", "经办人证件类型", "qualification", "资质信息"),
    ExportField("handler_cert_number", "经办人证件号码", "qualification", "资质信息"),
    ExportField("handler_address", "经办人证件地址", "qualification", "资质信息"),
    ExportField("handler_phone", "经办人手机号", "qualification", "资质信息"),

    # ── 引流信息（来源 qualification） ──
    ExportField("diversion_number", "引流号码", "qualification", "引流信息"),
    ExportField("diversion_number_type", "引流号码类型", "qualification", "引流信息"),
    ExportField("diversion_number_usage", "引流号码用途", "qualification", "引流信息"),
    ExportField("diversion_content", "引流内容", "qualification", "引流信息"),
    ExportField("link_address", "引流链接", "qualification", "引流信息"),
    ExportField("link_type", "链接类型", "qualification", "引流信息"),

    # ── 图片材料 ──
    ExportField("cert_image", "单位证件图片", "image_qualification", "图片材料"),
    ExportField("responsible_id_front", "责任人身份证正面", "image_qualification", "图片材料"),
    ExportField("responsible_id_back", "责任人身份证反面", "image_qualification", "图片材料"),
    ExportField("handler_id_front", "法人身份证正面", "image_qualification", "图片材料"),
    ExportField("handler_id_back", "法人身份证反面", "image_qualification", "图片材料"),
    ExportField("auth_image", "授权书图片", "image_port", "图片材料"),
]


def get_field(name: str) -> ExportField | None:
    return next((f for f in REGISTRY if f.name == name), None)


def all_fields() -> list[ExportField]:
    return REGISTRY


def field_map() -> dict[str, str]:
    return {f.name: f.label for f in REGISTRY}


def field_source(name: str) -> str | None:
    f = get_field(name)
    return f.source if f else None
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/export_field_registry.py \
        backend/app/tests/services/__init__.py \
        backend/app/tests/services/test_export_field_registry.py
git commit -m "feat(services): 新增导出字段元数据字典 export_field_registry"
```

---

### Task 6: 重构 filing_tasks.py 使用 registry

**Files:**
- Modify: `backend/app/api/routes/filing_tasks.py:39-127`（删除 build_field_map + 重写 get_field_value）

**Interfaces:**
- Consumes: `field_map()`, `field_source()` from `app.services.export_field_registry`
- Produces: `get_field_value()` 通过 registry 推导 source

- [ ] **Step 1: 写失败测试**

新建 `backend/app/tests/api/routes/test_filing_tasks_export.py`：

```python
"""Regression tests for filing task export — all selected fields must appear in Excel."""
from io import BytesIO
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine
from app.models import FilingTask
from app.services.export_field_registry import REGISTRY


@pytest.fixture(scope="module", autouse=True)
def _cleanup_filing_tasks() -> Generator[None, None, None]:
    yield
    with Session(engine) as session:
        session.execute(delete(FilingTask))
        session.commit()


def _create_qualification(client, headers, name):
    r = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=headers,
        json={
            "enterprise_name": name,
            "sms_signature": "签名X",
            "signature_type": "自营签名",
            "specific_usage": "用户登录",
            "diversion_number": "13800000000",
            "link_address": "https://example.com",
            "legal_representative_cert_type": "身份证",
            "legal_representative_cert_number": "110101199001011234",
            "legal_representative_cert_address": "北京市朝阳区",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_port(client, headers, main_port_number):
    r = client.post(
        f"{settings.API_V1_STR}/port-info",
        headers=headers,
        json={
            "carrier": "中国移动",
            "main_port_number": main_port_number,
            "enterprise_name": "测试企业",
            "group_code": "G001",
            "carrier_room": "机房A",
            "enterprise_room": "机房B",
            "port_type": "短信",
            "operation_type": "新增",
            "authorization_letter": "授字001",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_export_group_all_fields(client, headers, name):
    fields = [
        {"field_name": f.name, "field_label": f.label, "sort_order": i}
        for i, f in enumerate(REGISTRY, 1)
    ]
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=headers,
        json={"name": name, "fields": fields},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_export_includes_all_registry_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers, "全字段企业")
    port_id = _create_port(client, superuser_token_headers, "10698全部")
    group_id = _create_export_group_all_fields(client, superuser_token_headers, "全字段组")

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 200, r.text
    task_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}/download",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    header_row = [c.value for c in ws[1]]

    expected_labels = {f.label for f in REGISTRY}
    actual_labels = set(header_row)
    missing = expected_labels - actual_labels
    assert not missing, f"导出缺失列: {missing}"
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py::test_export_includes_all_registry_fields -v`
Expected: FAIL（缺失多列：signature_type、specific_usage、diversion_number 等）

- [ ] **Step 3: 重构 build_field_map / get_field_value**

`backend/app/api/routes/filing_tasks.py` 顶部添加 import：

```python
from app.services.export_field_registry import field_map, field_source
```

删除 `build_field_map()` 函数（约 39-87 行）。

替换 `get_field_value()` 函数（约 90-127 行）：

```python
def get_field_value(
    qualification: QualificationInfo,
    port: PortInfo,
    field_name: str,
    allocated_sub_port: str | None = None,
) -> str:
    """Get field value via registry source dispatch."""
    if field_name == "sub_port_number" and allocated_sub_port is not None:
        return allocated_sub_port
    source = field_source(field_name)
    if source is None:
        return ""
    if source in ("image_qualification", "image_port"):
        return "[图片]"
    if source == "port":
        value = getattr(port, field_name, "")
    elif source == "qualification":
        value = getattr(qualification, field_name, "")
    else:
        return ""

    if value is None:
        return ""
    if isinstance(value, bool):
        return "是" if value else "否"
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)
```

`generate_excel()` 内部（约 line 143）：

```python
# 改前
field_map = build_field_map()
# 改后
fm = field_map()
```

约 line 162：

```python
# 改前
col_names = [f.field_name for f in sorted_fields if f.field_name in field_map]
# 改后
col_names = [f.field_name for f in sorted_fields if f.field_name in fm]
```

约 line 172（写表头）：

```python
# 改前
cell = ws.cell(row=1, column=col_idx, value=field_map[field_name])
# 改后
cell = ws.cell(row=1, column=col_idx, value=fm[field_name])
```

`img_field_names` 集合改为从 registry 推导：

```python
from app.services.export_field_registry import REGISTRY
img_field_names = {f.name for f in REGISTRY if f.source.startswith("image")}
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py -v`
Expected: PASS

- [ ] **Step 5: 跑全套回归**

Run: `cd backend && uv run pytest -x`
Expected: 全 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/filing_tasks.py \
        backend/app/tests/api/routes/test_filing_tasks_export.py
git commit -m "refactor(filing-tasks): 导出使用 export_field_registry，根治字段组勾选缺列"
```

---

### Task 7: 新增 /export-groups/registry API

**Files:**
- Modify: `backend/app/api/routes/export_groups.py`

**Interfaces:**
- Produces: `GET /api/v1/export-groups/registry` 返回 `list[{id, name, label, source, group, description}]`

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_export_groups.py`（如不存在则新建）：

```python
"""Tests for export groups API."""
from fastapi.testclient import TestClient
from app.core.config import settings


def test_registry_returns_all_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/export-groups/registry",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 30
    names = {item["name"] for item in data}
    assert "sms_signature" in names
    assert "signature_type" in names
    assert "cert_image" in names

    sig_field = next(item for item in data if item["name"] == "signature_type")
    assert sig_field["label"] == "签名类型/来源"
    assert sig_field["source"] == "qualification"
    assert sig_field["group"] == "签名与模板"
```

新建 `backend/app/tests/api/routes/test_export_groups.py`（如已存在则追加 case）。

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_export_groups.py::test_registry_returns_all_fields -v`
Expected: FAIL（404）

- [ ] **Step 3: 添加路由**

`backend/app/api/routes/export_groups.py` 顶部添加 import：

```python
from dataclasses import asdict
from app.services.export_field_registry import all_fields
```

在 `read_export_groups` 路由前添加：

```python
@router.get("/registry", response_model=list[dict])
def read_field_registry() -> Any:
    return [{**asdict(f), "id": f.name} for f in all_fields()]
```

注意：必须放在 `/{id}` 路由前，否则会被 path param 拦截。

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_export_groups.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/export_groups.py \
        backend/app/tests/api/routes/test_export_groups.py
git commit -m "feat(export-groups): 新增 /registry 接口供前端字段组弹窗拉取字段"
```

---

### Task 8: 前端字段组弹窗从 API 拉字段 + 字段搜索

**Files:**
- Create: `frontend/src/lib/api/export-fields.ts`
- Modify: `frontend/src/features/export-groups/components/export-group-dialog.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/export-groups/registry`
- Produces: 字段组弹窗渲染所有 registry 字段（按 group 分组）；顶部搜索框本地过滤；修复 `enterprise_name` 重复定义

- [ ] **Step 1: 新建 API 模块**

`frontend/src/lib/api/export-fields.ts`：

```typescript
import { api } from '@/lib/api'

export interface ExportField {
  id: string
  name: string
  label: string
  source: string
  group: string
  description?: string
}

export async function getExportFieldRegistry(): Promise<ExportField[]> {
  const res = await api.get('/export-groups/registry')
  return res.data
}
```

- [ ] **Step 2: 改 export-group-dialog.tsx**

`frontend/src/features/export-groups/components/export-group-dialog.tsx`：

1. 顶部加 import：
```tsx
import { useQuery } from '@tanstack/react-query'
import { getExportFieldRegistry, type ExportField } from '@/lib/api/export-fields'
import { Search as SearchIcon } from 'lucide-react'
```

2. 删除硬编码的 `AVAILABLE_FIELDS` 常量（约 28-91 行）。

3. 在组件内添加 query 与搜索 state：
```tsx
const [fieldSearch, setFieldSearch] = useState('')

const { data: registry = [], isLoading } = useQuery({
  queryKey: ['export-field-registry'],
  queryFn: getExportFieldRegistry,
})

const filteredFields = useMemo(() => {
  const q = fieldSearch.trim().toLowerCase()
  if (!q) return registry
  return registry.filter(
    (f) => f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
  )
}, [registry, fieldSearch])

const groupedFields = useMemo(() => {
  const map = new Map<string, ExportField[]>()
  for (const f of filteredFields) {
    if (!map.has(f.group)) map.set(f.group, [])
    map.get(f.group)!.push(f)
  }
  return Array.from(map.entries())
}, [filteredFields])
```

4. 替换原左栏 ScrollArea 内容：
```tsx
<div className="space-y-2 mb-2">
  <div className="relative">
    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="搜索字段"
      value={fieldSearch}
      onChange={(e) => setFieldSearch(e.target.value)}
      className="pl-8"
    />
  </div>
</div>
<ScrollArea className="h-[280px] rounded-md border p-2">
  {isLoading ? (
    <p className="text-sm text-muted-foreground text-center py-8">加载中...</p>
  ) : (
    <div className="space-y-3">
      {groupedFields.map(([group, fields]) => (
        <div key={group}>
          <div className="text-xs font-medium text-muted-foreground px-2 py-1">{group}</div>
          {fields.map((f) => (
            <label
              key={f.name}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
            >
              <Checkbox
                checked={selectedFields.includes(f.name)}
                onCheckedChange={() => toggleField(f.name)}
              />
              {f.label}
            </label>
          ))}
        </div>
      ))}
    </div>
  )}
</ScrollArea>
```

5. 右栏 selectedFields 渲染需要找 label——把 `AVAILABLE_FIELDS.find` 改为从 registry 找：
```tsx
const registryMap = useMemo(() => {
  const m = new Map<string, string>()
  for (const f of registry) m.set(f.name, f.label)
  return m
}, [registry])

// 渲染 selectedFields 时
<span className="flex-1 truncate">{registryMap.get(key) || key}</span>
```

6. handleSubmit 用 registryMap 找 label：
```tsx
const fields = selectedFields.map((key, idx) => ({
  field_name: key,
  field_label: registryMap.get(key) || key,
  sort_order: idx,
}))
```

- [ ] **Step 3: 跑 lint 与 build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: PASS

- [ ] **Step 4: 手动验证**

启动 dev server，打开字段组新建/编辑弹窗——应能看到分组渲染的所有字段，搜索"签名"应能定位到短信签名相关字段。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/export-fields.ts \
        frontend/src/features/export-groups/components/export-group-dialog.tsx
git commit -m "feat(export-groups): 字段组弹窗从 /registry 拉字段并按分组渲染，加搜索框"
```

---

## PR-3：子端口范围随机生成

### Task 9: FilingSubPortUsage 模型 + 迁移

**Files:**
- Create: `backend/app/models/filing_sub_port_usage.py`
- Modify: `backend/app/models/__init__.py`（导出）
- Create: alembic 迁移
- Test: 烟测

**Interfaces:**
- Produces: `FilingSubPortUsage` model class with fields: `id`, `main_port_number`, `port_number`, `carrier`, `filing_task_id` (nullable FK with SET NULL on delete), `qualification_id` (nullable FK), `generated_at`, `operator_id`；唯一约束 `(main_port_number, port_number)`

- [ ] **Step 1: 写模型烟测**

新建 `backend/app/tests/models/test_filing_sub_port_usage.py`：

```python
"""Tests for FilingSubPortUsage model."""
from app.models import FilingSubPortUsage


def test_model_table_args_has_unique_constraint():
    table = FilingSubPortUsage.__table__
    constraints = [str(c) for c in table.constraints]
    assert any("uq_main_port_sub_port" in c for c in constraints)


def test_model_fields():
    table = FilingSubPortUsage.__table__
    columns = {c.name for c in table.columns}
    expected = {
        "id", "main_port_number", "port_number", "carrier",
        "filing_task_id", "qualification_id", "generated_at", "operator_id",
    }
    assert expected <= columns


def test_filing_task_fk_set_null_on_delete():
    table = FilingSubPortUsage.__table__
    fk = list(table.columns["filing_task_id"].foreign_keys)[0]
    assert fk.ondelete == "SET NULL"
```

新建 `backend/app/tests/models/__init__.py`（空文件）。

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/models/test_filing_sub_port_usage.py -v`
Expected: FAIL（类不存在）

- [ ] **Step 3: 实现模型**

新建 `backend/app/models/filing_sub_port_usage.py`：

```python
"""Filing sub port usage — permanently reserves generated sub port numbers per main port."""
import uuid
from datetime import datetime

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class FilingSubPortUsage(SQLModel, table=True):
    __tablename__ = "filing_sub_port_usage"
    __table_args__ = (
        UniqueConstraint(
            "main_port_number", "port_number",
            name="uq_main_port_sub_port",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    main_port_number: str = Field(max_length=100, index=True)
    port_number: str = Field(max_length=100, index=True)
    carrier: str | None = Field(default=None, max_length=10)
    filing_task_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column("filing_task_id", nullable=True),
    )
    qualification_id: uuid.UUID | None = Field(default=None)
    generated_at: datetime = Field(default_factory=utcnow)
    operator_id: uuid.UUID = Field()
```

注意：FK 与 ondelete 通过 alembic 显式定义，模型层只声明 nullable。

- [ ] **Step 4: 导出 model**

`backend/app/models/__init__.py` 添加：

```python
from .filing_sub_port_usage import FilingSubPortUsage
```

并在 `__all__` 中加入 `"FilingSubPortUsage"`。

- [ ] **Step 5: 生成 alembic 迁移**

Run: `cd backend && uv run alembic revision --autogenerate -m "create filing_sub_port_usage"`

打开生成的迁移，确认含 `op.create_table("filing_sub_port_usage", ...)` 与 `UniqueConstraint`。

手动修正 `filing_task_id` FK 段：

```python
sa.Column("filing_task_id", sa.Uuid(),
          sa.ForeignKey("filing_task.id", ondelete="SET NULL"),
          nullable=True),
```

完整 upgrade：

```python
def upgrade() -> None:
    op.create_table(
        "filing_sub_port_usage",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("main_port_number", sa.String(length=100), nullable=False, index=True),
        sa.Column("port_number", sa.String(length=100), nullable=False, index=True),
        sa.Column("carrier", sa.String(length=10), nullable=True),
        sa.Column("filing_task_id", sa.Uuid(),
                  sa.ForeignKey("filing_task.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("qualification_id", sa.Uuid(),
                  sa.ForeignKey("qualification_info.id"), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("operator_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False),
        sa.UniqueConstraint("main_port_number", "port_number",
                            name="uq_main_port_sub_port"),
    )


def downgrade() -> None:
    op.drop_table("filing_sub_port_usage")
```

- [ ] **Step 6: 应用迁移并跑测试**

Run: `cd backend && uv run alembic upgrade head && uv run pytest tests/models/test_filing_sub_port_usage.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/filing_sub_port_usage.py backend/app/models/__init__.py \
        backend/app/alembic/versions/*_create_filing_sub_port_usage.py \
        backend/app/tests/models/__init__.py \
        backend/app/tests/models/test_filing_sub_port_usage.py
git commit -m "feat(models): 新增 FilingSubPortUsage 占用记录表"
```

---

### Task 10: CRUD 层

**Files:**
- Create: `backend/app/crud/filing_sub_port_usage.py`
- Modify: `backend/app/crud/__init__.py`（导出）
- Test: `backend/app/tests/crud/test_filing_sub_port_usage.py`

**Interfaces:**
- Produces: `get_used_numbers(session, main_port_number) -> set[str]`；`count_used_in_range(session, main_port_number, range_start, range_end) -> int`；`bulk_create_usages(session, records: list[dict]) -> None`；`list_usages_by_task(session, filing_task_id) -> list[FilingSubPortUsage]`

- [ ] **Step 1: 写失败测试**

新建 `backend/app/tests/crud/test_filing_sub_port_usage.py`：

```python
"""Tests for filing_sub_port_usage CRUD."""
import uuid

from sqlmodel import Session

from app.core.db import engine
from app.crud.filing_sub_port_usage import (
    bulk_create_usages, count_used_in_range,
    get_used_numbers, list_usages_by_task,
)


def _make_record(main_port_number="10698A", port_number="100001", **kwargs):
    return {
        "main_port_number": main_port_number,
        "port_number": port_number,
        "operator_id": uuid.uuid4(),
        **kwargs,
    }


def test_get_used_numbers_returns_set():
    with Session(engine) as session:
        bulk_create_usages(session, [
            _make_record("10698X", "100001"),
            _make_record("10698X", "100002"),
            _make_record("10698Y", "200001"),
        ])
        session.commit()
        used_x = get_used_numbers(session, "10698X")
        assert used_x == {"100001", "100002"}


def test_count_used_in_range():
    with Session(engine) as session:
        bulk_create_usages(session, [
            _make_record("10698Z", "100001"),
            _make_record("10698Z", "100005"),
            _make_record("10698Z", "100010"),
        ])
        session.commit()
        # 范围 100000-100005 内有 2 个
        assert count_used_in_range(session, "10698Z", 100000, 100005) == 2


def test_list_usages_by_task():
    task_id = uuid.uuid4()
    with Session(engine) as session:
        bulk_create_usages(session, [
            _make_record("10698T", "100001", filing_task_id=task_id),
            _make_record("10698T", "100002", filing_task_id=task_id),
        ])
        session.commit()
        usages = list_usages_by_task(session, task_id)
        assert len(usages) == 2
```

新建 `backend/app/tests/crud/__init__.py`（空文件，如已存在跳过）。

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/crud/test_filing_sub_port_usage.py -v`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 CRUD**

新建 `backend/app/crud/filing_sub_port_usage.py`：

```python
"""CRUD for FilingSubPortUsage."""
import uuid

from sqlmodel import Session, func, select

from app.models import FilingSubPortUsage


def get_used_numbers(session: Session, main_port_number: str) -> set[str]:
    stmt = select(FilingSubPortUsage.port_number).where(
        FilingSubPortUsage.main_port_number == main_port_number
    )
    return set(session.exec(stmt).all())


def count_used_in_range(
    session: Session,
    main_port_number: str,
    range_start: int,
    range_end: int,
) -> int:
    width = len(str(range_end))
    start_str = str(range_start).zfill(width)
    end_str = str(range_end).zfill(width)
    stmt = select(func.count()).select_from(FilingSubPortUsage).where(
        FilingSubPortUsage.main_port_number == main_port_number,
        FilingSubPortUsage.port_number >= start_str,
        FilingSubPortUsage.port_number <= end_str,
    )
    return int(session.exec(stmt).one())


def bulk_create_usages(session: Session, records: list[dict]) -> None:
    objs = [FilingSubPortUsage(**r) for r in records]
    session.add_all(objs)
    session.flush()


def list_usages_by_task(
    session: Session, filing_task_id: uuid.UUID
) -> list[FilingSubPortUsage]:
    stmt = select(FilingSubPortUsage).where(
        FilingSubPortUsage.filing_task_id == filing_task_id
    )
    return list(session.exec(stmt).all())
```

- [ ] **Step 4: 导出**

`backend/app/crud/__init__.py` 追加：

```python
from .filing_sub_port_usage import (
    bulk_create_usages,
    count_used_in_range,
    get_used_numbers,
    list_usages_by_task,
)

__all__ += [
    "bulk_create_usages",
    "count_used_in_range",
    "get_used_numbers",
    "list_usages_by_task",
]
```

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/crud/test_filing_sub_port_usage.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/crud/filing_sub_port_usage.py backend/app/crud/__init__.py \
        backend/app/tests/crud/test_filing_sub_port_usage.py \
        backend/app/tests/crud/__init__.py
git commit -m "feat(crud): 新增 FilingSubPortUsage CRUD（占用查询、范围计数、批量插入）"
```

---

### Task 11: 分配算法 sub_port_allocator.py

**Files:**
- Create: `backend/app/services/sub_port_allocator.py`
- Test: `backend/app/tests/services/test_sub_port_allocator.py`

**Interfaces:**
- Consumes: `get_used_numbers`, `bulk_create_usages`
- Produces: `SubPortRangeExhausted` exception；`SubPortConflict` exception；`allocate_sub_ports(session, main_port_numbers, range_start, range_end, qualifications, operator_id, filing_task_id) -> dict[str, list[tuple[QualificationInfo, str]]]`

- [ ] **Step 1: 写失败测试**

新建 `backend/app/tests/services/test_sub_port_allocator.py`：

```python
"""Tests for sub port allocator."""
import uuid

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from app.core.db import engine
from app.models import QualificationInfo
from app.services.sub_port_allocator import (
    SubPortConflict,
    SubPortRangeExhausted,
    allocate_sub_ports,
)


def _make_qual(name: str) -> QualificationInfo:
    return QualificationInfo(
        enterprise_name=name,
        legal_representative_cert_type=None,
        legal_representative_cert_number=None,
        legal_representative_cert_address=None,
    )


def test_allocate_basic():
    """3 主端口 × 2 资质 → 6 个号码，每主端口下不重复"""
    quals = [_make_qual("企业A"), _make_qual("企业B")]
    with Session(engine) as session:
        # 先持久化资质
        for q in quals:
            session.add(q)
        session.commit()
        for q in quals:
            session.refresh(q)

        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698A", "10698B", "10698C"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=uuid.uuid4(),
            filing_task_id=uuid.uuid4(),
        )
        assert len(result) == 3
        for mpn, pairs in result.items():
            assert len(pairs) == 2
            numbers = [num for _, num in pairs]
            assert len(numbers) == len(set(numbers)), f"{mpn} 下分配重复"


def test_allocate_excludes_history():
    """已占用的号码不再分配"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        session.commit()
        session.refresh(quals[0])

        # 预占用 (10698X, 100001)
        allocate_sub_ports(
            session=session,
            main_port_numbers=["10698X"],
            range_start=100001,
            range_end=100002,
            qualifications=quals,
            operator_id=uuid.uuid4(),
            filing_task_id=uuid.uuid4(),
        )

        # 再分配一个，应该拿到 100002
        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698X"],
            range_start=100001,
            range_end=100002,
            qualifications=quals,
            operator_id=uuid.uuid4(),
            filing_task_id=uuid.uuid4(),
        )
        assert result["10698X"][0][1] == "100002"


def test_allocate_range_exhausted():
    """范围耗尽抛 409"""
    quals = [_make_qual("企业A"), _make_qual("企业B"), _make_qual("企业C")]
    with Session(engine) as session:
        for q in quals:
            session.add(q)
        session.commit()
        for q in quals:
            session.refresh(q)

        with pytest.raises(SubPortRangeExhausted) as exc_info:
            allocate_sub_ports(
                session=session,
                main_port_numbers=["10698Y"],
                range_start=100001,
                range_end=100002,  # 只 2 个，需要 3 个
                qualifications=quals,
                operator_id=uuid.uuid4(),
                filing_task_id=uuid.uuid4(),
            )
        assert exc_info.value.status_code == 409
        assert "10698Y" in exc_info.value.detail


def test_allocate_concurrent_safety():
    """并发分配：两线程同一主端口，结果不重复"""
    import threading

    quals = [_make_qual("并发企业")]
    with Session(engine) as setup_session:
        setup_session.add(quals[0])
        setup_session.commit()
        setup_session.refresh(quals[0])
        qual_id = quals[0].id

    results: list[str] = []
    lock = threading.Lock()

    def worker():
        with Session(engine) as session:
            qual = session.get(QualificationInfo, qual_id)
            try:
                result = allocate_sub_ports(
                    session=session,
                    main_port_numbers=["10698CON"],
                    range_start=200001,
                    range_end=200100,
                    qualifications=[qual],
                    operator_id=uuid.uuid4(),
                    filing_task_id=uuid.uuid4(),
                )
                with lock:
                    results.append(result["10698CON"][0][1])
            except SubPortConflict:
                pass  # 重试耗尽视为可接受

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # 5 个线程并发，results 收集成功分配的号码
    assert len(results) == len(set(results)), f"并发分配重复: {results}"
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/services/test_sub_port_allocator.py -v`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现分配算法**

新建 `backend/app/services/sub_port_allocator.py`：

```python
"""Sub port allocator — random allocation within range, permanently unique per main port."""
import random
import uuid

from fastapi import HTTPException
from sqlmodel import Session

from app.crud.filing_sub_port_usage import (
    bulk_create_usages,
    get_used_numbers,
)
from app.models import QualificationInfo

MAX_RETRY = 3


class SubPortRangeExhausted(HTTPException):
    def __init__(self, main_port_number: str, need: int, available: int,
                 range_start: int, range_end: int):
        super().__init__(
            status_code=409,
            detail=(
                f"主端口 {main_port_number} 在范围 {range_start}-{range_end} 内"
                f"可用子端口号不足（需要 {need} 个，剩余 {available} 个），"
                f"请扩大范围或更换主端口"
            ),
        )


class SubPortConflict(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=409,
            detail="子端口分配冲突，请重试",
        )


def allocate_sub_ports(
    session: Session,
    main_port_numbers: list[str],
    range_start: int,
    range_end: int,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """按资质 × 主端口笛卡尔积分配子端口。

    Returns: {main_port_number: [(qualification, sub_port_number), ...]}
    """
    need_per_main = len(qualifications)
    if need_per_main == 0 or not main_port_numbers:
        return {}

    range_size = range_end - range_start + 1
    if range_size < need_per_main:
        raise SubPortRangeExhausted(
            main_port_numbers[0], need_per_main, range_size, range_start, range_end,
        )

    width = len(str(range_end))

    for attempt in range(MAX_RETRY):
        try:
            result: dict[str, list[tuple[QualificationInfo, str]]] = {}
            records: list[dict] = []
            for mpn in main_port_numbers:
                used = get_used_numbers(session, mpn)
                all_in_range = {
                    str(n).zfill(width)
                    for n in range(range_start, range_end + 1)
                }
                available = list(all_in_range - used)
                if len(available) < need_per_main:
                    raise SubPortRangeExhausted(
                        mpn, need_per_main, len(available), range_start, range_end,
                    )
                chosen = random.sample(available, need_per_main)
                result[mpn] = []
                for qual, num in zip(qualifications, chosen):
                    result[mpn].append((qual, num))
                    records.append({
                        "main_port_number": mpn,
                        "port_number": num,
                        "filing_task_id": filing_task_id,
                        "qualification_id": qual.id,
                        "operator_id": operator_id,
                    })
            bulk_create_usages(session, records)
            session.commit()
            return result
        except SubPortRangeExhausted:
            raise
        except Exception:
            session.rollback()
            if attempt == MAX_RETRY - 1:
                raise SubPortConflict()
            continue
    raise SubPortConflict()
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/services/test_sub_port_allocator.py -v`
Expected: PASS（并发测试可能偶发不稳定，重跑应通过）

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sub_port_allocator.py \
        backend/app/tests/services/test_sub_port_allocator.py
git commit -m "feat(services): 新增 sub_port_allocator 范围随机分配算法（并发安全）"
```

---

### Task 12: 报备创建流程改造（后端）

**Files:**
- Modify: `backend/app/models/filing_task.py`（FilingTaskCreate 加字段）
- Modify: `backend/app/api/routes/filing_tasks.py::create_task`（集成分配算法）
- Modify: `backend/app/api/routes/filing_tasks.py::generate_excel`（支持 allocated_sub_ports）
- Test: `backend/app/tests/api/routes/test_filing_tasks_export.py`（追加 case）

**Interfaces:**
- Consumes: `allocate_sub_ports`，`FilingSubPortUsage`
- Produces: `FilingTaskCreate.auto_allocate_sub_ports/sub_port_range_start/sub_port_range_end`；`generate_excel(allocated_sub_ports: dict | None, auto_allocate_sub_ports: bool)`

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_filing_tasks_export.py`：

```python
def test_create_filing_task_with_auto_sub_ports(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """自动分配模式下，导出含随机生成的子端口号"""
    qual_id = _create_qualification(client, superuser_token_headers, "自动分配企业")
    # 主端口行（sub_port_number 为空）
    port_id = _create_port(client, superuser_token_headers, "10698AUTO")

    # 仅勾选主端口号、子端口号两列的字段组
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "子端口导出组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
                {"field_name": "sub_port_number", "field_label": "子端口号", "sort_order": 2},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 300001,
            "sub_port_range_end": 300100,
        },
    )
    assert r.status_code == 200, r.text
    task_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}/download",
        headers=superuser_token_headers,
    )
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    # 第 2 行第 2 列是子端口号
    sub_port_value = ws.cell(row=2, column=2).value
    assert sub_port_value is not None
    assert str(sub_port_value).startswith("3000")  # 在范围内


def test_create_filing_task_range_exhausted_409(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """范围耗尽时 409"""
    qual_id = _create_qualification(client, superuser_token_headers, "范围耗尽企业")
    # 创建 2 个资质，但范围只够 1 个
    qual_id_2 = _create_qualification(client, superuser_token_headers, "范围耗尽企业2")
    port_id = _create_port(client, superuser_token_headers, "10698EXH")

    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "耗尽组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id, qual_id_2],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 400001,
            "sub_port_range_end": 400001,  # 只 1 个号码，需要 2 个
        },
    )
    assert r.status_code == 409
    assert "10698EXH" in r.json()["detail"]


def test_delete_filing_task_keeps_usage(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """删除报备任务后，占用记录仍存在"""
    from sqlmodel import Session, select
    from app.core.db import engine
    from app.models import FilingSubPortUsage

    qual_id = _create_qualification(client, superuser_token_headers, "保留占用企业")
    port_id = _create_port(client, superuser_token_headers, "10698KEEP")

    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "保留组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
                {"field_name": "sub_port_number", "field_label": "子端口号", "sort_order": 2},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 500001,
            "sub_port_range_end": 500100,
        },
    )
    task_id = r.json()["id"]

    # 删除报备任务
    r = client.delete(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # 占用记录仍在，filing_task_id 变 None
    with Session(engine) as session:
        stmt = select(FilingSubPortUsage).where(
            FilingSubPortUsage.main_port_number == "10698KEEP"
        )
        usages = list(session.exec(stmt).all())
        assert len(usages) >= 1
        for u in usages:
            assert u.filing_task_id is None
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py::test_create_filing_task_with_auto_sub_ports -v`
Expected: FAIL（422 / 自动分配未实现）

- [ ] **Step 3: 改 FilingTaskCreate**

`backend/app/models/filing_task.py`：

```python
class FilingTaskCreate(SQLModel):
    task_name: str | None = None
    qualification_ids: list[uuid.UUID]
    port_ids: list[uuid.UUID]
    export_group_id: uuid.UUID
    group_by_field: str | None = None
    # 新增
    auto_allocate_sub_ports: bool = False
    sub_port_range_start: int | None = None
    sub_port_range_end: int | None = None
```

- [ ] **Step 4: 改 create_task 集成分配**

`backend/app/api/routes/filing_tasks.py` 顶部添加 import：

```python
from app.services.sub_port_allocator import allocate_sub_ports, SubPortRangeExhausted
```

在 `create_task` 函数内，生成 Excel 前插入：

```python
allocated_sub_ports: dict[tuple[uuid.UUID, str], str] = {}
auto_allocate = create.auto_allocate_sub_ports

if auto_allocate:
    if not (create.sub_port_range_start and create.sub_port_range_end):
        raise HTTPException(status_code=400, detail="自动分配子端口时必须提供范围")
    if create.sub_port_range_start > create.sub_port_range_end:
        raise HTTPException(status_code=400, detail="子端口范围起始必须 ≤ 结束")

    main_ports = [p for p in selected_ports if not p.sub_port_number]
    if not main_ports:
        raise HTTPException(status_code=400, detail="未找到主端口行（sub_port_number 为空的端口记录）")
    main_port_numbers = sorted({p.main_port_number for p in main_ports})

    allocation = allocate_sub_ports(
        session=session,
        main_port_numbers=main_port_numbers,
        range_start=create.sub_port_range_start,
        range_end=create.sub_port_range_end,
        qualifications=qualifications,
        operator_id=current_user.id,
        filing_task_id=task.id,
    )
    for mpn, pairs in allocation.items():
        for qual, num in pairs:
            allocated_sub_ports[(qual.id, mpn)] = num
```

调用 `generate_excel` 传入：

```python
excel_bytes = generate_excel(
    qualifications=qualifications,
    ports=selected_ports,
    export_group=export_group,
    group_by_field=create.group_by_field,
    qual_images=qual_images,
    allocated_sub_ports=allocated_sub_ports,
    auto_allocate_sub_ports=auto_allocate,
)
```

- [ ] **Step 5: 改 generate_excel 支持分配**

`backend/app/api/routes/filing_tasks.py` 内 `generate_excel` 签名改为：

```python
def generate_excel(
    qualifications: list[QualificationInfo],
    ports: list[PortInfo],
    export_group: ExportGroup,
    group_by_field: str | None = None,
    qual_images: dict[uuid.UUID, dict[str, bytes]] | None = None,
    allocated_sub_ports: dict[tuple[uuid.UUID, str], str] | None = None,
    auto_allocate_sub_ports: bool = False,
) -> io.BytesIO:
```

行迭代逻辑改：

```python
# 改前
rows: list[tuple[QualificationInfo, PortInfo]] = [
    (q, p) for q in qualifications for p in ports
]

# 改后
if auto_allocate_sub_ports:
    main_port_dict: dict[str, PortInfo] = {}
    for p in ports:
        if not p.sub_port_number and p.main_port_number not in main_port_dict:
            main_port_dict[p.main_port_number] = p
    rows = [
        (q, main_port_dict[mpn], allocated_sub_ports.get((q.id, mpn), ""))
        for q in qualifications
        for mpn in main_port_dict
    ]
else:
    rows = [(q, p, None) for q in qualifications for p in ports]
```

每行处理：

```python
for q, p, allocated_sub in rows:
    if group_by_field:
        current_value = get_field_value(q, p, group_by_field, allocated_sub)
        # ... 同原逻辑
    for col_idx, field_name in enumerate(col_names, 1):
        value = get_field_value(q, p, field_name, allocated_sub)
        cell = ws.cell(row=row_idx, column=col_idx, value=value)
        cell.border = thin_border
    # ... 图片处理不变
    row_idx += 1
```

- [ ] **Step 6: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py -v`
Expected: PASS

- [ ] **Step 7: 跑全套回归**

Run: `cd backend && uv run pytest -x`
Expected: 全 PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/filing_task.py backend/app/api/routes/filing_tasks.py \
        backend/app/tests/api/routes/test_filing_tasks_export.py
git commit -m "feat(filing-tasks): 新建报备支持自动分配子端口范围"
```

---

### Task 13: 新增 /filing-tasks/sub-port-availability API

**Files:**
- Modify: `backend/app/api/routes/filing_tasks.py`
- Test: `backend/app/tests/api/routes/test_filing_tasks_export.py`

**Interfaces:**
- Produces: `GET /api/v1/filing-tasks/sub-port-availability?main_port_numbers=A,B&range_start=100001&range_end=199999` 返回 `{main_port_number: {used, total, available}}`

- [ ] **Step 1: 写失败测试**

追加到 `test_filing_tasks_export.py`：

```python
def test_sub_port_availability(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/sub-port-availability",
        headers=superuser_token_headers,
        params={
            "main_port_numbers": "10698AVAIL",
            "range_start": 100001,
            "range_end": 100010,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "10698AVAIL" in data
    info = data["10698AVAIL"]
    assert info["total"] == 10
    assert info["available"] + info["used"] == info["total"]
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py::test_sub_port_availability -v`
Expected: FAIL（404）

- [ ] **Step 3: 添加路由**

`backend/app/api/routes/filing_tasks.py` 在 `read_tasks` 路由前添加：

```python
@router.get("/sub-port-availability")
def check_sub_port_availability(
    session: SessionDep,
    _current_user: CurrentUser,
    main_port_numbers: str = Query(...),
    range_start: int = Query(...),
    range_end: int = Query(...),
) -> dict:
    from app.crud.filing_sub_port_usage import count_used_in_range
    total = range_end - range_start + 1
    result = {}
    for mpn in main_port_numbers.split(","):
        mpn = mpn.strip()
        if not mpn:
            continue
        used = count_used_in_range(session, mpn, range_start, range_end)
        result[mpn] = {
            "used": used,
            "total": total,
            "available": max(0, total - used),
        }
    return result
```

注意：必须放在 `/{id}` 路由前，否则会被 path param 拦截。

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/filing_tasks.py \
        backend/app/tests/api/routes/test_filing_tasks_export.py
git commit -m "feat(filing-tasks): 新增子端口可用性查询接口"
```

---

### Task 14: 前端 5 步流程改造

**Files:**
- Modify: `frontend/src/features/filing-management/create.tsx`
- Create: `frontend/src/lib/api/filing-sub-port-availability.ts`
- Modify: `frontend/src/lib/api/types.ts`（FilingTaskCreate 类型）

**Interfaces:**
- Consumes: `GET /filing-tasks/sub-port-availability`
- Produces: 5 步流程；Step 2 只展示主端口行；Step 3 配置子端口范围

- [ ] **Step 1: 加 API 类型与函数**

`frontend/src/lib/api/types.ts` 内 `FilingTaskCreate` 接口加字段：

```typescript
export interface FilingTaskCreate {
  // ... 现有字段
  auto_allocate_sub_ports?: boolean
  sub_port_range_start?: number
  sub_port_range_end?: number
}
```

新建 `frontend/src/lib/api/filing-sub-port-availability.ts`：

```typescript
import { api } from '@/lib/api'

export interface SubPortAvailability {
  used: number
  total: number
  available: number
}

export async function getSubPortAvailability(
  mainPortNumbers: string[],
  rangeStart: number,
  rangeEnd: number
): Promise<Record<string, SubPortAvailability>> {
  const res = await api.get('/filing-tasks/sub-port-availability', {
    params: {
      main_port_numbers: mainPortNumbers.join(','),
      range_start: rangeStart,
      range_end: rangeEnd,
    },
  })
  return res.data
}
```

- [ ] **Step 2: 改 create.tsx**

`frontend/src/features/filing-management/create.tsx`：

1. 顶部加 import：
```tsx
import { getSubPortAvailability } from '@/lib/api/filing-sub-port-availability'
```

2. Step 类型改为：
```tsx
type Step = 1 | 2 | 3 | 4 | 5
```

3. 加状态：
```tsx
const [subPortRangeStart, setSubPortRangeStart] = useState('100001')
const [subPortRangeEnd, setSubPortRangeEnd] = useState('199999')
```

4. 步骤 2 端口选择改为只展示主端口行（过滤 `!p.sub_port_number`）：

```tsx
const mainPortData = useMemo(() => {
  return {
    ...portData,
    data: (portData?.data ?? []).filter((p) => !p.sub_port_number),
  }
}, [portData])

// 把 useQuery 替换或在 filteredGroups 中过滤
```

在 `filteredGroups` 里加一行：
```tsx
const portsForSelection = allPorts.filter((p) => !p.sub_port_number)
// 在 portGroups / filteredGroups 里用 portsForSelection 代替 allPorts
```

5. 步骤 3 改为"配置子端口范围"：
```tsx
{step === 3 && (
  <Card>
    <CardHeader>
      <CardTitle>配置子端口范围</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">起始号码</label>
          <Input
            value={subPortRangeStart}
            onChange={(e) => setSubPortRangeStart(e.target.value)}
            className="w-40"
            placeholder="100001"
          />
        </div>
        <span className="pb-2 text-muted-foreground">-</span>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">结束号码</label>
          <Input
            value={subPortRangeEnd}
            onChange={(e) => setSubPortRangeEnd(e.target.value)}
            className="w-40"
            placeholder="199999"
          />
        </div>
      </div>

      <RangeAvailability
        mainPortNumbers={selectedPortIdList
          .map((id) => allPorts.find((p) => p.id === id)?.main_port_number)
          .filter(Boolean) as string[]}
        rangeStart={Number(subPortRangeStart) || 0}
        rangeEnd={Number(subPortRangeEnd) || 0}
        needCount={selectedIds.length}
      />

      <div className="rounded bg-muted/50 p-3 text-sm">
        预计生成 {selectedIds.length * selectedGroupCount} 个子端口
        （资质 {selectedIds.length} × 主端口 {selectedGroupCount}）
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
        </Button>
        <Button
          onClick={() => setStep(4)}
          disabled={
            !/^\d+$/.test(subPortRangeStart) ||
            !/^\d+$/.test(subPortRangeEnd) ||
            Number(subPortRangeStart) > Number(subPortRangeEnd)
          }
        >
          下一步 <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

`RangeAvailability` 是一个内部小组件，调 `useQuery` 拉数据：

```tsx
function RangeAvailability({
  mainPortNumbers, rangeStart, rangeEnd, needCount,
}: {
  mainPortNumbers: string[]
  rangeStart: number
  rangeEnd: number
  needCount: number
}) {
  const { data } = useQuery({
    queryKey: ['sub-port-availability', mainPortNumbers, rangeStart, rangeEnd],
    queryFn: () => getSubPortAvailability(mainPortNumbers, rangeStart, rangeEnd),
    enabled: mainPortNumbers.length > 0 && rangeStart > 0 && rangeEnd > rangeStart,
  })

  if (!data) return null
  return (
    <div className="space-y-1 rounded border p-3 text-sm">
      {mainPortNumbers.map((mpn) => {
        const info = data[mpn]
        if (!info) return null
        const insufficient = info.available < needCount
        return (
          <div key={mpn} className={insufficient ? 'text-destructive' : ''}>
            主端口 {mpn}: 可用 {info.available} / {info.total}
            {insufficient && ` (不足，需要 ${needCount})`}
          </div>
        )
      })}
    </div>
  )
}
```

6. 原 Step 3（配置导出）变 Step 4，原 Step 4（确认）变 Step 5。导航 onClick 全部 `+1`：

```tsx
// 旧的 step === 3 → 改为 step === 4
// 旧的 step === 4 → 改为 step === 5
// 步骤指示器从 [1,2,3,4] → [1,2,3,4,5]，标题映射更新
```

7. `handleCreate` 提交时增加自动分配参数：

```tsx
createMutation.mutate(
  {
    qualification_ids: selectedIds,
    port_ids: selectedPortIdList,
    export_group_id: exportGroupId,
    group_by_field: groupByField === '__none__' ? undefined : (groupByField || undefined),
    auto_allocate_sub_ports: true,
    sub_port_range_start: Number(subPortRangeStart),
    sub_port_range_end: Number(subPortRangeEnd),
  },
  // ... onSuccess / onError 同前
)
```

8. 步骤指示器更新（顶部）：

```tsx
{([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
  // ... s === 1 ? '选择资质' : s === 2 ? '选择主端口' : s === 3 ? '子端口范围' : s === 4 ? '配置导出' : '确认生成'
))}
```

- [ ] **Step 3: 跑 lint 与 build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: PASS

- [ ] **Step 4: 手动验证**

启动 dev server，走一遍 5 步流程：
- Step 1：选资质
- Step 2：选主端口（应只见 sub_port_number 为空的行）
- Step 3：输入范围 100001-199999，看可用数量
- Step 4：选字段组
- Step 5：确认 → 生成 Excel，下载查看含随机子端口号

再次走一遍（同样主端口）：
- 应看到可用数量减少；生成的子端口号不重复

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/filing-sub-port-availability.ts \
        frontend/src/lib/api/types.ts \
        frontend/src/features/filing-management/create.tsx
git commit -m "feat(filing-management): 新建报备改造为 5 步流程，支持子端口范围输入"
```

---

### Task 15: 最终验收测试 + 文档

**Files:**
- Verify: 所有 P0 验收清单
- Modify: `docs/报备平台用户问题与优化方向汇总.md`（标注 P0 已完成项）

**Interfaces:** N/A

- [ ] **Step 1: 跑后端全测**

Run: `cd backend && uv run pytest -v`
Expected: 全 PASS

- [ ] **Step 2: 跑后端 lint / mypy**

Run: `cd backend && uv run ruff check . && uv run mypy .`
Expected: 无 error

- [ ] **Step 3: 跑前端 lint / build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: 无 error

- [ ] **Step 4: 手动跑一遍验收清单**

参照 spec 第六章验收清单逐项确认：

- [ ] 资质导入时，法人证件类型/号码/地址为空不会阻塞导入
- [ ] 端口信息导入/编辑时，操作类型、集团编码为空不阻塞
- [ ] 字段组选择"签名类型/来源"等任意字段后，导出文件中出现对应列
- [ ] 字段组新增字段后，导出文件中能同步出现新增字段
- [ ] 导出结果中能正确显示具体短信签名
- [ ] 新建报备支持输入类似 `100001-199999` 的子端口范围
- [ ] 同一主端口下已生成过的子端口不会再次生成
- [ ] 子端口范围耗尽时，系统给出明确错误提示

- [ ] **Step 5: Commit 验收标记**

```bash
git add docs/报备平台用户问题与优化方向汇总.md
git commit -m "docs: P0 优化验收完成，标注已修复项"
```

- [ ] **Step 6: 推送分支**

按项目约定，main 分支开发直接推送：

```bash
git push origin main
```

---

## 实施顺序总览

| Task | 子项 | PR | 主要交付 |
|---|---|---|---|
| 1 | A | PR-1 | 模型 nullable + 迁移 |
| 2 | A | PR-1 | 资质导入去除硬校验 |
| 3 | A | PR-1 | 端口导入去除硬校验 |
| 4 | A | PR-1 | 前端表单去除必填 |
| 5 | B | PR-2 | 字段元数据字典 |
| 6 | B | PR-2 | filing_tasks 重构使用 registry |
| 7 | B | PR-2 | /registry API |
| 8 | B | PR-2 | 前端字段组弹窗改造 |
| 9 | C | PR-3 | FilingSubPortUsage 模型 + 迁移 |
| 10 | C | PR-3 | CRUD 层 |
| 11 | C | PR-3 | 分配算法 |
| 12 | C | PR-3 | 报备创建流程改造 |
| 13 | C | PR-3 | 子端口可用性 API |
| 14 | C | PR-3 | 前端 5 步流程 |
| 15 | 全部 | 全部 | 最终验收 |

每个 Task 独立 commit；PR 边界处可考虑打 tag 或 push 后等待业务验证。
