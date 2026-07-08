# 资质管理签名字段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `qualification_info` 表与对应前端 UI 中新增一个必填文本字段 `signature`（中文"签名"），覆盖后端模型、Alembic 迁移、CRUD 查询、Excel 导入模板与解析、前端表单/详情/列表/搜索。

**Architecture:** 沿用现有文本字段（如 `enterprise_name`）的同构模式：SQLModel 字段加在 `QualificationInfoBase` 末尾；CRUD 用 `ilike` 过滤；Excel 模板与解析共用一份中文表头列表，导入解析基于表头文本动态定位列。前端按现有表单、详情、列表风格扩展。

**Tech Stack:** FastAPI + SQLModel + Alembic + openpyxl（后端）；React + TypeScript + TanStack Query + react-hook-form + zod（前端）。

## Global Constraints

- 字段名固定为 `signature`（snake_case），中文表头为 `"签名"`
- `signature` 是必填字符串，最长 200 字符；`index=True`
- 历史 `qualification_info` 行需要在迁移中回填占位值 `"未提供"`
- 导入解析时，缺失或为空签名必须按行号报 400 错误
- 文本列 `"签名"` 插入到 `"经办人手机号"` 之后、`"单位证件图片"` 之前；这会让所有图片列右移 1 列（示例图片单元格 `P2` → `Q2`）
- 前端表单 schema、defaultValues、types、API 查询参数、列表列、搜索表单必须全部同步
- 中文文案：表头 `"签名"`、表单标签 `"签名"`、搜索框 placeholder `"搜索签名"`、必填错误 `"签名不能为空"`、行号错误 `"第X行: 签名不能为空"`

---

## File Structure

**后端：**
- Modify: `backend/app/models/qualification_info.py` — 加 `signature` 字段到 `QualificationInfoBase` 与 `QualificationInfoUpdate`
- Create: `backend/app/alembic/versions/<新 rev>_add_signature_to_qualification_info.py` — 由 `alembic revision --autogenerate` 生成后手动调整
- Modify: `backend/app/crud/qualification.py` — `list_qualifications` 加 `signature` 过滤参数
- Modify: `backend/app/api/routes/qualifications.py` — 模板表头/示例、`P2→Q2`、导入映射与必填校验、list 路由 query 参数
- Create: `backend/app/tests/api/routes/test_qualifications.py` — 覆盖模板表头、导入成功/失败、list 查询

**前端：**
- Modify: `frontend/src/lib/api/types.ts` — `QualificationInfo` 加 `signature: string`
- Modify: `frontend/src/lib/api/qualifications.ts` — `getQualifications` 入参加 `signature?: string`
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx` — schema、defaultValues、表单 UI
- Modify: `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx` — 详情 FieldRow
- Modify: `frontend/src/features/qualifications/index.tsx` — 列表列、searchInputs、appliedFilters、搜索框 UI

---

### Task 1: 后端模型与 Alembic 迁移

**Files:**
- Modify: `backend/app/models/qualification_info.py:10-26` 和 `:39-54`
- Create: `backend/app/alembic/versions/<new>_add_signature_to_qualification_info.py`
- Test: 通过 `alembic upgrade head` 验证

**Interfaces:**
- Consumes: 无
- Produces: `QualificationInfo.signature: str` 字段（NOT NULL，max_length=200，indexed）；`QualificationInfoUpdate.signature: str | None = None`

- [ ] **Step 1: 修改 `QualificationInfoBase` 加 `signature` 字段**

在 `backend/app/models/qualification_info.py` 第 25 行 `handler_phone` 之后追加一行：

```python
    signature: str = Field(max_length=200, index=True)
```

修改后该 class 的末尾两行应为：

```python
    handler_phone: str | None = Field(default=None, max_length=20)
    signature: str = Field(max_length=200, index=True)
```

- [ ] **Step 2: 修改 `QualificationInfoUpdate` 加可选 `signature`**

在 `backend/app/models/qualification_info.py` 第 54 行 `handler_phone` 之后追加一行：

```python
    signature: str | None = None
