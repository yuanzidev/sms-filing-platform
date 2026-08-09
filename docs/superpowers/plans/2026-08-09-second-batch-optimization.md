# 报备平台第二批整改优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现文档 `报备平台第二批整改优化点汇总.md` 中的 11 个优化点，覆盖端口信息必填规则放宽、子端口生成规则扩展、资质导入错误报告、字段组导入导出等。

**Architecture:** 在现有 FastAPI + React + SQLModel 架构上进行增量改造。后端按 model → crud → route → test 顺序修改，前端按 types → API → component 顺序。每任务独立提交。

**Tech Stack:** Python 3.x / FastAPI / SQLModel / Alembic / openpyxl / TypeScript / React 18 / TanStack Query / react-hook-form + zod / shadcn/ui

## Global Constraints

- 所有后端路由需要 superuser 权限（已有 `get_current_active_superuser` 依赖）
- 操作需记录到 `operation_log` 表
- 数据库变更必须通过 Alembic 迁移
- 前端表单使用 zod schema 校验
- 提交信息格式：`feat(scope): description` 或 `fix(scope): description`

## File Structure

本次计划涉及的文件：

**Backend — 修改：**
- `app/models/port_info.py` — 端口信息模型（必填放宽、新增基础电信企业ID）
- `app/services/sub_port_allocator.py` — 子端口分配器（多模式生成）
- `app/api/routes/port_info.py` — 端口信息路由（导入重构、模板更新）
- `app/api/routes/qualifications.py` — 资质路由（导入重构、模板更新、法人选填）
- `app/api/routes/filing_tasks.py` — 报备任务路由（生成规则参数、下载细化、重新生成、短信子端口号拼接）
- `app/api/routes/export_groups.py` — 字段组路由（导入导出）
- `app/services/export_field_registry.py` — 字段注册表（新增条目）
- `app/services/excel_image_extractor.py` — 图片提取（行索引修复）
- `app/crud/port_info.py` — 端口 CRUD（结构化错误）

**Backend — 新建：**
- `app/models/sub_port_generation_rule.py` — 子端口生成规则模型
- `app/crud/sub_port_generation_rule.py` — 规则 CRUD
- `app/api/routes/sub_port_generation_rules.py` — 规则路由

**Backend — 迁移：**
- `app/alembic/versions/xxxx_make_port_fields_nullable.py`
- `app/alembic/versions/xxxx_add_basic_telecom_enterprise_id.py`
- `app/alembic/versions/xxxx_add_sub_port_generation_rule.py`

**Frontend — 修改：**
- `src/lib/api/types.ts` — 类型定义
- `src/features/port-info/components/port-info-dialog.tsx` — 端口表单
- `src/features/port-info/index.tsx` — 端口列表
- `src/features/port-info/components/port-info-detail-dialog.tsx` — 端口详情
- `src/features/filing-management/index.tsx` — 报备列表
- `src/features/filing-management/create.tsx` — 报备创建向导
- `src/features/export-groups/index.tsx` — 字段组卡片列表
- `src/components/shared/import-dialog.tsx` — 通用导入对话框

**Frontend — 新建：**
- `src/lib/api/sub-port-rules.ts` — 子端口规则 API

---

### Task 1: P0-5 资质导入模板字段顺序适配 + 法人字段选填

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:257-262` (import missing columns check)
- Modify: `backend/app/api/routes/qualifications.py:43-89` (_QUALIFICATION_HEADERS)
- Modify: `backend/app/api/routes/qualifications.py:155-169` (instructions sheet)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: updated import logic that no longer requires legal-rep columns

- [ ] **Step 1: 移除导入必填列检查中的法人证件字段**

Edit `backend/app/api/routes/qualifications.py`, replace the `missing` check at line 257:

```python
# Before (line 257):
missing = [h for h, f in header_to_field.items() if f in ("enterprise_name", "legal_representative_cert_type", "legal_representative_cert_number", "legal_representative_cert_address") and f not in col_map]

# After:
missing = [h for h, f in header_to_field.items() if f == "enterprise_name" and f not in col_map]
```

- [ ] **Step 2: 更新模板表头列表与客户新版模板一致**

Replace `_QUALIFICATION_HEADERS` at lines 43-89 to match the new template's 45 fields in order (经办人字段已前置、法人字段跟随):

```python
_QUALIFICATION_HEADERS = [
    "企业名称",
    "单位证件号码",
    "单位证件类型",
    "单位证件图片",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人手机号",
    "责任人证件地址",
    "责任人身份证正面",
    "责任人身份证反面",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人手机号",
    "经办人证件地址",
    "经办人现场照片",
    "法人姓名",
    "法人证件类型",
    "法人证件号码",
    "法人证件地址",
    "法人身份证正面",
    "法人身份证反面",
    "短信签名",
    "签名类型/来源",
    "短信模板内容",
    "是否签名校验",
    "是否网关签名",
    "模板是否包含变量",
    "模板参数类型",
    "模板参数长度",
    "业务属性",
    "业务类型",
    "业务细类",
    "具体用途",
    "引流号码",
    "引流链接",
    "引流号码类型",
    "引流号码用途",
    "引流内容",
    "链接类型",
    "签名举证附件",
    "引流号码举证附件",
    "引流链接举证",
    "APP/平台名称",
]
```

- [ ] **Step 3: 更新模板示例数据行顺序与新版表头一致**

Replace the `example_data` list at lines 105-151 with values matching the new header order:

```python
example_data = [
    "示例企业有限公司",
    "91110108MA01XXXXX",          # 单位证件号码
    "营业执照",                    # 单位证件类型
    "",                            # 单位证件图片
    "李四",                        # 责任人姓名
    "身份证",                      # 责任人证件类型
    "110101199001011234",          # 责任人证件号码
    "13800138000",                 # 责任人手机号
    "北京市朝阳区XX路1号",         # 责任人证件地址
    "",                            # 责任人身份证正面
    "",                            # 责任人身份证反面
    "王五",                        # 经办人姓名
    "身份证",                      # 经办人证件类型
    "110101199501011234",          # 经办人证件号码
    "13900139000",                 # 经办人手机号
    "北京市海淀区XX路2号",         # 经办人证件地址
    "",                            # 经办人现场照片
    "张三",                        # 法人姓名
    "身份证",                      # 法人证件类型
    "110101199001011234",          # 法人证件号码
    "北京市朝阳区XX路1号",         # 法人证件地址
    "",                            # 法人身份证正面
    "",                            # 法人身份证反面
    "示例平台",                    # 短信签名
    "自营签名",                    # 签名类型/来源
    "您的验证码是{code}，请在5分钟内完成验证",  # 短信模板内容
    "是",                          # 是否签名校验
    "否",                          # 是否网关签名
    "是",                          # 模板是否包含变量
    "数字",                        # 模板参数类型
    "6",                           # 模板参数长度
    "营销类",                      # 业务属性
    "验证码",                      # 业务类型
    "登录验证",                    # 业务细类
    "用户登录验证",                # 具体用途
    "13800000000",                 # 引流号码
    "https://example.com",         # 引流链接
    "手机号",                      # 引流号码类型
    "业务联系",                    # 引流号码用途
    "欢迎使用我们的服务",          # 引流内容
    "H5",                          # 链接类型
    "",                            # 签名举证附件
    "",                            # 引流号码举证附件
    "",                            # 引流链接举证
    "示例平台",                    # APP/平台名称
]
```

- [ ] **Step 4: 更新填写说明中的法人字段选填描述（已存在，验证即可）**

Line 165 already says "法人证件类型/号码/地址：选填；运营商报备强依赖时再填". No change needed.

- [ ] **Step 5: 更新模板图片示例注入位置**

The sample cell image was at "O2" (column 15, 签名举证附件). With the new header order, 签名举证附件 is at column 42 (1-based) = "AP2". Update the `cell_images` dict in `download_qualification_template`:

```python
# Before:
cell_images = {"O2": img_buf.getvalue()}

