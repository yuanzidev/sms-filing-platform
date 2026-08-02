# 报备平台 P1 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 6 个 P1 优化项——签名模板去括号、举证图片字段补全、端口查询筛选、企业名称标签改名、报备搜索扩展、任务名自定义。

**Architecture:** 5 组独立改动，每组 2-3 个 TDD 任务，可任意顺序实施。改动量约 P0 的 30-40%。

**Tech Stack:** FastAPI + SQLModel + openpyxl；React + TypeScript + TanStack Query + ShadcnUI。

## Global Constraints

- 后端：`uv run pytest` 通过，`uv run ruff check .` 通过
- 前端：`pnpm run lint` 通过（仅涉及文件），`pnpm run build` 成功
- 每条 commit 为独立可交付单位，中文 message 不带 AI 署名
- 不改数据库字段名（enterprise_name 只改显示标签）

参考 spec：`docs/superpowers/specs/2026-08-02-filing-platform-p1-optimizations-design.md`

---

## 组 A：短信签名模板示例去括号

### Task 1: 模板示例去掉【】

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:115`

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_qualifications.py`：

```python
def test_template_signature_example_has_no_brackets(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO
    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template",
        headers=superuser_token_headers,
    )
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    sig_cell = ws.cell(row=2, column=10).value  # 短信签名列
    assert "【" not in str(sig_cell)
    assert "】" not in str(sig_cell)
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_qualifications.py::test_template_signature_example_has_no_brackets -v`
Expected: FAIL（`【示例平台】` 包含括号）

- [ ] **Step 3: 改模板示例**

`backend/app/api/routes/qualifications.py:115`：

```python
# 改前
"【示例平台】",                # 短信签名
# 改后
"示例平台",                    # 短信签名
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_qualifications.py::test_template_signature_example_has_no_brackets -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/qualifications.py backend/app/tests/api/routes/test_qualifications.py
git commit -m "feat(qualifications): 导入模板短信签名示例去掉括号"
```

---

## 组 B：举证图片字段补全 + 导入说明

### Task 2: 注册表 + 导出映射补 4 个举证图片字段

**Files:**
- Modify: `backend/app/services/export_field_registry.py`
- Modify: `backend/app/api/routes/filing_tasks.py`

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/services/test_export_field_registry.py`：

```python
def test_proof_image_fields_in_registry():
    """举证图片字段必须在注册表中"""
    fm = field_map()
    assert fm.get("signature_proof") == "签名举证附件"
    assert fm.get("diversion_number_proof") == "引流号码举证附件"
    assert fm.get("diversion_link_proof") == "引流链接举证"
    assert fm.get("handler_scene_photo") == "经办人现场照片"
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py::test_proof_image_fields_in_registry -v`
Expected: FAIL（4 个字段不存在）

- [ ] **Step 3: 注册表补字段**

`backend/app/services/export_field_registry.py` 在图片材料分组追加：

```python
ExportField("signature_proof", "签名举证附件", "image_qualification", "图片材料"),
ExportField("diversion_number_proof", "引流号码举证附件", "image_qualification", "图片材料"),
ExportField("diversion_link_proof", "引流链接举证", "image_qualification", "图片材料"),
ExportField("handler_scene_photo", "经办人现场照片", "image_qualification", "图片材料"),
```

`backend/app/api/routes/filing_tasks.py` 的 `_CN_TO_LOGICAL_IMG` 字典追加：

```python
"签名举证附件": "signature_proof",
"引流号码举证附件": "diversion_number_proof",
"引流链接举证": "diversion_link_proof",
"经办人现场照片": "handler_scene_photo",
```

- [ ] **Step 4: 跑测试看通过**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/export_field_registry.py backend/app/api/routes/filing_tasks.py \
        backend/app/tests/services/test_export_field_registry.py
git commit -m "feat(export): 注册表 + 导出映射补全 4 个举证图片字段"
```

---

### Task 3: 导入模板填写说明增强

**Files:**
- Modify: `backend/app/api/routes/qualifications.py`（notes 追加第 9 条）
- Modify: `backend/app/api/routes/port_info.py`（notes 追加第 9 条）

- [ ] **Step 1: 改资质模板说明**

`qualifications.py::download_qualification_template` 的 notes 列表追加：

```python
notes = [
    ...,
    "8. 法人证件类型/号码/地址：选填；运营商报备强依赖时再填",
    "9. 支持图片的列：单位证件图片、责任人身份证正面/反面、法人身份证正面/反面、签名举证附件、引流号码举证附件、引流链接举证、经办人现场照片；图片文件建议小于 10MB，支持 PNG、JPEG 格式",
]
```