```

- [ ] **Step 3: 生成 Alembic 迁移**

Run:
```bash
cd backend && uv run alembic revision --autogenerate -m "add signature to qualification_info"
```

Expected: 在 `backend/app/alembic/versions/` 下生成一个新 `.py` 文件，包含 `add_column('signature', sa.String(length=200), nullable=False)` 与 `create_index`。

- [ ] **Step 4: 手动调整迁移脚本，加历史行回填**

打开生成的新迁移文件，把 `upgrade()` 改成三段式：先用 `server_default=""` 加列、回填、再去掉 default 改为 NOT NULL。完整 `upgrade()` 应当形如（保留文件已有的 `op.drop_index` / `op.drop_column` 到 downgrade）：

```python
def upgrade() -> None:
    # 1. 先以空字符串 server_default 加列，避免 NOT NULL 约束在已有行上失败
    op.add_column(
        "qualification_info",
        sa.Column("signature", sa.String(length=200), server_default="", nullable=False),
    )
    # 2. 回填历史行（脚手架项目通常为空表，但保留以兼容生产环境已有数据）
    op.execute("UPDATE qualification_info SET signature = '未提供' WHERE signature = ''")
    # 3. 移除 server_default（业务层不依赖默认值），保留 NOT NULL
    op.alter_column(
        "qualification_info",
        "signature",
        existing_type=sa.String(length=200),
        server_default=None,
        existing_nullable=False,
    )
    op.create_index(
        op.f("ix_qualification_info_signature"),
        "qualification_info",
        ["signature"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_qualification_info_signature"), table_name="qualification_info")
    op.drop_column("qualification_info", "signature")
```

- [ ] **Step 5: 执行迁移并验证列结构**

Run:
```bash
cd backend && uv run alembic upgrade head
```

Expected: 输出 `Running upgrade <prev> -> <new>, add signature to qualification_info`，无报错。

验证（连库检查列已存在且 NOT NULL）：
```bash
cd backend && uv run python -c "
from sqlmodel import Session, select
from app.core.db import engine
from app.models import QualificationInfo
from sqlmodel.text import text
with Session(engine) as s:
    rows = s.exec(select(QualificationInfo)).all()
    for r in rows:
        assert r.signature, f'行 {r.id} signature 不应为空'
print('OK: signature 列已添加且历史行已回填')
"
```

Expected: `OK: signature 列已添加且历史行已回填`

- [ ] **Step 6: 提交**

```bash
git add backend/app/models/qualification_info.py backend/app/alembic/versions/
git commit -m "feat(qualifications): 模型新增 signature 必填字段与 Alembic 迁移"
```

---

### Task 2: 后端 list 查询与 CRUD 过滤

**Files:**
- Modify: `backend/app/crud/qualification.py:17-36`
- Modify: `backend/app/api/routes/qualifications.py:239-253`
- Test: `backend/app/tests/api/routes/test_qualifications.py`（本 task 创建此文件并写第一个测试）

**Interfaces:**
- Consumes: Task 1 完成的 `QualificationInfo.signature` 字段
- Produces: `list_qualifications(..., signature: str | None = None)`、`GET /api/v1/qualifications?signature=...`

- [ ] **Step 1: 创建测试文件，写第一个失败测试**

创建 `backend/app/tests/api/routes/test_qualifications.py`：

```python
"""Tests for qualifications API: signature field support."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_list_qualifications_filter_by_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # 创建两条记录，签名分别为张三、李四
    for sig in ("张三 经办", "李四 法人"):
        client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={"enterprise_name": f"测试企业 {sig}", "signature": sig},
        )
    # 用 signature 过滤
    r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"signature": "张三"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert all("张三" in item["signature"] for item in body["data"])
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_list_qualifications_filter_by_signature -v
```

Expected: FAIL — 因为后端目前不接受 `signature` 参数；可能是 422 或返回未过滤结果导致断言失败。

- [ ] **Step 3: 修改 CRUD 加 signature 过滤**

在 `backend/app/crud/qualification.py` 的 `list_qualifications` 函数中：

把签名加到形参列表（第 17-24 行）：

```python
def list_qualifications(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    enterprise_name: str | None = None,
    cert_number: str | None = None,
    signature: str | None = None,
) -> tuple[list[QualificationInfo], int]:
```

在 `if cert_number:` 之后追加（第 30 行后）：

```python
    if signature:
        query = query.where(QualificationInfo.signature.contains(signature))
```

- [ ] **Step 4: 修改路由加 signature query 参数**

在 `backend/app/api/routes/qualifications.py` 的 `read_qualifications`（第 241-253 行）：

把函数签名改为：

```python
def read_qualifications(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    enterprise_name: str | None = None,
    cert_number: str | None = None,
    signature: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_qualifications(
        session=session, skip=skip, limit=page_size,
        enterprise_name=enterprise_name, cert_number=cert_number, signature=signature,
    )
    return QualificationInfosPublic(data=items, total=total, page=page, page_size=page_size)
```

- [ ] **Step 5: 运行测试，确认通过**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_list_qualifications_filter_by_signature -v
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add backend/app/crud/qualification.py backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): list 接口支持 signature 模糊查询"
```

---

### Task 3: 后端模板表头与示例图片单元格调整

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:40-114`
- Test: `backend/app/tests/api/routes/test_qualifications.py` 追加测试

**Interfaces:**
- Consumes: 无
- Produces: 模板第 16 列为 `"签名"`、第 17 列为 `"单位证件图片"`；示例图片注入到 `Q2`

- [ ] **Step 1: 写失败测试**

在 `backend/app/tests/api/routes/test_qualifications.py` 末尾追加：

```python
def test_template_has_signature_header(
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
    # 第 16 列（1-based）应为 "签名"，第 17 列应为 "单位证件图片"
    assert headers[15] == "签名"
    assert headers[16] == "单位证件图片"
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_template_has_signature_header -v
```

Expected: FAIL — 当前第 16 列是 `"单位证件图片"`。

- [ ] **Step 3: 修改 `_QUALIFICATION_HEADERS` 插入"签名"**

在 `backend/app/api/routes/qualifications.py` 第 55 行 `"经办人手机号"` 之后、第 56 行 `"单位证件图片"` 之前插入 `"签名"`：

```python
_QUALIFICATION_HEADERS = [
    "企业名称",
    "提交单位",
    "运营商企业ID",
    "单位证件类型",
    "单位证件号码",
    "APP/平台名称",
    "集团编码",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人手机号",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人手机号",
    "签名",
    "单位证件图片",
    "责任人身份证正面",
    "责任人身份证反面",
    "经办人身份证正面",
    "经办人身份证反面",
]
```

- [ ] **Step 4: 修改 `example_data` 追加示例签名**

把第 77-83 行的 example_data 末尾追加一个签名示例值：

```python
    example_data = [
        "示例企业有限公司", "报送部", "OP10001",
        "营业执照", "91110108MA01XXXXX",
        "示例平台", "G001",
        "张三", "身份证", "110101199001011234", "13800138000",
        "李四", "身份证", "110101199501011234", "13900139000",
        "张三 经办",
    ]
```

- [ ] **Step 5: 修改示例图片注入位置 `P2 → Q2`**

把第 113 行的：

```python
    cell_images = {"P2": img_buf.getvalue()}
```

改为：

```python
    cell_images = {"Q2": img_buf.getvalue()}
```

同步把第 112 行注释更新：

```python
    # First image column is column 17 (1-based) = "Q2"
```

- [ ] **Step 6: 运行测试，确认通过**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_template_has_signature_header -v
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): 导入模板加入签名列与示例图片位置修正"
```

---

### Task 4: 后端导入解析与 signature 必填校验

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:142-203`
- Test: `backend/app/tests/api/routes/test_qualifications.py` 追加两个测试

**Interfaces:**
- Consumes: Task 1 完成的 `signature` 必填模型字段；Task 3 完成的模板表头
- Produces: `POST /api/v1/qualifications/import` 接受并解析签名列，缺失或空值时返回 400

- [ ] **Step 1: 写"缺失签名报错"的失败测试**

在 `backend/app/tests/api/routes/test_qualifications.py` 末尾追加：

```python
def _build_xlsx(headers: list[str], rows: list[list]) -> bytes:
    """构造一个最小 xlsx：第一行为表头，后续为数据行。"""
    from io import BytesIO
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_import_rejects_missing_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = ["企业名称", "签名"]
    rows = [["测试企业A", ""]]  # 签名为空
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 400
    assert "签名" in r.json()["detail"]


def test_import_success_with_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = ["企业名称", "签名"]
    rows = [["测试企业B", "王五 法人"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1
```

- [ ] **Step 2: 运行两个新测试，确认失败**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py::test_import_rejects_missing_signature app/tests/api/routes/test_qualifications.py::test_import_success_with_signature -v
```

Expected: 
- `test_import_rejects_missing_signature`：实际行为可能是 500（数据库 NOT NULL 失败）或 422 校验错；不是预期的 400。
- `test_import_success_with_signature`：因 `signature` 字段未被解析赋值，会因模型 NOT NULL 失败而 500。

- [ ] **Step 3: 修改 `header_to_field` 加 "签名" 映射**

在 `backend/app/api/routes/qualifications.py` 的 `header_to_field`（第 142-158 行）末尾 `"经办人手机号": "handler_phone"` 之后追加：

```python
        "经办人手机号": "handler_phone",
        "签名": "signature",
```

- [ ] **Step 4: 在行循环中加 signature 必填校验**

在第 184-185 行 `enterprise_name` 校验之后追加 signature 校验：

```python
        enterprise_name = cell("enterprise_name")
        if not enterprise_name:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 企业名称不能为空")

        signature = cell("signature")
        if not signature:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 签名不能为空")
```

- [ ] **Step 5: 在 `objects.append` 中传入 signature**

把第 187-203 行 `QualificationInfo(...)` 构造中追加 `signature=signature`：

```python
        objects.append(QualificationInfo(
            enterprise_name=enterprise_name,
            submit_unit=cell("submit_unit"),
            carrier_enterprise_id=cell("carrier_enterprise_id"),
            cert_type=cell("cert_type"),
            cert_number=cell("cert_number"),
            app_platform_name=cell("app_platform_name"),
            group_code=cell("group_code"),
            responsible_name=cell("responsible_name"),
            responsible_cert_type=cell("responsible_cert_type"),
            responsible_cert_number=cell("responsible_cert_number"),
            responsible_phone=cell("responsible_phone"),
            handler_name=cell("handler_name"),
            handler_cert_type=cell("handler_cert_type"),
            handler_cert_number=cell("handler_cert_number"),
            handler_phone=cell("handler_phone"),
            signature=signature,
        ))
```

- [ ] **Step 6: 运行两个测试，确认通过**

Run:
```bash
cd backend && uv run pytest app/tests/api/routes/test_qualifications.py -v
```

Expected: 所有 4 个 qualifications 测试都 PASS。

- [ ] **Step 7: 跑整个后端测试套件**

Run:
```bash
cd backend && uv run pytest -v
```

Expected: 全绿。如有预先存在的失败，确认与本次改动无关。

- [ ] **Step 8: 提交**

```bash
git add backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): 导入解析支持 signature 列并必填校验"
```

---

### Task 5: 前端类型、API 调用、表单与详情对话框

**Files:**
- Modify: `frontend/src/lib/api/types.ts:13-32`
- Modify: `frontend/src/lib/api/qualifications.ts:4-12`
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx:29-188,408-441`
- Modify: `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx`

**Interfaces:**
- Consumes: Task 1-4 完成的后端 API
- Produces: 前端 `QualificationInfo.signature`、表单 schema、详情/表单 UI

- [ ] **Step 1: 类型 `QualificationInfo` 加 `signature`**

修改 `frontend/src/lib/api/types.ts` 第 13-32 行，在 `handler_phone` 之后追加 `signature: string`（注意是必填，不是 `string | null`）：

```ts
export interface QualificationInfo {
  id: string
  submit_unit: string | null
  carrier_enterprise_id: string | null
  enterprise_name: string
  cert_type: string | null
  cert_number: string | null
  app_platform_name: string | null
  group_code: string | null
  responsible_name: string | null
  responsible_cert_type: string | null
  responsible_cert_number: string | null
  responsible_phone: string | null
  handler_name: string | null
  handler_cert_type: string | null
  handler_cert_number: string | null
  handler_phone: string | null
  signature: string
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: `getQualifications` 加 `signature` 查询参数**

修改 `frontend/src/lib/api/qualifications.ts` 第 4-12 行：

```ts
export const getQualifications = async (params?: {
  page?: number
  page_size?: number
  enterprise_name?: string
  cert_number?: string
  signature?: string
}): Promise<QualificationListResponse> => {
  const response = await api.get('/api/v1/qualifications', { params })
  return response.data
}
```

- [ ] **Step 3: 表单 schema 加 signature 必填**

修改 `frontend/src/features/qualifications/components/qualification-dialog.tsx` 第 37-53 行的 `formSchema`，在 `handler_phone` 之后追加：

```ts
const formSchema = z.object({
  enterprise_name: z.string().min(1, '企业名称不能为空'),
  submit_unit: z.string().optional(),
  carrier_enterprise_id: z.string().optional(),
  cert_type: z.string().optional(),
  cert_number: z.string().optional(),
  app_platform_name: z.string().optional(),
  group_code: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_cert_type: z.string().optional(),
  responsible_cert_number: z.string().optional(),
  responsible_phone: z.string().optional(),
  handler_name: z.string().optional(),
  handler_cert_type: z.string().optional(),
  handler_cert_number: z.string().optional(),
  handler_phone: z.string().optional(),
  signature: z.string().min(1, '签名不能为空'),
})
```

- [ ] **Step 4: `defaultValues` 加 signature**

在 `qualification-dialog.tsx` 第 153-187 行，编辑分支和新建分支都加 signature：

```ts
  const defaultValues = qualification
    ? {
        enterprise_name: qualification.enterprise_name,
        submit_unit: qualification.submit_unit || '',
        carrier_enterprise_id: qualification.carrier_enterprise_id || '',
        cert_type: qualification.cert_type || '',
        cert_number: qualification.cert_number || '',
        app_platform_name: qualification.app_platform_name || '',
        group_code: qualification.group_code || '',
        responsible_name: qualification.responsible_name || '',
        responsible_cert_type: qualification.responsible_cert_type || '',
        responsible_cert_number: qualification.responsible_cert_number || '',
        responsible_phone: qualification.responsible_phone || '',
        handler_name: qualification.handler_name || '',
        handler_cert_type: qualification.handler_cert_type || '',
        handler_cert_number: qualification.handler_cert_number || '',
        handler_phone: qualification.handler_phone || '',
        signature: qualification.signature || '',
      }
    : {
        enterprise_name: '',
        submit_unit: '',
        carrier_enterprise_id: '',
        cert_type: '',
        cert_number: '',
        app_platform_name: '',
        group_code: '',
        responsible_name: '',
        responsible_cert_type: '',
        responsible_cert_number: '',
        responsible_phone: '',
        handler_name: '',
        handler_cert_type: '',
        handler_cert_number: '',
        handler_phone: '',
        signature: '',
      }
```

- [ ] **Step 5: 在表单 UI 加 signature 输入框**

在 `qualification-dialog.tsx` 第 408 行（经办人信息 `</div>` 关闭之后、`"提交信息"` 区块之前）插入一个新的 section：

```tsx
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">签名</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>签名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="如：张三 经办" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
```

- [ ] **Step 6: 详情对话框加 signature FieldRow**

打开 `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx`，找到经办人信息区块底部（约第 96 行 `handler_phone` FieldRow 之后），追加：

```tsx
              <FieldRow label="签名" value={d.signature} />
```

如果 detail dialog 没有专门的"签名"分组，可以在经办人信息组里追加，或单独开一个区块；与现有 FieldRow 风格一致即可。

- [ ] **Step 7: 类型检查与构建**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```

Expected: 无类型错误，构建通过。如 tsc 报 `signature` 缺失，确认 types.ts 已正确保存。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/lib/api/types.ts frontend/src/lib/api/qualifications.ts frontend/src/features/qualifications/components/qualification-dialog.tsx frontend/src/features/qualifications/components/qualification-detail-dialog.tsx
git commit -m "feat(qualifications): 前端类型/API/表单/详情同步 signature 字段"
```

---

### Task 6: 前端列表页 — 表格列与搜索框

**Files:**
- Modify: `frontend/src/features/qualifications/index.tsx:43-64,94-145,194-229`

**Interfaces:**
- Consumes: Task 5 完成的 `getQualifications` 支持 `signature` 参数
- Produces: 列表多一列"签名"，搜索表单多一个"签名"输入框

- [ ] **Step 1: `searchInputs` 与 `appliedFilters` 加 signature**

修改 `frontend/src/features/qualifications/index.tsx` 第 43-44 行：

```ts
  const [searchInputs, setSearchInputs] = useState({ enterprise_name: '', cert_number: '', signature: '' })
  const [appliedFilters, setAppliedFilters] = useState<{ enterprise_name?: string; cert_number?: string; signature?: string }>({})
```

- [ ] **Step 2: `handleSearch` 与 `handleReset` 加 signature**

修改第 52-64 行：

```ts
  const handleSearch = () => {
    setAppliedFilters({
      enterprise_name: searchInputs.enterprise_name.trim() || undefined,
      cert_number: searchInputs.cert_number.trim() || undefined,
      signature: searchInputs.signature.trim() || undefined,
    })
    setPage(1)
  }

  const handleReset = () => {
    setSearchInputs({ enterprise_name: '', cert_number: '', signature: '' })
    setAppliedFilters({})
    setPage(1)
  }
```

- [ ] **Step 3: `columns` 加"签名"列**

在第 99 行 `handler_name` 列之后追加一列（保持 `created_at` 在最后）：

```ts
  const columns = useMemo<ColumnDef<QualificationInfo>[]>(() => [
    { accessorKey: 'enterprise_name', header: '企业名称' },
    { accessorKey: 'submit_unit', header: '提交单位', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'cert_number', header: '证件号码', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'responsible_name', header: '负责人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'handler_name', header: '经办人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'signature', header: '签名', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'app_platform_name', header: '平台', cell: ({ getValue }) => getValue() || '-' },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ getValue }) => formatCN(getValue() as string),
    },
    {
      id: 'actions',
      // ... 保持不变
    },
  ], [])
```

- [ ] **Step 4: 搜索表单加 signature 输入框**

在 `index.tsx` 第 220 行证件号码搜索框 `</div>` 之后、`<div className="flex gap-2">`（搜索/重置按钮容器）之前插入：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">签名</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索签名"
                value={searchInputs.signature}
                onChange={(e) => setSearchInputs((s) => ({ ...s, signature: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
```

- [ ] **Step 5: lint 与 build 验证**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```

Expected: 无错误，构建通过。

- [ ] **Step 6: 手动验证（启动 dev server）**

Run（独立终端）:
```bash
cd frontend && pnpm run dev
```

打开浏览器，登录后进入"资质管理"页面：

1. 点"新建资质" → 不填签名，点"创建" → 期望下方出现红色错误"签名不能为空"
2. 填写必填项（含签名"张三 经办"）→ 创建成功 → 列表多一行，"签名"列显示"张三 经办"
3. 在"签名"搜索框输入"张三" → 点搜索 → 仅剩这一行
4. 点"详情" → 弹窗内显示"签名"字段
5. 点"编辑" → 表单回填签名"张三 经办" → 修改后保存成功
6. 点"下载模板" → 打开 xlsx → 第 16 列为"签名"
7. 模板填一行签名留空 → 导入 → 报错含"签名"
8. 模板填两行带签名 → 导入成功

- [ ] **Step 7: 提交**

```bash
git add frontend/src/features/qualifications/index.tsx
git commit -m "feat(qualifications): 列表表格加签名列与签名搜索框"
```

---

## Self-Review

**Spec coverage:**
- §4 数据模型 → Task 1 ✓
- §5 迁移策略 → Task 1 Step 4 ✓
- §6.1 CRUD 过滤 → Task 2 ✓
- §6.2 模板生成（表头/示例/P2→Q2）→ Task 3 ✓
- §6.2 导入解析（映射 + 必填校验）→ Task 4 ✓
- §6.2 list 接口 query 参数 → Task 2 ✓
- §7.1 类型与 API → Task 5 Step 1-2 ✓
- §7.2 表单 → Task 5 Step 3-5 ✓
- §7.3 列表页（列 + 搜索）→ Task 6 ✓
- §8.1 后端测试 → Task 2/3/4 ✓
- §8.2 前端手动验证 → Task 6 Step 6 ✓
- §9 验收清单 → 全部任务完成后逐步走查 ✓

详情对话框展示在规格 §7 没明确提到，但与"表单编辑支持"是同一性质，归入 Task 5 Step 6，保持一致体验。

**Placeholder scan:** 无 TBD / TODO / "implement later"；所有代码片段完整。

**Type consistency:**
- `signature` 在 Python 模型（`str`，必填）、CRUD（`str | None` 过滤参数）、API（`str | None` query）、TS 类型（`string` 必填）、TS 表单 schema（`z.string().min(1)`）中保持一致
- `QualificationInfoUpdate.signature: str | None = None` 与其他可更新字段风格一致

---

## Plan Complete

Plan complete and saved to `docs/superpowers/plans/2026-07-08-qualifications-signature-field.md`.