# After:
cell_images = {"AP2": img_buf.getvalue()}
```

- [ ] **Step 6: 验证导入按表头匹配仍正常工作**

Run the existing test suite to confirm no regressions:

```bash
cd backend && uv run pytest app/tests/ -x -q
```

Expected: all existing tests pass. The `header_to_field` dict already maps by header text, not column order, so reordering columns does not affect import correctness.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes/qualifications.py
git commit -m "feat(qualifications): 资质导入模板字段顺序适配客户新版 + 法人字段选填

- 移除导入必填列检查中的法人证件三字段
- _QUALIFICATION_HEADERS 更新为与客户新版模板一致的 45 字段顺序
- 经办人/法人字段按新模板排列，示例数据同步调整
- 图片示例注入位置更新为 AP2"
```

---

### Task 2: P0-1 端口信息必填规则放宽 + 错误提示优化

**Files:**
- Modify: `backend/app/models/port_info.py:15-17` (carrier_room, enterprise_room, authorization_letter → Optional)
- Modify: `backend/app/api/routes/port_info.py:193-274` (import required fields + row validation)
- Modify: `frontend/src/features/port-info/components/port-info-dialog.tsx:87-112` (zod schema + error handling)

**Interfaces:**
- Consumes: nothing
- Produces: `PortInfoBase` with carrier_room/enterprise_room/authorization_letter as Optional[str], frontend schema matches

- [ ] **Step 1: 后端模型 — carrier_room/enterprise_room/authorization_letter 改为 Optional**

Edit `backend/app/models/port_info.py`:

```python
# Before (lines 15-17):
carrier_room: str
enterprise_room: str
authorization_letter: str = Field(max_length=500)

# After:
carrier_room: str | None = Field(default=None)
enterprise_room: str | None = Field(default=None)
authorization_letter: str | None = Field(default=None, max_length=500)
```

- [ ] **Step 2: 生成 Alembic 迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "make port_info non-core fields nullable"
```

Verify the generated migration makes `carrier_room`, `enterprise_room`, `authorization_letter` columns nullable.

- [ ] **Step 3: 运行迁移**

```bash
cd backend && uv run alembic upgrade head
```

- [ ] **Step 4: 更新导入必填列检查**

Edit `backend/app/api/routes/port_info.py`, line 193:

```python
# Before:
required_fields = ["carrier", "main_port_number", "enterprise_name", "port_type", "carrier_room", "enterprise_room", "authorization_letter"]

# After:
required_fields = ["carrier", "main_port_number", "enterprise_name", "port_type"]
```

- [ ] **Step 5: 更新导入逐行校验 — 移除 carrier_room/enterprise_room/authorization_letter 的必填检查**

Delete lines 264-274 in `port_info.py` (the validation blocks for carrier_room, enterprise_room, authorization_letter), and update the `PortInfo(...)` constructor to use the `cell()` helper directly:

```python
# Replace lines 264-274 and the PortInfo constructor (lines 276-301) with:
objects.append(PortInfo(
    carrier=carrier,
    main_port_number=main_port_number,
    enterprise_name=enterprise_name,
    sub_port_number=cell("sub_port_number"),
    port_range=cell("port_range"),
    province=cell("province"),
    city=cell("city"),
    port_type=port_type,
    operation_type=cell("operation_type"),
    port_activation_date=parse_date("port_activation_date"),
    allow_self_extension=parse_bool("allow_self_extension"),
    carrier_room=cell("carrier_room"),
    enterprise_room=cell("enterprise_room"),
    has_authorization=parse_bool("has_authorization"),
    authorization_letter=cell("authorization_letter"),
    auth_start_date=parse_date("auth_start_date"),
    auth_end_date=parse_date("auth_end_date"),
    group_code=cell("group_code"),
    region=cell("region"),
    other_room_description=cell("other_room_description"),
    is_green_channel=parse_bool("is_green_channel"),
    blacklist_whitelist_type=cell("blacklist_whitelist_type"),
    audit_form=cell("audit_form"),
    customer_type=cell("customer_type"),
))
```

Also remove the now-unused local variables `carrier_room`, `enterprise_room`, `authorization_letter` (no longer assigned before use).

- [ ] **Step 6: 更新端口信息创建端点 — 添加结构化错误返回**

Edit `backend/app/api/routes/port_info.py`, the `create_port_info_endpoint` at line 360:

```python
@router.post("", response_model=PortInfoPublic)
@router.post("/", include_in_schema=False, response_model=PortInfoPublic)
def create_port_info_endpoint(*, session: SessionDep, create: PortInfoCreate, current_user: CurrentUser, request: Request) -> Any:
    try:
        result = create_port_info(session=session, create=create)
    except Exception as e:
        error_str = str(e)
        if "unique" in error_str.lower() or "duplicate" in error_str.lower():
            raise HTTPException(
                status_code=409,
                detail={"field": "main_port_number", "reason": "主端口号已存在", "suggestion": "请使用不同的主端口号，或先查询已有端口信息"},
            )
        raise HTTPException(
            status_code=500,
            detail={"field": "", "reason": error_str, "suggestion": "请联系管理员"},
        )
    log_operation(session=session, user=current_user, user_ip=request.client.host if request.client else "", module="port_info", action="create", target=f"{result.main_port_number or result.sub_port_number or result.id}")
    return result
```

- [ ] **Step 7: 前端 — 更新 zod schema**

Edit `frontend/src/features/port-info/components/port-info-dialog.tsx`, lines 99-102 of `formSchema`:

```typescript
// Before:
carrier_room: z.string().min(1, '运营商接入机房及设备不能为空'),
enterprise_room: z.string().min(1, '企业接入机房及设备不能为空'),
// ...
authorization_letter: z.string().min(1, '授权书不能为空'),

// After:
carrier_room: z.string().optional(),
enterprise_room: z.string().optional(),
// ...
authorization_letter: z.string().optional(),
```

- [ ] **Step 8: 前端 — 更新表单项标签，移除"*"必填标记**

In `port-info-dialog.tsx`, update FormLabel for carrier_room (line 370), enterprise_room (line 383), authorization_letter (line 422):

```tsx
// Before:
<FormLabel>运营商接入机房及设备 *</FormLabel>
<FormLabel>企业接入机房及设备 *</FormLabel>
<FormLabel>授权书 *</FormLabel>

// After:
<FormLabel>运营商接入机房及设备</FormLabel>
<FormLabel>企业接入机房及设备</FormLabel>
<FormLabel>授权书</FormLabel>
```

- [ ] **Step 9: 前端 — 改进创建/更新失败的错误提示**

Edit mutation error handlers in `port-info-dialog.tsx`, lines 163 and 174:

```typescript
// Before:
onError: () => toast.error('端口信息创建失败'),

// After:
onError: (err: any) => {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'object' && detail.field) {
    form.setError(detail.field as any, { message: `${detail.reason}。${detail.suggestion || ''}` })
    toast.error(detail.reason)
  } else if (typeof detail === 'string') {
    toast.error(detail)
  } else {
    toast.error('端口信息创建失败')
  }
},
```

Apply the same pattern to `updateMutation`'s `onError` (line 174), changing the toast text to '端口信息更新失败'.

- [ ] **Step 10: 验证**

```bash
# Backend tests
cd backend && uv run pytest app/tests/api/routes/test_port_info.py -x -q

# Frontend type check
cd frontend && pnpm run lint
```

Expected: backend tests pass, frontend lint clean.

- [ ] **Step 11: Commit**

```bash
git add backend/app/models/port_info.py backend/app/alembic/ backend/app/api/routes/port_info.py
git add frontend/src/features/port-info/components/port-info-dialog.tsx
git commit -m "feat(port-info): 放宽非核心字段必填规则 + 结构化错误提示