- [ ] **Step 2: 改端口模板说明**

`port_info.py::download_port_info_template` 的 notes 列表追加：

```python
notes = [
    ...,
    "8. 操作类型、集团编码：选填",
    "9. 授权书图片列支持插入图片文件；导出时图片会嵌入 Excel 单元格",
]
```

- [ ] **Step 3: 跑已有测试确保不回归**

Run: `cd backend && uv run pytest tests/api/routes/test_qualifications.py::test_qualification_template_notes_mention_optional_legal -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routes/qualifications.py backend/app/api/routes/port_info.py
git commit -m "feat(templates): 导入模板填写说明增加图片字段指引"
```

---

## 组 C：端口信息管理查询筛选

### Task 4: 后端查询参数 + CRUD 扩展

**Files:**
- Modify: `backend/app/api/routes/port_info.py::read_port_infos`（签名字段 + 筛选传参）
- Modify: `backend/app/crud/port_info.py::list_port_infos`（签名 + 查询逻辑）

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_port_info.py`：

```python
def test_filter_port_infos_by_keyword(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # 创建一条数据
    client.post(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        json={
            "carrier": "中国移动",
            "main_port_number": "10698TEST",
            "enterprise_name": "测试备案公司",
            "port_type": "短信",
            "carrier_room": "X机房",
            "enterprise_room": "Y机房",
            "authorization_letter": "授字001",
            "sub_port_number": "9999",
        },
    )
    # keyword 命中子端口号
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"keyword": "9999"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1

    # keyword 命中企业名称
    r2 = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"keyword": "测试备案"},
    )
    assert r2.json()["total"] >= 1


