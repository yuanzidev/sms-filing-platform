# 资质导入模板对齐新版 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把资质管理导入模板的 45 列顺序对齐业务方新版 Excel，完成 4 个字段改名和 1 个图片字段新增，并回填历史 `FileAttachment.field_name`。

**Architecture:** 后端 `_QUALIFICATION_HEADERS` 重排 + `header_to_field` 同步改名；filing_tasks.py 两处中英图片映射同步更新（logical key 保留）；新建 Alembic 数据迁移用 3 条 UPDATE 回填历史 `field_name`；前端三个对话框同步改 label 和 imageFields 列表。导入解析按中文字段名匹配（不依赖列号），所以列顺序变更不会破坏导入。

**Tech Stack:** FastAPI + SQLModel + Alembic + openpyxl（后端）；React + TypeScript + TanStack Query + shadcn/ui（前端）；pytest（后端测试）。

## Global Constraints

- 数据库 `qualification_info` 表结构**不变**（不加列、不删列、不改列名）。
- `link_address` 数据库列名保留，仅前端 label 与 Excel 表头改为「引流链接」。
- filing_tasks 的 logical key（`handler_id_front` / `handler_id_back` 等）**保留不变**，仅同步中文映射值。
- 报备任务图片范围**不扩大**（不加入「引流号码举证附件」「引流链接举证」）。
- 所有 Chinese 字符串精确匹配 spec 第二节「字段映射」表，注意全角字符。
- Git commit 信息使用中文，不附 AI 署名。
- 项目直接在 main 分支开发，不新建分支。

## File Structure

| 文件 | 改动类型 | 责任 |
|---|---|---|
| `backend/app/api/routes/qualifications.py` | 修改 | 重写 `_QUALIFICATION_HEADERS`、`example_data`、`header_to_field`，调整 `cell_images` 位置 |
| `backend/app/api/routes/filing_tasks.py` | 修改 | `build_field_map()` 与 `_CN_TO_LOGICAL_IMG` 两处图片字段中文同步 |
| `backend/app/alembic/versions/<new>_qualification_field_name_backfill.py` | 新建 | 3 条 UPDATE 回填 `file_attachment.field_name` |
| `backend/app/tests/api/routes/test_qualifications.py` | 修改 | 新增列顺序断言 + 改名后导入解析测试 |
| `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx` | 修改 | `imageFields` 改名/新增；`链接地址` label 改名 |
| `frontend/src/features/qualifications/components/qualification-dialog.tsx` | 修改 | `IMAGE_FIELDS` 改名/新增；`链接地址` FormLabel 改名 |
| `frontend/src/features/export-groups/components/export-group-dialog.tsx` | 修改 | `link_address` label 改名 |

---

## Task 1: 后端 qualifications.py — 模板表头重排与导入映射同步

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:43-88`（`_QUALIFICATION_HEADERS`）
- Modify: `backend/app/api/routes/qualifications.py:104-116`（`example_data`）
- Modify: `backend/app/api/routes/qualifications.py:146`（`cell_images` key）
- Modify: `backend/app/api/routes/qualifications.py:210`（`header_to_field`「链接地址」项）
- Test: `backend/app/tests/api/routes/test_qualifications.py`

**Interfaces:**
- Consumes: 无（独立改）
- Produces: `GET /qualifications/template` 返回的 xlsx 表头第 1 行按 spec 第二节 45 列顺序；`POST /qualifications/import` 接受新中文表头「引流链接」作为 `link_address` 的来源。

- [ ] **Step 1: 在测试文件末尾追加失败测试**

在 `backend/app/tests/api/routes/test_qualifications.py` 末尾追加：

```python
def test_template_column_order_matches_new_spec(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO
    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template", headers=superuser_token_headers
    )
    assert r.status_code == 200
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    headers = [c.value for c in ws[1]]
    # 新模板 45 列关键位置断言
    assert headers[13] == "引流链接", f"col14 应为「引流链接」，实际：{headers[13]}"
    assert headers[15] == "引流号码举证附件", f"col16 应为「引流号码举证附件」，实际：{headers[15]}"
    assert headers[16] == "引流链接举证", f"col17 应为「引流链接举证」，实际：{headers[16]}"
    assert headers[20] == "法人身份证正面", f"col21 应为「法人身份证正面」，实际：{headers[20]}"
    assert headers[21] == "法人身份证反面", f"col22 应为「法人身份证反面」，实际：{headers[21]}"
    # 旧名不应存在
    assert "链接地址" not in headers
    assert "经办人身份证正面" not in headers
    assert "经办人身份证反面" not in headers
    assert "引流举证附件" not in headers
    # 总列数
    assert len([h for h in headers if h]) == 45