- carrier_room/enterprise_room/authorization_letter 改为选填
- 创建失败时返回 {field, reason, suggestion} 结构化错误
- 前端同步更新 zod schema 和错误展示
- 导入必填列检查同步调整"
```

---

### Task 3: P0-6 端口信息新增"基础电信企业ID"

**Files:**
- Modify: `backend/app/models/port_info.py` (add field)
- Modify: `backend/app/api/routes/port_info.py` (import mapping + template)
- Modify: `backend/app/services/export_field_registry.py` (registry entry)
- Modify: `frontend/src/lib/api/types.ts` (PortInfo type)
- Modify: `frontend/src/features/port-info/components/port-info-dialog.tsx` (form)
- Modify: `frontend/src/features/port-info/index.tsx` (table)
- Modify: `frontend/src/features/port-info/components/port-info-detail-dialog.tsx` (detail)

**Interfaces:**
- Consumes: nothing
- Produces: `PortInfoBase.basic_telecom_enterprise_id: Optional[str]` (varchar, nullable)

- [ ] **Step 1: 后端模型新增字段**

Edit `backend/app/models/port_info.py`, add after `customer_type`:

```python
customer_type: str | None = Field(default=None, max_length=50)
basic_telecom_enterprise_id: str | None = Field(default=None, max_length=100)  # NEW
```

Also add to `PortInfoUpdate`:

```python
customer_type: str | None = None
basic_telecom_enterprise_id: str | None = None  # NEW
```

- [ ] **Step 2: 生成并运行迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "add basic_telecom_enterprise_id to port_info"
cd backend && uv run alembic upgrade head
```

- [ ] **Step 3: 导入模板和映射新增字段**

Edit `backend/app/api/routes/port_info.py`:

In `_PORT_HEADERS` (after "客户类型"): add `"基础电信企业ID"`

In `header_to_field` (after "客户类型"): add `"基础电信企业ID": "basic_telecom_enterprise_id"`

In the `PortInfo(...)` constructor within `import_port_infos`, add:
```python
customer_type=cell("customer_type"),
basic_telecom_enterprise_id=cell("basic_telecom_enterprise_id"),  # NEW
```

- [ ] **Step 4: 导出字段注册表新增条目**

Edit `backend/app/services/export_field_registry.py`, add to the port group section:

```python
{
    "name": "basic_telecom_enterprise_id",
    "label": "基础电信企业ID",
    "source": "port_info",
    "group": "端口信息",
    "description": "基础电信企业唯一标识",
},
```

- [ ] **Step 5: 前端类型定义新增字段**

Edit `frontend/src/lib/api/types.ts`, add to `PortInfo` interface:

```typescript
export interface PortInfo {
  // ... existing fields ...
  customer_type?: string
  basic_telecom_enterprise_id?: string  // NEW
}
```

- [ ] **Step 6: 前端表单新增字段**

Edit `frontend/src/features/port-info/components/port-info-dialog.tsx`:

In `formSchema` (after `customer_type`):
```typescript
basic_telecom_enterprise_id: z.string().optional(),
```

In `toDefaultValues` (after `customer_type`):
```typescript
basic_telecom_enterprise_id: p?.basic_telecom_enterprise_id || '',
```

In the form JSX (after the `customer_type` FormField block at line 525), add:
```tsx
<FormField
  control={form.control}
  name="basic_telecom_enterprise_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>基础电信企业ID</FormLabel>
      <FormControl>
        <Input placeholder="基础电信企业ID" {...field} value={field.value || ''} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

- [ ] **Step 7: 前端列表表格新增可选列**

Edit `frontend/src/features/port-info/index.tsx`, add to the columns definition after `customer_type`:

```tsx
{ accessorKey: 'basic_telecom_enterprise_id', header: '基础电信企业ID' },
```

- [ ] **Step 8: 前端详情弹窗新增展示**

Edit `frontend/src/features/port-info/components/port-info-detail-dialog.tsx`, add in the 扩展配置 section after `customer_type`:

```tsx
<div>
  <span className="text-muted-foreground">基础电信企业ID：</span>
  {portInfo.basic_telecom_enterprise_id || '-'}
</div>
```

- [ ] **Step 9: 验证**

```bash
cd backend && uv run pytest app/tests/api/routes/test_port_info.py -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/port_info.py backend/app/alembic/ backend/app/api/routes/port_info.py backend/app/services/export_field_registry.py
git add frontend/src/lib/api/types.ts frontend/src/features/port-info/
git commit -m "feat(port-info): 新增基础电信企业ID字段

- port_info 表新增 basic_telecom_enterprise_id 列
- 导入模板、导出注册表、前端表单/表格/详情同步新增"
```

---

### Task 4: P0-4 资质导入失败定位与错误报告

**Files:**
- Modify: `backend/app/api/routes/qualifications.py:193-365` (import logic)
- Modify: `backend/app/api/routes/port_info.py:142-334` (import logic)
- Modify: `backend/app/services/excel_image_extractor.py` (row index fix)
- Modify: `frontend/src/components/shared/import-dialog.tsx` (error display)

**Interfaces:**
- Consumes: nothing
- Produces: Import response `{total, success_count, error_count, errors: [{row, field, value, reason, suggestion}]}`, `GET /qualifications/import/error-report/{batch_id}`

- [ ] **Step 1: 修复空行导致图片行索引错位 bug**

Edit `backend/app/services/excel_image_extractor.py`. The issue is that `ExtractedImage.row_index` is set based on absolute Excel row number, but empty rows are skipped in the data objects list. Track a mapping from Excel row → data list index.

In `extract_cell_images_from_xlsx`, add a parameter `data_row_indices: list[int]` (Excel row numbers that have non-empty data). After extracting images, filter and remap:

```python
def extract_cell_images_from_xlsx(
    xlsx_bytes: bytes,
    headers: list[str],
    data_row_indices: list[int] | None = None,
) -> list[ExtractedImage]:
    # ... existing extraction logic ...
    # After building images list:
    if data_row_indices:
        excel_row_to_data_idx = {excel_row: data_idx for data_idx, excel_row in enumerate(data_row_indices)}
        for img in images:
            if img.row_index in excel_row_to_data_idx:
                img.row_index = excel_row_to_data_idx[img.row_index]
            else:
                img.row_index = -1  # mark for removal
        images = [img for img in images if img.row_index >= 0]
    return images
```

Same fix for `extract_images_from_xlsx`.

- [ ] **Step 2: 重构资质导入 — 两阶段校验+收集所有错误**

Rewrite `import_qualifications` in `backend/app/api/routes/qualifications.py`. Key changes:

```python
@router.post("/import")
def import_qualifications(*, session: SessionDep, file: UploadFile = File(...)) -> Any:
    # ... file validation and header parsing (same as before) ...

    # Phase 1: Validate all rows, collect errors
    objects: list[QualificationInfo] = []
    errors: list[dict] = []
    data_row_indices: list[int] = []

    for row_idx, row in enumerate(rows[1:], start=2):
        if all(c is None or str(c).strip() == "" for c in row):
            continue

        row_errors: list[dict] = []
        enterprise_name = cell("enterprise_name")
        if not enterprise_name:
            row_errors.append({
                "row": row_idx, "field": "企业名称", "value": "",
                "reason": "企业名称不能为空", "suggestion": "请填写企业名称"
            })

        # Validate booleans
        for bool_field, cn_name in [("signature_verified", "是否签名校验"), ("is_gateway_signature", "是否网关签名"), ("template_has_variable", "模板是否包含变量")]:
            v = cell(bool_field)
            if v and v not in ("是", "否", "true", "True", "1", "TRUE", "false", "False", "0", "FALSE"):
                row_errors.append({
                    "row": row_idx, "field": cn_name, "value": v,
                    "reason": "布尔字段值无效", "suggestion": "请填写「是」或「否」"
                })

        if row_errors:
            errors.extend(row_errors)
        else:
            objects.append(QualificationInfo(...))  # same constructor as before
            data_row_indices.append(row_idx)

    # Phase 2: If no valid rows, return all errors
    if not objects and errors:
        return {
            "total": len(objects) + len({e["row"] for e in errors}),
            "success_count": 0,
            "error_count": len(errors),
            "errors": errors,
        }

    # Phase 3: Write valid rows + extract images with fixed indices
    session.add_all(objects)
    session.flush()

    warnings: list[str] = []
    if file.filename.endswith(".xlsx"):
        all_images: list = []
        try:
            all_images.extend(extract_cell_images_from_xlsx(content, headers=header_row, data_row_indices=data_row_indices))
        except Exception as e:
            warnings.append(f"单元格图片提取失败: {e}")
        try:
            all_images.extend(extract_images_from_xlsx(content, data_row_indices=data_row_indices))
        except Exception as e:
            warnings.append(f"浮动图片提取失败: {e}")
        if all_images:
            _, img_warnings = upload_import_images(...)
            warnings.extend(img_warnings)

    session.commit()

    return {
        "total": len(objects) + len({e["row"] for e in errors}),
        "success_count": len(objects),
        "error_count": len(errors),
        "errors": errors,
        "warnings": warnings,
    }