def test_filter_port_infos_by_city_and_type(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    client.post(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        json={
            "carrier": "中国联通",
            "main_port_number": "10699CT",
            "enterprise_name": "城市测试公司",
            "port_type": "语音",
            "city": "上海",
            "carrier_room": "A机房",
            "enterprise_room": "B机房",
            "authorization_letter": "授字002",
        },
    )
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"city": "上海", "port_type": "语音"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_port_info.py::test_filter_port_infos_by_keyword tests/api/routes/test_port_info.py::test_filter_port_infos_by_city_and_type -v`
Expected: FAIL（keyword/city/port_type 参数被忽略）

- [ ] **Step 3: 改路由签名**

`backend/app/api/routes/port_info.py::read_port_infos` 签名改为：

```python
def read_port_infos(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    carrier: str | None = None,
    province: str | None = None,
    keyword: str | None = None,
    city: str | None = None,
    port_type: str | None = None,
    main_port_number: str | None = None,
) -> Any:
    skip = (page - 1) * page_size
    items, total = list_port_infos(
        session=session, skip=skip, limit=page_size,
        carrier=carrier, province=province,
        keyword=keyword, city=city, port_type=port_type,
        main_port_number=main_port_number,
    )
```

- [ ] **Step 4: 改 CRUD**

`backend/app/crud/port_info.py::list_port_infos` 签名改为：

```python
def list_port_infos(
    *, session: Session, skip: int = 0, limit: int = 100,
    carrier: str | None = None,
    province: str | None = None,
    keyword: str | None = None,
    city: str | None = None,
    port_type: str | None = None,
    main_port_number: str | None = None,
) -> tuple[list[PortInfo], int]:
```

函数体内追加过滤：

```python
if keyword:
    query = query.where(
        or_(
            PortInfo.main_port_number.contains(keyword),
            PortInfo.sub_port_number.contains(keyword),
            PortInfo.enterprise_name.contains(keyword),
        )
    )
if city:
    query = query.where(PortInfo.city == city)
if port_type:
    query = query.where(PortInfo.port_type == port_type)
if main_port_number:
    query = query.where(PortInfo.main_port_number.contains(main_port_number))
```

顶部加 import：`from sqlalchemy import or_`

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_port_info.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/port_info.py backend/app/crud/port_info.py \
        backend/app/tests/api/routes/test_port_info.py
git commit -m "feat(port-info): 新增关键词、城市、端口类型、主端口号查询筛选"
```

---

### Task 5: 前端端口筛选 UI

**Files:**
- Modify: `frontend/src/features/port-info/index.tsx`

- [ ] **Step 1: 读当前文件结构**

Run: 先读取 `frontend/src/features/port-info/index.tsx` 了解当前筛选区 DOM 结构。

- [ ] **Step 2: 在筛选区追加组件**

在现有运营商下拉、省份下拉后面，增加关键词输入框和城市/端口类型下拉：

```tsx
// 新增 state
const [keyword, setKeyword] = useState('')
const [cityFilter, setCityFilter] = useState('__all__')
const [portTypeFilter, setPortTypeFilter] = useState('__all__')
const [mainPortFilter, setMainPortFilter] = useState('')

// 数据中提取选项
const cityOptions = useMemo(() => {
  const set = new Set<string>()
  for (const p of portData?.data ?? []) { if (p.city) set.add(p.city) }
  return Array.from(set).sort()
}, [portData])

const portTypeOptions = useMemo(() => {
  const set = new Set<string>()
  for (const p of portData?.data ?? []) { if (p.port_type) set.add(p.port_type) }
  return Array.from(set).sort()
}, [portData])

// 查询参数
const filters = {
  page, page_size: pageSize,
  carrier: carrierFilter !== '__all__' ? carrierFilter : undefined,
  province: provinceFilter !== '__all__' ? provinceFilter : undefined,
  keyword: keyword || undefined,
  city: cityFilter !== '__all__' ? cityFilter : undefined,
  port_type: portTypeFilter !== '__all__' ? portTypeFilter : undefined,
  main_port_number: mainPortFilter || undefined,
}
```

筛选区 JSX 在省份下拉后追加：

```tsx
<Input
  placeholder="搜索端口号/企业名称"
  value={keyword}
  onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
  className="w-48"
/>
<Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1) }}>
  <SelectTrigger className="w-32"><SelectValue placeholder="城市" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">全部城市</SelectItem>
    {cityOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
  </SelectContent>
</Select>
<Select value={portTypeFilter} onValueChange={(v) => { setPortTypeFilter(v); setPage(1) }}>
  <SelectTrigger className="w-32"><SelectValue placeholder="端口类型" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">全部类型</SelectItem>
    {portTypeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
  </SelectContent>
</Select>
```

- [ ] **Step 3: 跑 lint + build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/port-info/index.tsx
git commit -m "feat(port-info): 前端增加关键词搜索、城市和端口类型筛选"
```

---

## 组 D：企业名称标签改名

### Task 6: 注册表分拆 port_enterprise_name + get_field_value 别名

**Files:**
- Modify: `backend/app/services/export_field_registry.py`
- Modify: `backend/app/api/routes/filing_tasks.py`

- [ ] **Step 1: 写失败测试**

追加到注册表测试：

```python
def test_port_enterprise_name_in_registry():
    fm = field_map()
    assert fm.get("port_enterprise_name") == "主端口备案公司"
    source = field_source("port_enterprise_name")
    assert source == "port"

def test_qualification_enterprise_name_unchanged():
    f = get_field("enterprise_name")
    assert f is not None
    assert f.label == "企业名称"
    assert f.source == "qualification"
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py::test_port_enterprise_name_in_registry -v`
Expected: FAIL

- [ ] **Step 3: 注册表分拆**

`export_field_registry.py` 在端口信息分组追加：

```python
ExportField("port_enterprise_name", "主端口备案公司", "port", "端口信息"),
```

确保资质侧 `enterprise_name` 保持 `label="企业名称", source="qualification"`。

- [ ] **Step 4: get_field_value 别名**

`filing_tasks.py::get_field_value` 函数开头增加：

```python
_PORT_ALIAS: dict[str, str] = {
    "port_enterprise_name": "enterprise_name",
}

def get_field_value(
    qualification, port, field_name,
    allocated_sub_port: str | None = None,
) -> str:
    if field_name == "sub_port_number" and allocated_sub_port is not None:
        return allocated_sub_port
    source = field_source(field_name)
    if source is None:
        return ""
    if source in ("image_qualification", "image_port"):
        return "[图片]"
    if source == "port":
        attr = _PORT_ALIAS.get(field_name, field_name)
        value = getattr(port, attr, "")
    elif source == "qualification":
        value = getattr(qualification, field_name, "")
    else:
        return ""
    # ... 后续不变
```

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/services/test_export_field_registry.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/export_field_registry.py backend/app/api/routes/filing_tasks.py \
        backend/app/tests/services/test_export_field_registry.py
git commit -m "feat(export): 注册表分拆端口侧企业名称为 port_enterprise_name，标签为主端口备案公司"
```

---

### Task 7: 后端导入模板 + 前端标签改名

**Files:**
- Modify: `backend/app/api/routes/port_info.py`（_PORT_HEADERS + header_to_field）
- Modify: `frontend/src/features/port-info/index.tsx`
- Modify: `frontend/src/features/port-info/components/port-info-dialog.tsx`
- Modify: `frontend/src/features/port-info/components/port-info-detail-dialog.tsx`
- Modify: `frontend/src/features/filing-management/create.tsx`（FIELD_LABEL_MAP）

- [ ] **Step 1: 后端模板表头和映射**

`port_info.py` 的 `_PORT_HEADERS` 列表：

```python
# "企业名称" → "主端口备案公司"
```

`header_to_field` 字典：

```python
# "企业名称": "enterprise_name" → "主端口备案公司": "enterprise_name"
```

- [ ] **Step 2: 前端列表表头**

`frontend/src/features/port-info/index.tsx`：DataTable columns 中 `accessorKey: 'enterprise_name'` 的 `header` 从 `'企业名称'` 改为 `'主端口备案公司'`。

- [ ] **Step 3: 前端表单 label**

`port-info-dialog.tsx`：找到 `enterprise_name` FormItem 的 label，`"企业名称"` → `"主端口备案公司"`，同时 zod message 中的 `'企业名称'` 一并改。

- [ ] **Step 4: 前端详情 label**

`port-info-detail-dialog.tsx`：详情展示中企业名称的 label 改为 `"主端口备案公司"`。

- [ ] **Step 5: FIELD_LABEL_MAP**

`filing-management/create.tsx`：`FIELD_LABEL_MAP` 中 `enterprise_name` 的 label 区分场景——但这里 `enterprise_name` 在 map 中对应的是资质侧。如确认步骤展示端口信息时也从 port 取值，此处不改。仅在导出字段组的字段下拉和确认步骤中，通过 registry 的 label 展示。

- [ ] **Step 6: 跑 lint + build**

Run: `cd frontend && pnpm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes/port_info.py \
        frontend/src/features/port-info/index.tsx \
        frontend/src/features/port-info/components/port-info-dialog.tsx \
        frontend/src/features/port-info/components/port-info-detail-dialog.tsx
git commit -m "feat(port-info): 企业名称标签统一改为'主端口备案公司'"
```

---

## 组 E：报备管理搜索扩展 + 任务名自定义

### Task 8: 后端搜索扩展 + 自定义任务名

**Files:**
- Modify: `backend/app/crud/filing_task.py::list_filing_tasks`
- Modify: `backend/app/api/routes/filing_tasks.py::read_tasks`（不影响）

- [ ] **Step 1: 写失败测试**

追加到 `backend/app/tests/api/routes/test_filing_tasks_export.py`：

```python
def test_search_filing_tasks_by_operator_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """关键词应匹配操作人姓名"""
    qual_id = _create_qualification(client, superuser_token_headers, "搜索企业")
    port_id = _create_port(client, superuser_token_headers, "10698SCH")
    group_id = _create_export_group(client, superuser_token_headers, "搜索字段组")

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 200

    # 用操作人（admin用户）的部分名称搜索
    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        params={"keyword": "admin"},
    )
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_create_filing_task_with_custom_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers, "自定义名企业")
    port_id = _create_port(client, superuser_token_headers, "10698CSTM")
    group_id = _create_export_group(client, superuser_token_headers, "自定义名组")

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "task_name": "我的自定义任务名",
        },
    )
    assert r.status_code == 200
    assert r.json()["task_name"] == "我的自定义任务名"
```

- [ ] **Step 2: 跑测试看失败**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py::test_search_filing_tasks_by_operator_name tests/api/routes/test_filing_tasks_export.py::test_create_filing_task_with_custom_name -v`
Expected: FAIL（搜索不匹配；自定义名被自动生成覆盖）

- [ ] **Step 3: 改 CRUD 搜索逻辑**

`backend/app/crud/filing_task.py::list_filing_tasks`：

```python
from sqlalchemy import or_

# 在 keyword 过滤处：
if keyword:
    query = query.where(
        or_(
            FilingTask.task_name.contains(keyword),
            User.full_name.contains(keyword),
            User.username.contains(keyword),
            ExportGroup.name.contains(keyword),
        )
    )
```

确保 query 已经 join User 和 ExportGroup。如果还没 join，在函数开头加：

```python
query = select(FilingTask).join(User, FilingTask.operator_id == User.id).join(
    ExportGroup, FilingTask.export_group_id == ExportGroup.id
)
```

- [ ] **Step 4: 验证自定义任务名逻辑**

`FilingTaskCreate.task_name` 已经是 `str | None = None`，CRUD `create_filing_task` 中逻辑是 `task_name = create.task_name or auto_generate()`。不需要改后端——前端传了 `task_name` 就会用。

- [ ] **Step 5: 跑测试看通过**

Run: `cd backend && uv run pytest tests/api/routes/test_filing_tasks_export.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/crud/filing_task.py \
        backend/app/tests/api/routes/test_filing_tasks_export.py
git commit -m "feat(filing-tasks): 搜索扩展至操作人+字段组，支持自定义任务名"
```

---

### Task 9: 前端报备管理搜索提示 + 创建页任务名输入

**Files:**
- Modify: `frontend/src/features/filing-management/index.tsx`
- Modify: `frontend/src/features/filing-management/create.tsx`

- [ ] **Step 1: 搜索页 placeholder 更新**

`filing-management/index.tsx` 关键词输入框：

```tsx
// 改前
placeholder="搜索任务名称"
// 改后
placeholder="搜索任务名称、操作人、字段组"
```

- [ ] **Step 2: 创建页加任务名输入**

`filing-management/create.tsx`：

新增 state：
```tsx
const [taskName, setTaskName] = useState('')
```

在「配置导出」步骤（step 4 in 5-step flow）字段组下拉和分组排序之间插入：

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">任务名称（可选）</label>
  <Input
    placeholder="留空则自动生成"
    value={taskName}
    onChange={(e) => setTaskName(e.target.value)}
    className="w-full max-w-sm"
  />
</div>
```

`handleCreate` 中加上：
```tsx
task_name: taskName.trim() || undefined,
```

确认步骤概览中增加一行：
```tsx
<div>
  <span className="text-sm text-muted-foreground">任务名称</span>
  <p className="text-lg font-medium">{taskName || '（自动生成）'}</p>
</div>
```

- [ ] **Step 3: 跑 lint + build**

Run: `cd frontend && pnpm run lint && pnpm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/filing-management/index.tsx \
        frontend/src/features/filing-management/create.tsx
git commit -m "feat(filing-management): 搜索提示更新 + 创建页支持自定义任务名"
```

---

## Task 10: 最终验收

- [ ] **Step 1: 跑后端全测**

Run: `cd backend && uv run pytest app/tests/services/test_export_field_registry.py app/tests/api/routes/test_qualifications.py app/tests/api/routes/test_port_info.py app/tests/api/routes/test_filing_tasks_export.py -v`
Expected: 全 PASS

- [ ] **Step 2: 跑前端 build**

Run: `cd frontend && pnpm run build`
Expected: PASS

- [ ] **Step 3: 验收清单**

- [ ] 导入模板示例短信签名不再带 `【】` 括号
- [ ] 字段组可选字段中包含 4 个举证图片字段
- [ ] 端口信息管理支持关键词搜索（命中主端口号/子端口号/企业名称）
- [ ] 端口信息管理支持城市、端口类型下拉筛选
- [ ] 端口侧"企业名称"全部显示为"主端口备案公司"
- [ ] 导出文件中端口侧企业名列头为"主端口备案公司"
- [ ] 报备管理关键词搜索可匹配操作人和字段组
- [ ] 新建报备时可自定义任务名，不填则自动生成

- [ ] **Step 4: Commit 验收标记**

```bash
git add docs/报备平台用户问题与优化方向汇总.md
git commit -m "docs: P1 优化验收完成"
```

---

## 实施顺序总结

| Task | 组 | 主要交付 |
|---|---|---|
| 1 | A | 签名示例去括号 |
| 2 | B | 注册表 + 映射补 4 个举证图片字段 |
| 3 | B | 导入模板填写说明增强 |
| 4 | C | 后端端口查询筛选（keyword/city/port_type/main_port_number） |
| 5 | C | 前端端口筛选UI |
| 6 | D | 注册表分拆 port_enterprise_name + get_field_value 别名 |
| 7 | D | 后端模板表头 + 前端标签改名 |
| 8 | E | 后端搜索扩展 + 自定义任务名 |
| 9 | E | 前端搜索提示 + 任务名输入 |
| 10 | — | 最终验收 |

组间独立，可按 A→B→C→D→E 或任意顺序实施。