def test_import_accepts_renamed_link_address_header(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = [
        "企业名称", "法人证件类型", "法人证件号码", "法人证件地址", "引流链接",
    ]
    rows = [["测试企业链接", "身份证", "110101199001011234", "北京市朝阳区XX路1号", "https://example.com"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1
    # 验证值确实落到 link_address 字段
    list_r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"enterprise_name": "测试企业链接"},
    )
    assert list_r.status_code == 200
    item = list_r.json()["data"][0]
    assert item["link_address"] == "https://example.com"
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_template_column_order_matches_new_spec app/tests/api/routes/test_qualifications.py::test_import_accepts_renamed_link_address_header -v
```
Expected: 两个测试都 FAIL（当前表头 col14 是「链接地址」，col16/17 是其他值；`header_to_field` 没有「引流链接」键，导入会因 `link_address` 字段拿不到值而失败断言）。

- [ ] **Step 3: 重写 `_QUALIFICATION_HEADERS`（第 43-88 行）**

把整段替换为（按 spec 第二节 45 列顺序）：

```python
_QUALIFICATION_HEADERS = [
    "企业名称",
    "单位证件号码",
    "法人姓名",
    "法人证件类型",
    "法人证件号码",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人手机号",
    "短信签名",
    "签名类型/来源",
    "短信模板内容",
    "引流号码",
    "引流链接",
    "签名举证附件",
    "引流号码举证附件",
    "引流链接举证",
    "单位证件图片",
    "责任人身份证正面",
    "责任人身份证反面",
    "法人身份证正面",
    "法人身份证反面",
    "单位证件类型",
    "APP/平台名称",
    "法人证件地址",
    "责任人证件地址",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人证件地址",
    "经办人手机号",
    "是否签名校验",
    "是否网关签名",
    "模板是否包含变量",
    "模板参数类型",
    "模板参数长度",
    "业务属性",
    "业务类型",
    "业务细类",
    "具体用途",
    "引流号码类型",
    "引流号码用途",
    "引流内容",
    "链接类型",
    "经办人现场照片",
]
```

- [ ] **Step 4: 重写 `example_data`（第 104-116 行）**

把整段替换为（按新列顺序的示例值，与表头一一对应）：

```python
    example_data = [
        "示例企业有限公司",
        "91110108MA01XXXXX",          # 单位证件号码
        "张三",                        # 法人姓名
        "身份证",                      # 法人证件类型
        "110101199001011234",          # 法人证件号码
        "李四",                        # 责任人姓名
        "身份证",                      # 责任人证件类型
        "110101199001011234",          # 责任人证件号码
        "13800138000",                 # 责任人手机号
        "【示例平台】",                # 短信签名
        "自营签名",                    # 签名类型/来源
        "您的验证码是{code}，请在5分钟内完成验证",  # 短信模板内容
        "13800000000",                 # 引流号码
        "https://example.com",         # 引流链接
        "",                            # 签名举证附件（图片占位）
        "",                            # 引流号码举证附件
        "",                            # 引流链接举证
        "",                            # 单位证件图片
        "",                            # 责任人身份证正面
        "",                            # 责任人身份证反面
        "",                            # 法人身份证正面
        "",                            # 法人身份证反面
        "营业执照",                    # 单位证件类型
        "示例平台",                    # APP/平台名称
        "北京市朝阳区XX路1号",         # 法人证件地址
        "北京市朝阳区XX路1号",         # 责任人证件地址
        "王五",                        # 经办人姓名
        "身份证",                      # 经办人证件类型
        "110101199501011234",          # 经办人证件号码
        "北京市海淀区XX路2号",         # 经办人证件地址
        "13900139000",                 # 经办人手机号
        "是",                          # 是否签名校验
        "否",                          # 是否网关签名
        "是",                          # 模板是否包含变量
        "数字",                        # 模板参数类型
        "6",                           # 模板参数长度
        "营销类",                      # 业务属性
        "验证码",                      # 业务类型
        "登录验证",                    # 业务细类
        "用户登录验证",                # 具体用途
        "手机号",                      # 引流号码类型
        "业务联系",                    # 引流号码用途
        "欢迎使用我们的服务",          # 引流内容
        "H5",                          # 链接类型
        "",                            # 经办人现场照片
    ]
```

- [ ] **Step 5: 修改 `header_to_field`（第 210 行）**

把：

```python
        "链接地址": "link_address",
```

改为：

```python
        "引流链接": "link_address",
```

- [ ] **Step 6: 修改示例图片 cell 位置（第 146 行）**

新模板第 15 列（索引 14，0-based）是「签名举证附件」，列字母为 `O`。把：

```python
    cell_images = {"AH2": img_buf.getvalue()}
```

改为：

```python
    cell_images = {"O2": img_buf.getvalue()}
```

- [ ] **Step 7: 运行测试，确认通过**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py -v
```
Expected: 所有测试 PASS（包括原有 4 个 + 新增 2 个）。

- [ ] **Step 8: 提交**

```bash
git add backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): 模板表头对齐新版 45 列顺序，含字段改名与新增"
```

---

## Task 2: 后端 filing_tasks.py — 图片字段中文映射同步

**Files:**
- Modify: `backend/app/api/routes/filing_tasks.py:83-84`（`build_field_map()` 内图片字段）
- Modify: `backend/app/api/routes/filing_tasks.py:361-362`（`_CN_TO_LOGICAL_IMG`）

**Interfaces:**
- Consumes: Task 1 把 `FileAttachment.field_name` 新值定为「法人身份证正面/反面」
- Produces: 报备任务生成时能按新中文 `field_name` 找到资质图片，logical key（`handler_id_front` 等）不变。

- [ ] **Step 1: 在 `backend/app/tests/api/routes/test_filing_tasks.py` 中追加失败测试（若文件不存在则按现有测试结构新建）**

先查文件是否存在：
```bash
ls backend/app/tests/api/routes/test_filing_tasks.py 2>/dev/null && echo "exists" || echo "not found"
```

若存在，在末尾追加：

```python
def test_build_field_map_uses_legal_rep_id_card_labels():
    from app.api.routes.filing_tasks import build_field_map
    m = build_field_map()
    assert m.get("handler_id_front") == "法人身份证正面"
    assert m.get("handler_id_back") == "法人身份证反面"
    assert "经办人身份证正面" not in m.values()
    assert "经办人身份证反面" not in m.values()
```

若文件不存在，新建 `backend/app/tests/api/routes/test_filing_tasks.py`：

```python
"""Tests for filing_tasks API: image field Chinese mapping."""
from app.api.routes.filing_tasks import build_field_map


def test_build_field_map_uses_legal_rep_id_card_labels():
    m = build_field_map()
    assert m.get("handler_id_front") == "法人身份证正面"
    assert m.get("handler_id_back") == "法人身份证反面"
    assert "经办人身份证正面" not in m.values()
    assert "经办人身份证反面" not in m.values()
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py::test_build_field_map_uses_legal_rep_id_card_labels -v
```
Expected: FAIL（当前 `build_field_map()` 返回 `"handler_id_front": "经办人身份证正面"`）。

- [ ] **Step 3: 修改 `build_field_map()` 中图片字段映射（第 83-84 行）**

把：

```python
        "handler_id_front": "经办人身份证正面",
        "handler_id_back": "经办人身份证反面",
```

改为：

```python
        "handler_id_front": "法人身份证正面",
        "handler_id_back": "法人身份证反面",
```

- [ ] **Step 4: 修改 `_CN_TO_LOGICAL_IMG`（第 361-362 行）**

把：

```python
        "经办人身份证正面": "handler_id_front",
        "经办人身份证反面": "handler_id_back",
```

改为：

```python
        "法人身份证正面": "handler_id_front",
        "法人身份证反面": "handler_id_back",
```

- [ ] **Step 5: 运行测试，确认通过**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -v
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add backend/app/api/routes/filing_tasks.py backend/app/tests/api/routes/test_filing_tasks.py
git commit -m "feat(filing-tasks): 图片字段中文映射同步为法人身份证正/反面"
```

---

## Task 3: 后端 Alembic 迁移 — 回填 FileAttachment.field_name 历史值

**Files:**
- Create: `backend/app/alembic/versions/<auto_id>_qualification_field_name_backfill.py`

**Interfaces:**
- Consumes: Task 1 完成后，新模板写入的 `field_name` 已是新中文
- Produces: 历史 `file_attachment` 行的 `field_name` 也变为新中文，使前端详情页能正确显示老资质图片。

- [ ] **Step 1: 生成空迁移文件**

Run:
```bash
cd backend && uv run alembic revision -m "qualification field_name backfill"
```
Expected: 在 `app/alembic/versions/` 下生成一个新文件 `<revision_id>_qualification_field_name_backfill.py`，包含空的 `upgrade()` 和 `downgrade()`。

- [ ] **Step 2: 在测试目录新建迁移冒烟测试**

新建 `backend/app/tests/test_migration_field_name_backfill.py`：

```python
"""Smoke test: alembic migration for FileAttachment.field_name backfill runs cleanly both ways."""
import pytest
from sqlalchemy import text


def test_migration_upgrade_and_downgrade(session_for_migrations):
    # session_for_migrations is a fixture that provides a clean DB at the latest pre-migration base
    # If this fixture does not exist in conftest, skip with a clear reason.
    if session_for_migrations is None:
        pytest.skip("migration fixture not available — verify manually with `alembic upgrade head`")
```

> 注：若项目已有 alembic 测试 fixture，使用之；否则在 Step 8 用 `alembic upgrade head` / `alembic downgrade -1` 手动验证（见 Step 8 命令）。

- [ ] **Step 3: 填充 upgrade() 实现**

把生成的迁移文件中 `upgrade()` 改为：

```python
def upgrade() -> None:
    op.execute(
        "UPDATE file_attachment SET field_name = '法人身份证正面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '经办人身份证正面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '法人身份证反面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '经办人身份证反面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '引流号码举证附件' "
        "WHERE entity_type = 'qualification_info' AND field_name = '引流举证附件'"
    )
```

- [ ] **Step 4: 填充 downgrade() 实现**

把 `downgrade()` 改为：

```python
def downgrade() -> None:
    op.execute(
        "UPDATE file_attachment SET field_name = '经办人身份证正面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '法人身份证正面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '经办人身份证反面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '法人身份证反面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '引流举证附件' "
        "WHERE entity_type = 'qualification_info' AND field_name = '引流号码举证附件'"
    )
```

- [ ] **Step 5: 检查文件头 revision / down_revision 正确**

打开新建的迁移文件，确认头部：

```python
revision: str = "<生成的id>"
down_revision: Union[str, None] = "789aaa38b6b3"
```

若 `down_revision` 不是 `789aaa38b6b3`（最新已提交迁移），手动改为最新迁移的 revision id。查询最新迁移：
```bash
cd backend && uv run alembic heads
```

- [ ] **Step 6: 删除空测试文件（如果 Step 2 的 fixture 不存在）**

```bash
rm backend/app/tests/test_migration_field_name_backfill.py
```

> 如果项目有 alembic 测试 fixture，则保留并在 Step 8 改为运行该测试。

- [ ] **Step 7: 运行已有测试，确认没有回归**

Run:
```bash
cd backend && uv run pytest app/tests/ -v --ignore=app/tests/test_migration_field_name_backfill.py 2>&1 | tail -30
```
Expected: 全 PASS。

- [ ] **Step 8: 手动验证迁移可执行（在开发库）**

```bash
cd backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head
```
Expected: 三条命令都成功退出（exit code 0）。若中途报错，检查 SQL 语法与表/列名（`file_attachment.field_name` / `entity_type`）。

- [ ] **Step 9: 提交**

```bash
git add backend/app/alembic/versions/*_qualification_field_name_backfill.py
git commit -m "feat(migration): 回填资质图片 file_attachment.field_name 至新中文名"
```

---

## Task 4: 前端 qualification-detail-dialog.tsx — imageFields 与 label 改名

**Files:**
- Modify: `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx:66-75`（`imageFields`）
- Modify: `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx:157`（链接地址 FieldRow）

**Interfaces:**
- Consumes: Task 1 把新模板表头定为新中文；Task 3 把历史 `field_name` 回填为新中文
- Produces: 详情页能按新中文 `field_name` 过滤图片并展示。

- [ ] **Step 1: 修改 `imageFields` 数组（第 66-75 行）**

把整段替换为：

```typescript
  const imageFields = [
    { name: '单位证件图片', match: '单位证件图片' },
    { name: '责任人身份证正面', match: '责任人身份证正面' },
    { name: '责任人身份证反面', match: '责任人身份证反面' },
    { name: '法人身份证正面', match: '法人身份证正面' },
    { name: '法人身份证反面', match: '法人身份证反面' },
    { name: '签名举证附件', match: '签名举证附件' },
    { name: '引流号码举证附件', match: '引流号码举证附件' },
    { name: '引流链接举证', match: '引流链接举证' },
    { name: '经办人现场照片', match: '经办人现场照片' },
  ]
```

> 变化：经办人身份证正/反面 → 法人身份证正/反面；引流举证附件 → 引流号码举证附件；新增引流链接举证。

- [ ] **Step 2: 修改「链接地址」FieldRow（第 157 行）**

把：

```tsx
                  <FieldRow label='链接地址' value={d.link_address} />
```

改为：

```tsx
                  <FieldRow label='引流链接' value={d.link_address} />
```

- [ ] **Step 3: 运行 lint 和 build**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: lint 无 error；build 成功。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/features/qualifications/components/qualification-detail-dialog.tsx
git commit -m "feat(qualifications): 详情对话框图片字段对齐新版命名并新增引流链接举证"
```

---

## Task 5: 前端 qualification-dialog.tsx — IMAGE_FIELDS 与 FormLabel 改名

**Files:**
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx:42-51`（`IMAGE_FIELDS`）
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx:928`（链接地址 FormLabel）

**Interfaces:**
- Consumes: 无（表单内部状态）
- Produces: 编辑表单的图片标签使用新中文；`name` 保留为内部 key（与 filing_tasks logical key 对齐）。

- [ ] **Step 1: 修改 `IMAGE_FIELDS`（第 42-51 行）**

把整段替换为：

```typescript
const IMAGE_FIELDS = [
  { name: 'cert_image', label: '单位证件图片' },
  { name: 'responsible_id_front', label: '责任人身份证正面' },
  { name: 'responsible_id_back', label: '责任人身份证反面' },
  { name: 'handler_id_front', label: '法人身份证正面' },
  { name: 'handler_id_back', label: '法人身份证反面' },
  { name: 'signature_proof_image', label: '签名举证附件' },
  { name: 'handler_photo', label: '经办人现场照片' },
  { name: 'diversion_proof_image', label: '引流号码举证附件' },
  { name: 'diversion_link_proof_image', label: '引流链接举证' },
]
```

> 变化：handler_id_front/back 的 label 由「经办人身份证正/反面」改为「法人身份证正/反面」（name 保留）；diversion_proof_image 的 label 改为「引流号码举证附件」；新增 diversion_link_proof_image 项。

- [ ] **Step 2: 修改「链接地址」FormLabel（第 928 行）**

把：

```tsx
                      <FormLabel>链接地址</FormLabel>
```

改为：

```tsx
                      <FormLabel>引流链接</FormLabel>
```

- [ ] **Step 3: 运行 lint 和 build**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: lint 无 error；build 成功。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/features/qualifications/components/qualification-dialog.tsx
git commit -m "feat(qualifications): 编辑表单图片标签对齐新版命名并新增引流链接举证"
```

---

## Task 6: 前端 export-group-dialog.tsx — link_address label 改名

**Files:**
- Modify: `frontend/src/features/export-groups/components/export-group-dialog.tsx:83`

**Interfaces:**
- Consumes: 无
- Produces: 导出分组配置界面的「引流链接」label。

- [ ] **Step 1: 修改 label（第 83 行）**

把：

```typescript
  { key: 'link_address', label: '链接地址' },
```

改为：

```typescript
  { key: 'link_address', label: '引流链接' },
```

- [ ] **Step 2: 运行 lint 和 build**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: lint 无 error；build 成功。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/export-groups/components/export-group-dialog.tsx
git commit -m "feat(export-groups): 链接地址 label 改为引流链接"
```

---

## 完成后整体验证

按 spec 第五节「验证标准」逐项核对：

1. `GET /qualifications/template` 表头 45 列与新模板字段顺序、命名一致（Task 1 测试已覆盖）。
2. 用新模板填一行数据 + 「引流链接举证」图片上传，导入成功，详情页能展示该图片（手动验证）。
3. 历史资质的「经办人身份证正面」图片迁移后能在详情页「法人身份证正面」位置显示（Task 3 迁移 + Task 4 前端配合）。
4. 报备任务生成接口能正确抓取「法人身份证正面/反面」图片（Task 2 同步映射）。
5. `cd backend && uv run pytest` 全绿。
6. `cd frontend && pnpm run lint && pnpm run build` 无错。

## Self-Review

- ✅ Spec 第二节「字段映射」45 列 → Task 1 Step 3 重写 `_QUALIFICATION_HEADERS` 完整覆盖。
- ✅ Spec 2.1 `header_to_field` 改名 → Task 1 Step 5。
- ✅ Spec 2.1 `cell_images` 位置 → Task 1 Step 6。
- ✅ Spec 2.2 `build_field_map` + `_CN_TO_LOGICAL_IMG` → Task 2 Step 3-4。
- ✅ Spec 2.3 Alembic 3 条 UPDATE → Task 3 Step 3-4。
- ✅ Spec 2.4 详情对话框 imageFields + label → Task 4。
- ✅ Spec 2.5 编辑表单 IMAGE_FIELDS + FormLabel → Task 5。
- ✅ Spec 2.6 导出分组 label → Task 6。
- ✅ Spec 2.7 测试 → Task 1 Step 1 新增的两个测试覆盖列顺序与导入改名。
- ✅ Spec 第六节 Out of Scope（不动 DB 结构、不改 logical key、不扩报备图片范围）→ Global Constraints 明确。
- ✅ 类型一致：`handler_id_front` / `handler_id_back` 在 Task 2、Task 5 中拼写一致；`link_address` 在 Task 1、Task 5、Task 6 中一致。
- ✅ 无 TBD/TODO/placeholder。