```

- [ ] **Step 3: 同样重构端口信息导入**

Apply the same two-phase pattern to `import_port_infos` in `backend/app/api/routes/port_info.py`.

- [ ] **Step 4: 新增错误报告下载端点**

Add to `backend/app/api/routes/qualifications.py`:

```python
from pydantic import BaseModel

class ImportErrorReport(BaseModel):
    errors: list[dict]

@router.post("/import/error-report")
def download_import_error_report(body: ImportErrorReport) -> Any:
    """Generate an Excel file highlighting import errors."""
    from openpyxl.styles import Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = "导入错误报告"

    headers = ["行号", "字段", "原值", "失败原因", "修复建议"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = Font(bold=True)

    red_fill = PatternFill(start_color="FFD7D7", end_color="FFD7D7", fill_type="solid")
    for i, err in enumerate(body.errors, 2):
        ws.cell(row=i, column=1, value=err.get("row"))
        ws.cell(row=i, column=2, value=err.get("field"))
        ws.cell(row=i, column=3, value=err.get("value"))
        ws.cell(row=i, column=4, value=err.get("reason"))
        ws.cell(row=i, column=5, value=err.get("suggestion"))
        for col in range(1, 6):
            ws.cell(row=i, column=col).fill = red_fill

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('导入错误报告.xlsx')}"},
    )
```

- [ ] **Step 5: 前端 ImportDialog 展示结构化错误 + 下载错误报告**

Edit `frontend/src/components/shared/import-dialog.tsx`:

After the import API call, handle the new response format:

```tsx
// Inside handleImport:
const result = await onImport(file)
// Check if result has structured errors
if (result.errors && result.errors.length > 0) {
  setImportErrors(result.errors)
  toast.error(`导入完成：成功 ${result.success_count} 条，失败 ${result.error_count} 条`)
} else {
  toast.success(result.message || '导入成功')
  onSuccess?.()
}

// Add state for errors
const [importErrors, setImportErrors] = useState<any[]>([])

// Add error download handler
const handleDownloadErrorReport = async () => {
  // Call the error report endpoint with the errors array
  // ...
}

// In the dialog body, when importErrors.length > 0:
{importErrors.length > 0 && (
  <div className="mt-4 space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="font-medium text-sm">导入错误详情</h4>
      <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
        下载错误报告
      </Button>
    </div>
    <div className="max-h-48 overflow-auto rounded border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className="p-1 text-left">行号</th>
            <th className="p-1 text-left">字段</th>
            <th className="p-1 text-left">值</th>
            <th className="p-1 text-left">原因</th>
            <th className="p-1 text-left">建议</th>
          </tr>
        </thead>
        <tbody>
          {importErrors.map((err, i) => (
            <tr key={i} className="border-t">
              <td className="p-1">{err.row}</td>
              <td className="p-1">{err.field}</td>
              <td className="p-1 max-w-[100px] truncate">{err.value}</td>
              <td className="p-1 text-red-600">{err.reason}</td>
              <td className="p-1">{err.suggestion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 6: 验证**

```bash
cd backend && uv run pytest app/tests/ -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes/qualifications.py backend/app/api/routes/port_info.py backend/app/services/excel_image_extractor.py
git add frontend/src/components/shared/import-dialog.tsx
git commit -m "feat(import): 导入失败定位细化 — 结构化错误 + 错误报告下载

- 重构资质导入和端口导入为两阶段：先收集所有错误，再批量写入成功行
- 错误结构包含行号/字段/原值/原因/修复建议
- 新增下载错误报告端点，生成带红色标注的 Excel
- 修复空行导致图片行索引错位 bug
- 前端 ImportDialog 展示结构化错误表格 + 下载错误报告按钮"
```

---

### Task 5: P0-2 子端口生成规则扩展

**Files:**
- Modify: `backend/app/services/sub_port_allocator.py` (multi-mode allocation)
- Modify: `backend/app/api/routes/filing_tasks.py` (new params in create task, availability check)
- Modify: `frontend/src/features/filing-management/create.tsx` (Step 3 rule selection)

**Interfaces:**
- Consumes: `FilingTaskCreate` schema (existing)
- Produces: `allocate_sub_ports` with mode parameter, `AllocationMode` enum

- [ ] **Step 1: 新增 AllocationMode 枚举和重构 allocate_sub_ports**

Edit `backend/app/services/sub_port_allocator.py`:

```python
from enum import Enum

class AllocationMode(str, Enum):
    random = "random"
    sequential = "sequential"
    fixed_suffix = "fixed_suffix"


def allocate_sub_ports(
    session: Session,
    main_port_numbers: list[str],
    range_start: int,
    range_end: int,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
    mode: AllocationMode = AllocationMode.random,
    fixed_suffix: str | None = None,
    width: int = 6,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """Allocate sub-ports by mode."""
    need_per_main = len(qualifications)
    if need_per_main == 0 or not main_port_numbers:
        return {}

    if mode == AllocationMode.random:
        return _allocate_random(session, main_port_numbers, range_start, range_end, qualifications, operator_id, filing_task_id, width)
    elif mode == AllocationMode.sequential:
        return _allocate_sequential(session, main_port_numbers, range_start, qualifications, operator_id, filing_task_id, width)
    elif mode == AllocationMode.fixed_suffix:
        return _allocate_fixed_suffix(session, main_port_numbers, fixed_suffix, qualifications, operator_id, filing_task_id, width)
    else:
        raise HTTPException(status_code=400, detail=f"不支持的分配模式: {mode}")
```

- [ ] **Step 2: 实现 _allocate_sequential**

```python
def _allocate_sequential(
    session, main_port_numbers, range_start, qualifications, operator_id, filing_task_id, width
):
    need_per_main = len(qualifications)
    result: dict[str, list[tuple[QualificationInfo, str]]] = {}
    records: list[dict] = []
    for mpn in main_port_numbers:
        used = get_used_numbers(session, mpn)
        nums = []
        current = range_start
        while len(nums) < need_per_main:
            candidate = str(current).zfill(width)
            if candidate not in used:
                nums.append(candidate)
                used.add(candidate)
            current += 1
        result[mpn] = []
        for qual, num in zip(qualifications, nums):
            result[mpn].append((qual, num))
            records.append({
                "main_port_number": mpn, "port_number": num,
                "filing_task_id": filing_task_id, "qualification_id": qual.id,
                "operator_id": operator_id,
            })
    bulk_create_usages(session, records)
    session.commit()
    return result
```

- [ ] **Step 3: 实现 _allocate_fixed_suffix**

```python
def _allocate_fixed_suffix(
    session, main_port_numbers, fixed_suffix, qualifications, operator_id, filing_task_id, width
):
    """Allocate sub-ports with a fixed suffix. The extension is: prefix + suffix.
    prefix is allocated sequentially from 0 upward."""
    if not fixed_suffix:
        raise HTTPException(status_code=400, detail="固定后缀模式必须提供 fixed_suffix")
    need_per_main = len(qualifications)
    result: dict[str, list[tuple[QualificationInfo, str]]] = {}
    records: list[dict] = []
    for mpn in main_port_numbers:
        used = get_used_numbers(session, mpn)
        nums = []
        prefix = 0
        while len(nums) < need_per_main:
            candidate = f"{prefix}{fixed_suffix}".zfill(width) if len(f"{prefix}{fixed_suffix}") <= width else f"{prefix}{fixed_suffix}"
            if candidate not in used:
                nums.append(candidate)
                used.add(candidate)
            prefix += 1
            if prefix > 999999:
                raise SubPortRangeExhausted(mpn, need_per_main, len(nums), 0, prefix)
        result[mpn] = []
        for qual, num in zip(qualifications, nums):
            result[mpn].append((qual, num))
            records.append({
                "main_port_number": mpn, "port_number": num,
                "filing_task_id": filing_task_id, "qualification_id": qual.id,
                "operator_id": operator_id,
            })
    bulk_create_usages(session, records)
    session.commit()
    return result
```

- [ ] **Step 4: 更新 FilingTaskCreate schema 和 create_task 路由**

Edit `backend/app/models/filing_task.py` (or wherever `FilingTaskCreate` is defined), add fields:

```python
allocation_mode: str | None = "random"
fixed_suffix: str | None = None
```

Edit `backend/app/api/routes/filing_tasks.py`, in `create_task`, pass new params to `allocate_sub_ports`:

```python
allocated = allocate_sub_ports(
    session=session,
    main_port_numbers=main_port_numbers,
    range_start=body.sub_port_range_start,
    range_end=body.sub_port_range_end,
    qualifications=qualifications,
    operator_id=current_user.id,
    filing_task_id=task.id,
    mode=AllocationMode(body.allocation_mode or "random"),
    fixed_suffix=body.fixed_suffix,
)
```

- [ ] **Step 5: 更新可用性检查端点适配多模式**

In `check_sub_port_availability`, add `mode` parameter and adjust logic for sequential/fixed_suffix modes.

- [ ] **Step 6: 移除 6 位硬编码限制**

In `sub_port_allocator.py`, remove `WIDTH = 6` constant and make `width` a parameter (default 6) in all allocation functions. Remove `MAX_RANGE_SIZE` restriction for sequential/suffix modes (size only matters for random which needs the full set in memory).

- [ ] **Step 7: 前端 Step 3 新增模式选择 UI**

Edit `frontend/src/features/filing-management/create.tsx`, in the 配置子端口范围 step (Step 3):

```tsx
const [allocationMode, setAllocationMode] = useState<'random' | 'sequential' | 'fixed_suffix'>('random')
const [fixedSuffix, setFixedSuffix] = useState('')

// Add mode selector above the range inputs:
<div className="space-y-4">
  <div>
    <Label>生成模式</Label>
    <Select value={allocationMode} onValueChange={(v) => setAllocationMode(v as any)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="random">范围内随机生成</SelectItem>
        <SelectItem value="sequential">范围内顺序生成</SelectItem>
        <SelectItem value="fixed_suffix">固定后缀生成</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {allocationMode === 'fixed_suffix' ? (
    <div>
      <Label>固定后缀</Label>
      <Input
        value={fixedSuffix}
        onChange={(e) => setFixedSuffix(e.target.value)}
        placeholder="例如: 95598"
      />
    </div>
  ) : (
    <>
      {/* existing range_start / range_end inputs */}
    </>
  )}
</div>
```

- [ ] **Step 8: 更新 handleCreate 传递新参数**

In the `handleCreate` function of `create.tsx`:

```typescript
const handleCreate = async () => {
  // ...
  await createFilingTask({
    // ... existing params ...
    allocation_mode: allocationMode,
    fixed_suffix: allocationMode === 'fixed_suffix' ? fixedSuffix : undefined,
  })
}
```

- [ ] **Step 9: 验证**

```bash
cd backend && uv run pytest app/tests/services/test_sub_port_allocator.py -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/services/sub_port_allocator.py backend/app/api/routes/filing_tasks.py
git add frontend/src/features/filing-management/create.tsx
git commit -m "feat(sub-port): 子端口生成规则扩展 — 支持随机/顺序/固定后缀三种模式

- AllocationMode 枚举: random / sequential / fixed_suffix
- _allocate_sequential 从 range_start 顺序分配
- _allocate_fixed_suffix 按 prefix + suffix 格式生成
- 移除 WIDTH 硬编码，width 参数化
- 前端 Step 3 新增模式选择 + 固定后缀输入"
```

---

### Task 6: P0-3 短信子端口号命名与拼接

**Files:**
- Modify: `backend/app/api/routes/filing_tasks.py` (generate_excel: three columns)
- Modify: `backend/app/services/export_field_registry.py` (three new entries)
- Modify: `frontend/src/features/filing-management/create.tsx` (Step 3 preview)
- Modify: `frontend/src/features/port-info/index.tsx` (column label)

**Interfaces:**
- Consumes: P0-2 (sub_port extension from allocator)
- Produces: export columns — 主端口号, 子端口扩展码, 短信子端口号 (= concat)

- [ ] **Step 1: 注册表新增三个字段**

Edit `backend/app/services/export_field_registry.py`, add to port group:

```python
{"name": "port_main_number", "label": "主端口号", "source": "port_info", "group": "端口信息", "description": "主端口号码"},
{"name": "port_sub_extension", "label": "子端口扩展码", "source": "port_info", "group": "端口信息", "description": "子端口扩展码（分配或输入）"},
{"name": "port_full_number", "label": "短信子端口号", "source": "port_info", "group": "端口信息", "description": "完整短信子端口号 = 主端口号 + 子端口扩展码"},
```

Mark the old `port_sub_number` entry with `"deprecated": True` (keep for backward compatibility).

- [ ] **Step 2: generate_excel 中实现拼接和三列输出**

Edit `backend/app/api/routes/filing_tasks.py`, in `generate_excel`:

After the existing column header loop, ensure `get_field_value` handles the three new fields:

```python
def get_field_value(item: dict, field_name: str, registry_map: dict) -> str:
    # ... existing dispatch ...
    if field_name == "port_main_number":
        return item.get("main_port_number", "")
    if field_name == "port_sub_extension":
        return item.get("sub_port_number", "")
    if field_name == "port_full_number":
        mpn = item.get("main_port_number", "")
        sub = item.get("sub_port_number", "")
        return mpn + sub if mpn and sub else mpn or sub or ""
    # ... rest of dispatch ...
```

- [ ] **Step 3: 前端 Step 3 预览**

Edit `frontend/src/features/filing-management/create.tsx`, in Step 3 after selecting ports:

```tsx
<div className="mt-4 rounded border p-3 text-sm">
  <h4 className="font-medium mb-2">子端口号预览</h4>
  {selectedPorts.map((p) => (
    <div key={p.id} className="flex gap-4 text-muted-foreground">
      <span>主端口号: {p.main_port_number}</span>
      <span>子端口扩展码: {p.sub_port_number || '(自动生成)'}</span>
      <span>短信子端口号: {p.main_port_number}{p.sub_port_number || 'XXXXXX'}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 4: 端口列表"子端口号"列标签改为"子端口扩展码"**

Edit `frontend/src/features/port-info/index.tsx`, find the column definition for `sub_port_number` and change header:

```tsx
// Before:
{ accessorKey: 'sub_port_number', header: '子端口号' },

// After:
{ accessorKey: 'sub_port_number', header: '子端口扩展码' },
```

- [ ] **Step 5: 验证**

```bash
cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/export_field_registry.py backend/app/api/routes/filing_tasks.py
git add frontend/src/features/filing-management/create.tsx frontend/src/features/port-info/index.tsx
git commit -m "feat(sub-port): 短信子端口号命名与拼接逻辑

- 注册表新增 port_main_number/port_sub_extension/port_full_number
- generate_excel 输出三列：主端口号、子端口扩展码、短信子端口号
- 短信子端口号 = 主端口号 + 子端口扩展码 拼接
- 前端 Step 3 预览 + 端口列表标签更新"
```

---

### Task 7: P1-1 报备文件下载失败原因细化 + 重试支持

**Files:**
- Modify: `backend/app/api/routes/filing_tasks.py` (download endpoint + new regenerate)
- Modify: `frontend/src/features/filing-management/index.tsx` (handleDownload + regenerate button)

**Interfaces:**
- Consumes: nothing
- Produces: `POST /filing-tasks/{id}/regenerate`

- [ ] **Step 1: 后端下载端点细化错误类型**

Edit `backend/app/api/routes/filing_tasks.py`, the download endpoint:

```python
@router.get("/{id}/download")
def download_filing_task(*, session: SessionDep, id: uuid.UUID) -> Any:
    task = get_filing_task(session=session, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="报备任务不存在")
    if not task.file_path:
        raise HTTPException(
            status_code=404,
            detail={"reason": "文件尚未生成", "can_retry": True}
        )
    try:
        storage = get_storage()
        if not storage.exists(task.file_path):
            raise HTTPException(
                status_code=404,
                detail={"reason": "文件已过期或已被删除", "can_retry": True}
            )
        data = storage.download(task.file_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"reason": f"存储服务异常: {e}", "can_retry": True}
        )
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(task.task_name or 'export')}.xlsx"},
    )
```

- [ ] **Step 2: 新增重新生成端点**

```python
@router.post("/{id}/regenerate")
def regenerate_filing_task(*, session: SessionDep, id: uuid.UUID, current_user: CurrentUser, request: Request) -> Any:
    task = get_filing_task(session=session, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="报备任务不存在")

    # Re-run generate_excel with the same task parameters
    qualifications = session.exec(
        select(QualificationInfo).where(QualificationInfo.id.in_(task.qualification_ids))
    ).all()
    ports = session.exec(
        select(PortInfo).where(PortInfo.id.in_(task.port_ids))
    ).all()
    export_group = get_export_group(session=session, id=task.export_group_id)
    if not export_group:
        raise HTTPException(status_code=400, detail="导出字段组已被删除，无法重新生成")

    output = generate_excel(qualifications, ports, export_group, task.group_by_field, task.allocated_sub_ports)
    storage = get_storage()
    file_path = f"filing-exports/{task.id}.xlsx"
    storage.upload(file_path, output)

    task.file_path = file_path
    task.file_size = len(output)
    session.add(task)
    session.commit()

    log_operation(session, user=current_user, user_ip=request.client.host if request.client else "", module="filing_tasks", action="regenerate", target=task.task_name)
    return {"message": "文件已重新生成", "task_id": str(task.id)}
```

- [ ] **Step 3: 前端修复 handleDownload 闭包 bug**

Edit `frontend/src/features/filing-management/index.tsx`, line 115:

```tsx
// Before:
const columns = useMemo<ColumnDef<FilingTask>[]>(
  () => [ /* ... */ ],
  []  // <-- BUG: empty deps, tasks always empty at first render
)

// After:
const columns = useMemo<ColumnDef<FilingTask>[]>(
  () => [ /* ... */ ],
  [tasks]  // <-- FIX: include tasks in deps
)
```

- [ ] **Step 4: 前端下载失败展示具体原因 + 重新生成按钮**

Add state for regenerate:

```tsx
const [regenerating, setRegenerating] = useState<string | null>(null)

const handleRegenerate = async (id: string) => {
  setRegenerating(id)
  try {
    await import('@/lib/api/filing-tasks').then((m) => m.regenerateFilingTask(id))
    toast.success('文件已重新生成，可以下载了')
    queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })
  } catch {
    toast.error('重新生成失败')
  } finally {
    setRegenerating(null)
  }
}
```

Add API function in `frontend/src/lib/api/filing-tasks.ts`:

```typescript
export async function regenerateFilingTask(id: string): Promise<void> {
  await api.post(`/api/v1/filing-tasks/${id}/regenerate`)
}
```

Update `handleDownload`:

```tsx
const handleDownload = async (id: string) => {
  try {
    const task = tasks.find((t) => t.id === id)
    await downloadFilingTaskFile(id, `${task?.task_name || 'export'}.xlsx`)
  } catch (err: any) {
    const detail = err?.response?.data?.detail
    const reason = typeof detail === 'object' ? detail.reason : '文件下载失败'
    const canRetry = typeof detail === 'object' && detail.can_retry
    if (canRetry) {
      toast.error(`${reason}`, {
        action: { label: '重新生成', onClick: () => handleRegenerate(id) },
      })
    } else {
      toast.error(reason)
    }
  }
}
```

- [ ] **Step 5: 验证**

```bash
cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/filing_tasks.py
git add frontend/src/features/filing-management/index.tsx frontend/src/lib/api/filing-tasks.ts
git commit -m "fix(filing): 下载失败原因细化 + 重新生成支持

- 下载端点区分 404(不存在)/503(存储异常)/500 并返回 can_retry 标记
- 新增 POST /filing-tasks/{id}/regenerate 重新生成端点
- 前端修复 handleDownload 闭包陈旧 bug (columns memo deps)
- 下载失败 toast 展示具体原因 + 重新生成按钮"
```

---

### Task 8: P1-2 字段组批量导入/导出

**Files:**
- Modify: `backend/app/api/routes/export_groups.py` (export import endpoints)
- Modify: `frontend/src/features/export-groups/index.tsx` (import/export buttons)
- Modify: `frontend/src/lib/api/export-groups.ts` (new API functions)

**Interfaces:**
- Consumes: export field registry (existing)
- Produces: `GET /export-groups/{id}/export`, `POST /export-groups/import`, `GET /export-groups/registry/template`

- [ ] **Step 1: 字段组导出端点**

Add to `backend/app/api/routes/export_groups.py`:

```python
@router.get("/{id}/export")
def export_export_group(*, session: SessionDep, id: uuid.UUID) -> Any:
    group = get_export_group(session=session, id=id)
    if not group:
        raise HTTPException(status_code=404, detail="字段组不存在")

    wb = Workbook()
    ws = wb.active
    ws.title = "字段组"

    headers = ["字段组名称", "字段编码", "字段名称", "字段顺序", "是否启用"]
    for col, h in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=h)

    for i, field in enumerate(sorted(group.fields, key=lambda f: f.sort_order)):
        ws.cell(row=i + 2, column=1, value=group.name)
        ws.cell(row=i + 2, column=2, value=field.field_name)
        ws.cell(row=i + 2, column=3, value=field.field_label)
        ws.cell(row=i + 2, column=4, value=field.sort_order)
        ws.cell(row=i + 2, column=5, value="是")

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(f'{group.name}.xlsx')}"},
    )
```

- [ ] **Step 2: 字段组导入端点**

```python
@router.post("/import")
def import_export_group(*, session: SessionDep, file: UploadFile = File(...)) -> Any:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")
    content = file.file.read()
    try:
        wb = load_workbook(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="文件中没有数据")

    registry_map = {e["name"]: e for e in REGISTRY}
    errors: list[dict] = []

    group_name = str(rows[1][0]).strip() if rows[1][0] else ""
    if not group_name:
        raise HTTPException(status_code=400, detail="字段组名称不能为空")

    fields = []
    for row_idx, row in enumerate(rows[1:], start=2):
        field_code = str(row[1]).strip() if len(row) > 1 and row[1] else ""
        if not field_code:
            continue
        if field_code not in registry_map:
            errors.append({"row": row_idx, "field": "字段编码", "value": field_code, "reason": "字段编码不存在于注册表", "suggestion": "请下载字段编码对照表核对"})
            continue
        label = str(row[2]).strip() if len(row) > 2 and row[2] else registry_map[field_code]["label"]
        order = int(row[3]) if len(row) > 3 and row[3] else len(fields)
        fields.append({"field_name": field_code, "field_label": label, "sort_order": order})

    if errors:
        return {"success_count": 0, "error_count": len(errors), "errors": errors}

    if not fields:
        raise HTTPException(status_code=400, detail="文件中没有有效字段数据")

    group = ExportGroup(name=group_name)
    for f in fields:
        group.fields.append(ExportGroupField(field_name=f["field_name"], field_label=f["field_label"], sort_order=f["sort_order"]))
    session.add(group)
    session.commit()
    session.refresh(group)
    return {"success_count": 1, "group_name": group.name, "field_count": len(fields)}
```

- [ ] **Step 3: 字段注册表对照表模板下载**

```python
@router.get("/registry/template")
def download_registry_template() -> Any:
    wb = Workbook()
    ws = wb.active
    ws.title = "字段编码对照表"
    ws.cell(row=1, column=1, value="字段编码")
    ws.cell(row=1, column=2, value="字段名称")
    ws.cell(row=1, column=3, value="所属分组")
    for i, entry in enumerate(REGISTRY, 2):
        ws.cell(row=i, column=1, value=entry["name"])
        ws.cell(row=i, column=2, value=entry["label"])
        ws.cell(row=i, column=3, value=entry["group"])
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('字段编码对照表.xlsx')}"})
```

- [ ] **Step 4: 前端 API 新增函数**

Add to `frontend/src/lib/api/export-groups.ts`:

```typescript
export async function exportExportGroup(id: string): Promise<void> {
  const response = await api.get(`/api/v1/export-groups/${id}/export`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `字段组_${id}.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function importExportGroup(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/api/v1/export-groups/import', formData)
  return data
}

export async function downloadRegistryTemplate(): Promise<void> {
  const response = await api.get('/api/v1/export-groups/registry/template', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '字段编码对照表.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
}
```

- [ ] **Step 5: 前端卡片列表新增导入导出按钮**

Edit `frontend/src/features/export-groups/index.tsx`, add to the card actions:

```tsx
{/* In each card's dropdown menu or action area: */}
<Button variant="ghost" size="sm" onClick={() => handleExport(group.id)}>
  导出
</Button>

{/* In the page header: */}
<Button variant="outline" onClick={() => setImportOpen(true)}>
  导入字段组
</Button>
<Button variant="outline" onClick={() => downloadRegistryTemplate()}>
  下载字段编码表
</Button>
```

Add `ImportDialog` component for field group import (reuse existing shared component).

- [ ] **Step 6: 验证**

```bash
cd backend && uv run pytest -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes/export_groups.py
git add frontend/src/features/export-groups/index.tsx frontend/src/lib/api/export-groups.ts
git commit -m "feat(export-groups): 字段组批量导入/导出

- 新增 GET /{id}/export 导出端点 (xlsx)
- 新增 POST /import 批量导入端点
- 新增 GET /registry/template 字段编码对照表下载
- 前端卡片列表新增导入/导出/下载编码表按钮"
```

---

### Task 9: P1-3 Excel 内嵌图片提取完善

**Files:**
- Modify: `backend/app/services/excel_image_extractor.py` (row index fix + error logging)
- Modify: `backend/app/api/routes/qualifications.py` (image error reporting)
- Modify: `backend/app/api/routes/port_info.py` (image error reporting)

**Interfaces:**
- Consumes: P0-4 (row index fix already applied there)
- Produces: Image extraction returns `(images, errors)` tuple instead of just images

**Note:** The row index bug was already fixed in Task 4 (P0-4). This task adds image-specific error reporting.

- [ ] **Step 1: 图片提取返回结构化错误**

Edit `upload_import_images` in `backend/app/services/excel_image_extractor.py` to return per-image errors:

```python
def upload_import_images(
    images: list[ExtractedImage],
    objects: list,
    entity_type: str,
    session: Session,
) -> tuple[list[FileAttachment], list[str], list[dict]]:
    """Returns (attachments, warnings, image_errors).
    image_errors: [{row, column, reason}]
    """
    attachments: list[FileAttachment] = []
    warnings: list[str] = []
    image_errors: list[dict] = []

    ALLOWED_FORMATS = {"PNG", "JPEG", "JPG", "GIF", "BMP", "WEBP"}
    MAX_SIZE = 10 * 1024 * 1024  # 10MB

    for img in images:
        if img.row_index < 0 or img.row_index >= len(objects):
            image_errors.append({"row": img.row_index, "column": img.column_header or "未知", "reason": f"行索引 {img.row_index} 超出数据范围"})
            continue

        # Validate format
        try:
            from PIL import Image as PILImage
            pil_img = PILImage.open(io.BytesIO(img.image_data))
            if pil_img.format.upper() not in ALLOWED_FORMATS:
                image_errors.append({"row": img.row_index + 2, "column": img.column_header or "", "reason": f"不支持的图片格式: {pil_img.format}", "suggestion": f"支持的格式: {', '.join(ALLOWED_FORMATS)}"})
                continue
        except Exception:
            image_errors.append({"row": img.row_index + 2, "column": img.column_header or "", "reason": "图片文件损坏或无法解析"})
            continue

        # Validate size
        if len(img.image_data) > MAX_SIZE:
            size_mb = len(img.image_data) / (1024 * 1024)
            image_errors.append({"row": img.row_index + 2, "column": img.column_header or "", "reason": f"图片过大({size_mb:.1f}MB)", "suggestion": "请压缩到 10MB 以内"})
            continue

        # Upload to storage...
        obj = objects[img.row_index]
        # ... existing upload logic ...

    return attachments, warnings, image_errors
```

- [ ] **Step 2: 更新导入路由使用新的返回结构**

In both `qualifications.py` and `port_info.py` import endpoints, update the image extraction block to collect and return image errors alongside row validation errors:

```python
if all_images:
    _, img_warnings, img_errors = upload_import_images(...)
    warnings.extend(img_warnings)
    errors.extend(img_errors)  # NEW
```

- [ ] **Step 3: 验证**

```bash
cd backend && uv run pytest -x -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/excel_image_extractor.py backend/app/api/routes/qualifications.py backend/app/api/routes/port_info.py
git commit -m "fix(import): 图片提取错误定位 — 返回行号/列名/失败原因

- upload_import_images 返回结构化图片错误列表
- 校验图片格式(PNG/JPEG/GIF/BMP/WEBP)和大小(≤10MB)
- 损坏/过大/不支持的图片返回可定位错误信息"
```

---

### Task 10: P2-1 子端口生成规则持久化

**Files:**
- Create: `backend/app/models/sub_port_generation_rule.py`
- Create: `backend/app/crud/sub_port_generation_rule.py`
- Create: `backend/app/api/routes/sub_port_generation_rules.py`
- Create: `frontend/src/lib/api/sub-port-rules.ts`
- Modify: `frontend/src/features/filing-management/create.tsx` (load + save rules)

**Interfaces:**
- Consumes: P0-2 (AllocationMode enum)
- Produces: `SubPortGenerationRule` model + CRUD API

- [ ] **Step 1: 创建模型**

```python
# backend/app/models/sub_port_generation_rule.py
import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSON

from app.core.timezone import utcnow

class SubPortGenerationRuleBase(SQLModel):
    name: str = Field(max_length=200)
    mode: str = Field(max_length=20)  # random / sequential / fixed_suffix
    config: dict = Field(default={}, sa_column=Column(JSON))
    carrier: str | None = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)

class SubPortGenerationRule(SubPortGenerationRuleBase, table=True):
    __tablename__ = "sub_port_generation_rule"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

class SubPortGenerationRuleCreate(SubPortGenerationRuleBase):
    pass

class SubPortGenerationRuleUpdate(SQLModel):
    name: str | None = None
    mode: str | None = None
    config: dict | None = None
    carrier: str | None = None
    is_active: bool | None = None

class SubPortGenerationRulePublic(SubPortGenerationRuleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 2: 创建 CRUD + 路由**

```python
# backend/app/crud/sub_port_generation_rule.py
from sqlmodel import Session, select
from app.models.sub_port_generation_rule import SubPortGenerationRule, SubPortGenerationRuleCreate, SubPortGenerationRuleUpdate

def list_rules(session: Session, skip: int = 0, limit: int = 100):
    return session.exec(select(SubPortGenerationRule).offset(skip).limit(limit)).all(), len(session.exec(select(SubPortGenerationRule)).all())

def get_rule(session: Session, id):
    return session.get(SubPortGenerationRule, id)

def create_rule(session: Session, create: SubPortGenerationRuleCreate):
    rule = SubPortGenerationRule.from_orm(create)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule

def update_rule(session: Session, rule, update: SubPortGenerationRuleUpdate):
    for key, val in update.dict(exclude_unset=True).items():
        setattr(rule, key, val)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule

def delete_rule(session: Session, rule):
    session.delete(rule)
    session.commit()
```

```python
# backend/app/api/routes/sub_port_generation_rules.py
# Standard CRUD router at /sub-port-generation-rules
# GET list, GET {id}, POST create, PATCH {id}, DELETE {id}
# All superuser-only
```

- [ ] **Step 3: 注册路由和模型**

In `backend/app/api/main.py`, register the new router. In `backend/app/models/__init__.py`, export the new model.

- [ ] **Step 4: 生成迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "add sub_port_generation_rule table"
cd backend && uv run alembic upgrade head
```

- [ ] **Step 5: 前端 API + 规则选择**

Create `frontend/src/lib/api/sub-port-rules.ts`:

```typescript
import api from './api'
import type { SubPortGenerationRule } from './types'

export async function getSubPortRules(): Promise<SubPortGenerationRule[]> {
  const { data } = await api.get('/api/v1/sub-port-generation-rules')
  return data.data
}

export async function createSubPortRule(create: any): Promise<SubPortGenerationRule> {
  const { data } = await api.post('/api/v1/sub-port-generation-rules', create)
  return data
}

export async function deleteSubPortRule(id: string): Promise<void> {
  await api.delete(`/api/v1/sub-port-generation-rules/${id}`)
}
```

In Step 3 of `create.tsx`, add rules dropdown + save button:

```tsx
const { data: rules } = useQuery({ queryKey: ['sub-port-rules'], queryFn: getSubPortRules })

// In the mode section:
<Select value={selectedRuleId || ''} onValueChange={(id) => {
  const rule = rules?.find(r => r.id === id)
  if (rule) {
    setAllocationMode(rule.mode)
    if (rule.mode === 'fixed_suffix') setFixedSuffix(rule.config.suffix || '')
    else if (rule.config.range_start) {
      setRangeStart(rule.config.range_start)
      setRangeEnd(rule.config.range_end)
    }
  }
}}>
  <option value="">-- 选择已有规则 --</option>
  {rules?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
</Select>

<Button variant="outline" size="sm" onClick={() => setSaveRuleOpen(true)}>
  保存为规则
</Button>
```

- [ ] **Step 6: 验证**

```bash
cd backend && uv run pytest -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/sub_port_generation_rule.py backend/app/crud/sub_port_generation_rule.py backend/app/api/routes/sub_port_generation_rules.py backend/app/models/__init__.py backend/app/api/main.py backend/app/alembic/
git add frontend/src/lib/api/sub-port-rules.ts frontend/src/features/filing-management/create.tsx
git commit -m "feat(sub-port): 子端口生成规则持久化 — 保存/加载/管理

- 新增 sub_port_generation_rule 表 + CRUD API
- 报备创建时可选择已保存规则，也可保存当前配置为规则
- 规则支持按运营商、行业分类"
```

---

### Task 11: P2-2 导入体验增强

**Files:**
- Modify: `backend/app/api/routes/qualifications.py` (preview endpoint + versioned template)
- Modify: `backend/app/api/routes/port_info.py` (preview endpoint + versioned template)
- Modify: `frontend/src/components/shared/import-dialog.tsx` (preview button + warnings)

**Interfaces:**
- Consumes: P0-4 (import error structure)
- Produces: `POST /qualifications/import/preview`, `POST /port-info/import/preview`

- [ ] **Step 1: 模板下载文件名加入版本号**

Edit `backend/app/api/routes/qualifications.py`:

```python
# Before:
headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('资质导入模板.xlsx')}"},

# After:
headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('资质导入模板_v2.xlsx')}"},
```

Same for `backend/app/api/routes/port_info.py`:

```python
# Before:
headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('端口信息导入模板.xlsx')}"},

# After:
headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote('端口信息导入模板_v2.xlsx')}"},
```

- [ ] **Step 2: 新增导入预览端点**

Add to `qualifications.py` and `port_info.py`:

```python
@router.post("/import/preview")
def preview_qualifications_import(file: UploadFile = File(...)) -> Any:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")
    content = file.file.read()
    try:
        wb = load_workbook(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 1:
        raise HTTPException(status_code=400, detail="文件为空")

    header_row = [str(c) if c else "" for c in rows[0]]
    # ... same header_to_field mapping as import ...
    col_map = {}
    for col_idx, h in enumerate(header_row):
        if h in header_to_field:
            col_map[header_to_field[h]] = col_idx

    unrecognized = [h for h in header_row if h and h not in header_to_field and h not in ("", "None")]

    preview_rows = []
    for row_idx, row in enumerate(rows[1:6], start=2):  # first 5 data rows
        if all(c is None or str(c).strip() == "" for c in row):
            continue
        row_data = {}
        for field_name, col_idx in col_map.items():
            v = row[col_idx] if col_idx < len(row) else None
            row_data[field_name] = str(v).strip() if v is not None and str(v).strip() else None
        preview_rows.append(row_data)

    return {
        "headers": header_row,
        "rows": preview_rows,
        "unrecognized_headers": unrecognized,
        "total_data_rows": len([r for r in rows[1:] if not all(c is None or str(c).strip() == "" for c in r)]),
    }
```

Same pattern for `preview_port_info_import` in `backend/app/api/routes/port_info.py`, using its own `header_to_field` mapping.

- [ ] **Step 3: 导入时返回未识别表头 warning**

In the import endpoints, after building `col_map`, collect unmapped headers:

```python
unrecognized = [h for h in header_row if h and h not in header_to_field and h not in ("", "None")]
```

Include `unrecognized_headers` in the import response for the frontend to display.

- [ ] **Step 4: 前端 ImportDialog 新增预览按钮**

```tsx
const [previewData, setPreviewData] = useState<any>(null)

const handlePreview = async () => {
  if (!selectedFile) return
  const result = await import('@/lib/api/qualifications').then(m => m.previewQualificationsImport(selectedFile))
  setPreviewData(result)
}

// Show preview button before import:
<Button variant="outline" onClick={handlePreview} disabled={!selectedFile}>
  预览数据
</Button>

// Render preview table when available
```

- [ ] **Step 5: 验证**

```bash
cd backend && uv run pytest -x -q
cd frontend && pnpm run lint
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/qualifications.py backend/app/api/routes/port_info.py
git add frontend/src/components/shared/import-dialog.tsx
git commit -m "feat(import): 导入体验增强 — 版本号 + 预览 + 未识别表头警告

- 模板下载文件名加入 _v2 版本号
- 新增 POST /import/preview 端点返回前 5 行解析结果
- 导入返回 unrecognized_headers 警告列表
- 前端新增预览数据按钮 + 未识别表头 warning 提示"
```

---

## Execution Summary

| Task | Priority | Description | Est. | Dependencies |
|------|----------|-------------|------|-------------|
| 1 | P0-5 | 资质导入模板适配 + 法人选填 | 0.5d | none |
| 2 | P0-1 | 端口必填规则放宽 + 错误提示 | 1d | none |
| 3 | P0-6 | 基础电信企业ID | 0.5d | none |
| 4 | P0-4 | 导入失败定位与错误报告 | 1d | none |
| 5 | P0-2 | 子端口生成规则扩展 | 1d | none |
| 6 | P0-3 | 短信子端口号命名拼接 | 0.5d | Task 5 |
| 7 | P1-1 | 下载失败细化 + 重试 | 0.5d | none |
| 8 | P1-2 | 字段组批量导入导出 | 1d | none |
| 9 | P1-3 | 图片提取完善 | 0.5d | Task 4 |
| 10 | P2-1 | 子端口规则持久化 | 0.5d | Task 5 |
| 11 | P2-2 | 导入体验增强 | 0.5d | Task 4 |

**Total: 7 days, 11 tasks, ~47 steps**
