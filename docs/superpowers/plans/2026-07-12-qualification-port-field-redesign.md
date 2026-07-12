# 资质与端口字段重设计 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按最新业务需求全面调整 qualification_info 和 port_info 两个模型的字段结构，删除废弃字段、从端口迁移业务字段到资质、新增人员/业务/引流等字段。

**Architecture:** 后端分两个任务改两个模型（含 Schema/CRUD/导入模板），Alembic 自动生成迁移；前端按模型分任务更新类型、表单（折叠面板分组）、详情、列表、字段组列表。数据不迁移（开发环境）。

**Tech Stack:** FastAPI + SQLModel + Alembic (后端), React + TypeScript + ShadcnUI + react-hook-form + zod (前端)

## Global Constraints

- 数据不迁移，直接改模型（开发/测试环境）
- 表单按折叠面板分组：企业信息 / 法人信息 / 责任人信息 / 经办人信息 / 签名与模板 / 业务信息 / 引流信息 / 证件图片
- qualification_info 必填字段：enterprise_name、signature，其余非必填
- port_info 必填字段：carrier，其余非必填
- 图片字段继续走 file_attachment 表管理

## File Structure

| Layer | qualification_info | port_info |
|-------|-------------------|-----------|
| 后端模型 | `models/qualification_info.py` | `models/port_info.py` |
| 后端CRUD | `crud/qualification.py` | `crud/port_info.py` |
| 后端路由 | `api/routes/qualifications.py` | `api/routes/port_info.py` |
| 前端类型 | `lib/api/types.ts` | `lib/api/types.ts` |
| 前端表单 | `features/qualifications/components/qualification-dialog.tsx` | `features/port-info/components/port-info-dialog.tsx` |
| 前端详情 | `features/qualifications/components/qualification-detail-dialog.tsx` | — |
| 前端列表 | `features/qualifications/index.tsx` | `features/port-info/index.tsx` |
| 字段组 | `features/export-groups/components/export-group-dialog.tsx` | 同上 |
| 报备创建 | `features/filing-management/create.tsx` | — |

---

### Task 1: Backend — qualification_info 模型和 Schema 更新

**Files:**
- Modify: `backend/app/models/qualification_info.py`
- Modify: `backend/app/models/__init__.py` (如有导出变更)

**Interfaces:**
- Produces: 新 `QualificationInfoBase` 包含完整字段，删除 `submit_unit`、`carrier_enterprise_id`、`group_code`，新增法人/业务/引流等字段
- Produces: `QualificationInfoUpdate` 同步更新所有字段

- [ ] **Step 1: 重写 `QualificationInfoBase`**

在 `backend/app/models/qualification_info.py` 中将 `QualificationInfoBase` 替换为：

```python
class QualificationInfoBase(SQLModel):
    # 企业信息
    enterprise_name: str = Field(max_length=200, index=True)
    cert_type: str | None = Field(default=None, max_length=50)
    cert_number: str | None = Field(default=None, max_length=100, index=True)
    app_platform_name: str | None = Field(default=None, max_length=200)

    # 法人
    legal_representative_name: str | None = Field(default=None, max_length=100)

    # 责任人
    responsible_name: str | None = Field(default=None, max_length=100)
    responsible_cert_type: str | None = Field(default=None, max_length=50)
    responsible_cert_number: str | None = Field(default=None, max_length=100)
    responsible_address: str | None = Field(default=None, max_length=500)
    responsible_phone: str | None = Field(default=None, max_length=20)

    # 经办人
    handler_name: str | None = Field(default=None, max_length=100)
    handler_cert_type: str | None = Field(default=None, max_length=50)
    handler_cert_number: str | None = Field(default=None, max_length=100)
    handler_address: str | None = Field(default=None, max_length=500)
    handler_phone: str | None = Field(default=None, max_length=20)

    # 签名与模板
    sms_signature: str | None = Field(default=None, max_length=200)
    signature_type: str | None = Field(default=None, max_length=100)
    signature_verified: bool | None = Field(default=None)
    is_gateway_signature: bool | None = Field(default=None)
    sms_template_content: str | None = Field(default=None)
    template_has_variable: bool | None = Field(default=None)
    template_param_type: str | None = Field(default=None, max_length=100)
    template_param_length: str | None = Field(default=None, max_length=100)

    # 业务信息
    business_attribute: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50, index=True)
    business_subtype: str | None = Field(default=None, max_length=50)
    specific_usage: str | None = Field(default=None)

    # 引流信息
    diversion_number: str | None = Field(default=None, max_length=100)
    diversion_number_type: str | None = Field(default=None, max_length=50)
    diversion_number_usage: str | None = Field(default=None, max_length=200)
    diversion_content: str | None = Field(default=None)
    link_address: str | None = Field(default=None, max_length=500)
    link_type: str | None = Field(default=None, max_length=50)

    # 签名（必填）
    signature: str = Field(max_length=200, index=True)
```

删除原有的 `submit_unit`、`carrier_enterprise_id`、`group_code` 字段。

- [ ] **Step 2: 更新 `QualificationInfoUpdate`**

将所有新增字段添加到 `QualificationInfoUpdate`（均为可选），删除 `submit_unit`、`carrier_enterprise_id`、`group_code`：

```python
class QualificationInfoUpdate(SQLModel):
    enterprise_name: str | None = None
    cert_type: str | None = None
    cert_number: str | None = None
    app_platform_name: str | None = None
    legal_representative_name: str | None = None
    responsible_name: str | None = None
    responsible_cert_type: str | None = None
    responsible_cert_number: str | None = None
    responsible_address: str | None = None
    responsible_phone: str | None = None
    handler_name: str | None = None
    handler_cert_type: str | None = None
    handler_cert_number: str | None = None
    handler_address: str | None = None
    handler_phone: str | None = None
    sms_signature: str | None = None
    signature_type: str | None = None
    signature_verified: bool | None = None
    is_gateway_signature: bool | None = None
    sms_template_content: str | None = None
    template_has_variable: bool | None = None
    template_param_type: str | None = None
    template_param_length: str | None = None
    business_attribute: str | None = None
    business_type: str | None = None
    business_subtype: str | None = None
    specific_usage: str | None = None
    diversion_number: str | None = None
    diversion_number_type: str | None = None
    diversion_number_usage: str | None = None
    diversion_content: str | None = None
    link_address: str | None = None
    link_type: str | None = None
    signature: str | None = None
```

- [ ] **Step 3: 验证 Python 导入**

```bash
cd backend && uv run python -c "from app.models import QualificationInfo, QualificationInfoCreate, QualificationInfoUpdate; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: 提交**

```bash
git add backend/app/models/qualification_info.py
git commit -m "feat(qualifications): 重构 qualification_info 模型字段"
```

---

### Task 2: Backend — port_info 模型和 Schema 更新

**Files:**
- Modify: `backend/app/models/port_info.py`

**Interfaces:**
- Produces: 新 `PortInfoBase` 含精简端口字段，新增 `group_code`、`region`、`other_room_description`、`is_green_channel`、`blacklist_whitelist_type`、`audit_form`、`customer_type`

- [ ] **Step 1: 重写 `PortInfoBase`**

在 `backend/app/models/port_info.py` 中将 `PortInfoBase` 替换为：

```python
class PortInfoBase(SQLModel):
    carrier: str = Field(max_length=10, index=True)
    main_port_number: str | None = Field(default=None, max_length=100, index=True)
    sub_port_number: str | None = Field(default=None, max_length=100)
    port_range: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=50, index=True)
    city: str | None = Field(default=None, max_length=50)
    port_type: str | None = Field(default=None, max_length=50)
    port_activation_date: date | None = Field(default=None)
    allow_self_extension: bool | None = Field(default=None)
    carrier_room: str | None = Field(default=None)
    enterprise_room: str | None = Field(default=None)
    has_authorization: bool | None = Field(default=None)
    auth_start_date: date | None = Field(default=None)
    auth_end_date: date | None = Field(default=None)
    # 新增/迁移字段
    group_code: str | None = Field(default=None, max_length=100)
    region: str | None = Field(default=None, max_length=200)
    other_room_description: str | None = Field(default=None)
    is_green_channel: bool | None = Field(default=None)
    blacklist_whitelist_type: str | None = Field(default=None, max_length=50)
    audit_form: str | None = Field(default=None, max_length=500)
    customer_type: str | None = Field(default=None, max_length=50)
```

删除 `operation_type`及所有迁出到 qualification 的业务字段（`business_attribute`、`business_type`、`business_subtype`、`specific_usage`、`sms_signature`、`is_gateway_signature`、`sms_template_content`）。

- [ ] **Step 2: 更新 `PortInfoUpdate`**

同步删除迁出字段、新增新字段：

```python
class PortInfoUpdate(SQLModel):
    carrier: str | None = None
    main_port_number: str | None = None
    sub_port_number: str | None = None
    port_range: str | None = None
    province: str | None = None
    city: str | None = None
    port_type: str | None = None
    port_activation_date: date | None = None
    allow_self_extension: bool | None = None
    carrier_room: str | None = None
    enterprise_room: str | None = None
    has_authorization: bool | None = None
    auth_start_date: date | None = None
    auth_end_date: date | None = None
    group_code: str | None = None
    region: str | None = None
    other_room_description: str | None = None
    is_green_channel: bool | None = None
    blacklist_whitelist_type: str | None = None
    audit_form: str | None = None
    customer_type: str | None = None
```

- [ ] **Step 3: 验证 Python 导入**

```bash
cd backend && uv run python -c "from app.models import PortInfo, PortInfoCreate, PortInfoUpdate; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: 提交**

```bash
git add backend/app/models/port_info.py
git commit -m "feat(port-info): 重构 port_info 模型字段"
```

---

### Task 3: Backend — Alembic 迁移 + CRUD/路由适配

**Files:**
- Create: `backend/app/alembic/versions/xxxx_restructure_qualification_and_port.py`（自动生成）
- Modify: `backend/app/crud/qualification.py`（列表查询适配）
- Modify: `backend/app/crud/port_info.py`（列表查询适配）
- Modify: `backend/app/api/routes/port_info.py`（删除 business_type filter）
- Modify: `backend/app/api/routes/qualifications.py`（导入模板 header）

**Interfaces:**
- Consumes: Task 1 (`QualificationInfoBase`), Task 2 (`PortInfoBase`)

- [ ] **Step 1: 生成 Alembic 迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "restructure_qualification_and_port_fields"
```

- [ ] **Step 2: 检查并调整迁移文件**

打开生成的迁移文件，确认：
- qualification_info 删除了 `submit_unit`、`carrier_enterprise_id`、`group_code` 列
- qualification_info 新增了所有新列
- port_info 删除了 `operation_type` 和所有业务列
- port_info 新增了 `group_code`、`region` 等列

手动调整任何 Alembic 无法自动检测的变更（如列改名需要手动写 `alter_column`）。

- [ ] **Step 3: 运行迁移**

```bash
cd backend && uv run alembic upgrade head
```

Expected: 迁移成功执行，无报错

- [ ] **Step 4: 更新 qualification CRUD 列表查询**

在 `backend/app/crud/qualification.py` 的 `list_qualifications` 中，删除 `business_type` 过滤参数没有影响（因为 qualification 本来就没有 business_type filter）。保持现有的 `enterprise_name`、`cert_number`、`signature` 过滤不变。

- [ ] **Step 5: 更新 port_info CRUD 列表查询**

在 `backend/app/crud/port_info.py` 的 `list_port_infos` 中，删除 `business_type` 参数和对应的 filter 条件：

```python
def list_port_infos(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 20,
    carrier: str | None = None,
    province: str | None = None,
) -> tuple[list[PortInfo], int]:
    query = select(PortInfo)
    if carrier:
        query = query.where(PortInfo.carrier == carrier)
    if province:
        query = query.where(PortInfo.province == province)
    count = session.exec(select(func.count()).select_from(query.subquery())).one()
    results = session.exec(
        query.order_by(PortInfo.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return list(results), count
```

- [ ] **Step 6: 更新 port_info 路由的查询参数**

在 `backend/app/api/routes/port_info.py` 的 `read_port_infos` 中删除 `business_type` 参数。

- [ ] **Step 7: 验证后端启动和端点**

```bash
cd backend && timeout 5 fastapi dev app/main.py 2>&1 | head -5 || true
```

Expected: 应用启动无 import 错误

- [ ] **Step 8: 提交**

```bash
git add backend/app/alembic/versions/ backend/app/crud/qualification.py backend/app/crud/port_info.py backend/app/api/routes/port_info.py
git commit -m "feat: Alembic 迁移 + CRUD/路由适配资质端口字段重构"
```

---

### Task 4: Backend — 导入模板 header 更新

**Files:**
- Modify: `backend/app/api/routes/qualifications.py`（模板 header + 导入解析映射）
- Modify: `backend/app/api/routes/port_info.py`（模板 header + 导入解析映射）

**Interfaces:**
- Consumes: Task 1 (`QualificationInfoBase`), Task 2 (`PortInfoBase`)

- [ ] **Step 1: 更新 qualification 导入模板 header**

在 `backend/app/api/routes/qualifications.py` 中，将 `_QUALIFICATION_HEADERS` 替换为新字段列表：

```python
_QUALIFICATION_HEADERS = [
    "企业名称",
    "单位证件类型",
    "单位证件号码",
    "APP/平台名称",
    "法人姓名",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人证件地址",
    "责任人手机号",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人证件地址",
    "经办人手机号",
    "短信签名",
    "签名类型/来源",
    "是否签名校验",
    "是否网关签名",
    "短信模板内容",
    "模板是否包含变量",
    "模板参数类型",
    "模板参数长度",
    "业务属性",
    "业务类型",
    "业务细类",
    "具体用途",
    "引流号码",
    "引流号码类型",
    "引流号码用途",
    "引流内容",
    "链接地址",
    "链接类型",
    "签名",
    "单位证件图片",
    "责任人身份证正面",
    "责任人身份证反面",
    "经办人身份证正面",
    "经办人身份证反面",
    "签名举证附件",
    "经办人现场照片",
    "引流举证附件",
]
```

- [ ] **Step 2: 更新 qualification 导入解析的 header_to_field 映射**

```python
header_to_field = {
    "企业名称": "enterprise_name",
    "单位证件类型": "cert_type",
    "单位证件号码": "cert_number",
    "APP/平台名称": "app_platform_name",
    "法人姓名": "legal_representative_name",
    "责任人姓名": "responsible_name",
    "责任人证件类型": "responsible_cert_type",
    "责任人证件号码": "responsible_cert_number",
    "责任人证件地址": "responsible_address",
    "责任人手机号": "responsible_phone",
    "经办人姓名": "handler_name",
    "经办人证件类型": "handler_cert_type",
    "经办人证件号码": "handler_cert_number",
    "经办人证件地址": "handler_address",
    "经办人手机号": "handler_phone",
    "短信签名": "sms_signature",
    "签名类型/来源": "signature_type",
    "是否签名校验": "signature_verified",
    "是否网关签名": "is_gateway_signature",
    "短信模板内容": "sms_template_content",
    "模板是否包含变量": "template_has_variable",
    "模板参数类型": "template_param_type",
    "模板参数长度": "template_param_length",
    "业务属性": "business_attribute",
    "业务类型": "business_type",
    "业务细类": "business_subtype",
    "具体用途": "specific_usage",
    "引流号码": "diversion_number",
    "引流号码类型": "diversion_number_type",
    "引流号码用途": "diversion_number_usage",
    "引流内容": "diversion_content",
    "链接地址": "link_address",
    "链接类型": "link_type",
    "签名": "signature",
}
```

- [ ] **Step 3: 更新 port_info 导入模板 header**

在 `backend/app/api/routes/port_info.py` 中将 `_PORT_HEADERS` 替换为：

```python
_PORT_HEADERS = [
    "运营商",
    "主端口号",
    "子端口号",
    "码号使用范围",
    "接入省",
    "接入地市",
    "端口类型",
    "端口入网时间",
    "是否允许自行扩展",
    "运营商接入机房及设备",
    "企业接入机房及设备",
    "是否具有授权书",
    "授权开始日期",
    "授权结束日期",
    "集团编码",
    "所属地区",
    "其他接入机房说明",
    "是否绿色通道",
    "黑白名单类型",
    "端口审核表",
    "客户类型",
    "授权书图片",
]
```

- [ ] **Step 4: 更新 port_info 导入解析的 header_to_field 映射**

```python
header_to_field = {
    "运营商": "carrier",
    "主端口号": "main_port_number",
    "子端口号": "sub_port_number",
    "码号使用范围": "port_range",
    "接入省": "province",
    "接入地市": "city",
    "端口类型": "port_type",
    "端口入网时间": "port_activation_date",
    "是否允许自行扩展": "allow_self_extension",
    "运营商接入机房及设备": "carrier_room",
    "企业接入机房及设备": "enterprise_room",
    "是否具有授权书": "has_authorization",
    "授权开始日期": "auth_start_date",
    "授权结束日期": "auth_end_date",
    "集团编码": "group_code",
    "所属地区": "region",
    "其他接入机房说明": "other_room_description",
    "是否绿色通道": "is_green_channel",
    "黑白名单类型": "blacklist_whitelist_type",
    "端口审核表": "audit_form",
    "客户类型": "customer_type",
}
```

- [ ] **Step 5: 验证模板下载工作**

```bash
# 启动后端，用 curl 验证模板下载
cd backend && fastapi dev app/main.py &
sleep 3

# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@sms-filing.example.com&password=changethis" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 下载资质模板
curl -s -o /tmp/qual_template.xlsx -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/qualifications/template
# Expected: 200

# 下载端口模板
curl -s -o /tmp/port_template.xlsx -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/port-info/template
# Expected: 200
```

- [ ] **Step 6: 提交**

```bash
git add backend/app/api/routes/qualifications.py backend/app/api/routes/port_info.py
git commit -m "feat: 更新资质和端口导入模板 header 及解析映射"
```

---

### Task 5: Frontend — TypeScript 类型更新

**Files:**
- Modify: `frontend/src/lib/api/types.ts`

- [ ] **Step 1: 更新 `QualificationInfo` 接口**

在 `frontend/src/lib/api/types.ts` 中将 `QualificationInfo` 替换为：

```typescript
export interface QualificationInfo {
  id: string
  // 企业信息
  enterprise_name: string
  cert_type: string | null
  cert_number: string | null
  app_platform_name: string | null
  // 法人
  legal_representative_name: string | null
  // 责任人
  responsible_name: string | null
  responsible_cert_type: string | null
  responsible_cert_number: string | null
  responsible_address: string | null
  responsible_phone: string | null
  // 经办人
  handler_name: string | null
  handler_cert_type: string | null
  handler_cert_number: string | null
  handler_address: string | null
  handler_phone: string | null
  // 签名与模板
  sms_signature: string | null
  signature_type: string | null
  signature_verified: boolean | null
  is_gateway_signature: boolean | null
  sms_template_content: string | null
  template_has_variable: boolean | null
  template_param_type: string | null
  template_param_length: string | null
  // 业务信息
  business_attribute: string | null
  business_type: string | null
  business_subtype: string | null
  specific_usage: string | null
  // 引流信息
  diversion_number: string | null
  diversion_number_type: string | null
  diversion_number_usage: string | null
  diversion_content: string | null
  link_address: string | null
  link_type: string | null
  // 签名
  signature: string
  created_at: string
  updated_at: string
}
```

删除 `submit_unit`、`carrier_enterprise_id`、`group_code`。

- [ ] **Step 2: 更新 `PortInfo` 接口**

在 `PortInfo` 接口中删除 `operation_type` 和所有业务字段，新增端口新字段：

```typescript
export interface PortInfo {
  id: string
  carrier: string
  main_port_number: string | null
  sub_port_number: string | null
  port_range: string | null
  province: string | null
  city: string | null
  port_type: string | null
  port_activation_date: string | null
  allow_self_extension: boolean | null
  carrier_room: string | null
  enterprise_room: string | null
  has_authorization: boolean | null
  auth_start_date: string | null
  auth_end_date: string | null
  group_code: string | null
  region: string | null
  other_room_description: string | null
  is_green_channel: boolean | null
  blacklist_whitelist_type: string | null
  audit_form: string | null
  customer_type: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 会有类型错误（因为其他文件引用了已删除的字段），这是预期行为，后续任务会修复。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/lib/api/types.ts
git commit -m "feat(frontend): 更新 QualificationInfo 和 PortInfo 类型定义"
```

---

### Task 6: Frontend — 资质表单重组（折叠面板）

**Files:**
- Modify: `frontend/src/features/qualifications/components/qualification-dialog.tsx`

- [ ] **Step 1: 更新 zod schema 和 IMAGE_FIELDS**

imageFields 新增签名举证附件、经办人现场照片、引流举证附件，同时删除 group_code、submit_unit、carrier_enterprise_id。

关键变更：新增折叠面板组件（使用 ShadcnUI Collapsible），每个面板一个信息类别。

由于代码量很大（表单从 ~500 行增长到 ~800+ 行），实现时遵循：
1. zod schema 所有字段（除 enterprise_name、signature 必填外，其余 optional）
2. IMAGE_FIELDS 数组扩展：
```typescript
const IMAGE_FIELDS = [
  { name: 'cert_image', label: '单位证件图片' },
  { name: 'responsible_id_front', label: '责任人身份证正面' },
  { name: 'responsible_id_back', label: '责任人身份证反面' },
  { name: 'handler_id_front', label: '经办人身份证正面' },
  { name: 'handler_id_back', label: '经办人身份证反面' },
  { name: 'signature_proof_image', label: '签名举证附件' },
  { name: 'handler_photo', label: '经办人现场照片' },
  { name: 'diversion_proof_image', label: '引流举证附件' },
]
```
3. 表单结构为 7 个折叠面板 + 1 个图片面板（同 spec 第三部分）
4. defaultValues 同步更新所有新字段

- [ ] **Step 2: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无新增错误（本文件）

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/qualifications/components/qualification-dialog.tsx
git commit -m "feat(frontend): 资质表单重组为折叠面板分组"
```

---

### Task 7: Frontend — 资质详情 + 列表 + 报备创建适配

**Files:**
- Modify: `frontend/src/features/qualifications/components/qualification-detail-dialog.tsx`
- Modify: `frontend/src/features/qualifications/index.tsx`
- Modify: `frontend/src/features/filing-management/create.tsx`

- [ ] **Step 1: 更新资质详情弹窗**

在 `qualification-detail-dialog.tsx` 中：
1. 删除 `submit_unit`、`carrier_enterprise_id`、`group_code` 行
2. 新增「法人信息」分组（`legal_representative_name`）
3. 责任人分组新增 `responsible_address`
4. 经办人分组新增 `handler_address`
5. 新增「签名与模板」分组（sms_signature、signature_type 等）
6. 新增「业务信息」分组（business_attribute 等）
7. 新增「引流信息」分组（diversion_number 等）
8. imageFields 数组扩展（同 Task 6 的 IMAGE_FIELDS）

- [ ] **Step 2: 更新资质列表表格列**

在 `qualifications/index.tsx` 中：
1. 表格列调整为：企业名称、法人、责任人、签名、业务类型、创建时间、操作
2. 删除 `submit_unit`、`cert_number`、`handler_name`、`app_platform_name` 列
3. 搜索 Filter 保持签名 → 企业名称 → 证件号顺序（已在之前任务调整过）

- [ ] **Step 3: 更新报备创建 Step 1 表格列**

在 `create.tsx` 的 `qualificationColumns` 中：
1. 删除 `cert_type`、`cert_number`、`responsible_name`、`app_platform_name` 列
2. 新增 `legal_representative_name`（法人）、`signature`（签名）、`handler_name`（经办人）列

- [ ] **Step 4: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/features/qualifications/components/qualification-detail-dialog.tsx \
        frontend/src/features/qualifications/index.tsx \
        frontend/src/features/filing-management/create.tsx
git commit -m "feat(frontend): 资质详情/列表/报备创建适配新字段"
```

---

### Task 8: Frontend — 端口管理页面适配

**Files:**
- Modify: `frontend/src/features/port-info/components/port-info-dialog.tsx`
- Modify: `frontend/src/features/port-info/index.tsx`
- Modify: `frontend/src/lib/api/port-info.ts`（删除 business_type 查询参数）

- [ ] **Step 1: 更新端口表单**

在 `port-info-dialog.tsx` 中：
1. 删除「业务信息」section（整个 grid + 四个字段）
2. 删除 `operation_type` 字段
3. 删除「签名与模板」section（sms_signature、is_gateway_signature、sms_template_content）
4. 新增字段：`group_code`（集团编码）、`region`（所属地区）、`other_room_description`（其他接入机房说明）、`is_green_channel`（是否绿色通道）、`blacklist_whitelist_type`（黑白名单类型）、`audit_form`（端口审核表）、`customer_type`（客户类型）

- [ ] **Step 2: 更新端口列表**

在 `port-info/index.tsx` 中：
1. 列调整：删除 `business_type`、`sms_signature` 列，新增 `region`（所属地区）、`customer_type`（客户类型）
2. 搜索 Filter：删除 `business_type` 输入框

- [ ] **Step 3: 更新端口 API 调用**

在 `port-info.ts` 的 `getPortInfos` 参数和类型中删除 `business_type`。

- [ ] **Step 4: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/features/port-info/components/port-info-dialog.tsx \
        frontend/src/features/port-info/index.tsx \
        frontend/src/lib/api/port-info.ts
git commit -m "feat(frontend): 端口管理页面适配新字段"
```

---

### Task 9: Frontend — 导出字段组列表更新

**Files:**
- Modify: `frontend/src/features/export-groups/components/export-group-dialog.tsx`

- [ ] **Step 1: 更新 AVAILABLE_FIELDS**

将 `AVAILABLE_FIELDS` 数组按新字段结构重组。具体字段列表：

```typescript
const AVAILABLE_FIELDS = [
  // 端口信息
  { key: 'carrier', label: '运营商' },
  { key: 'main_port_number', label: '主端口号' },
  { key: 'sub_port_number', label: '子端口号' },
  { key: 'port_range', label: '码号使用范围' },
  { key: 'province', label: '接入省' },
  { key: 'city', label: '接入地市' },
  { key: 'port_type', label: '端口类型' },
  { key: 'port_activation_date', label: '端口入网时间' },
  { key: 'allow_self_extension', label: '是否允许自行扩展' },
  { key: 'carrier_room', label: '运营商接入机房及设备' },
  { key: 'enterprise_room', label: '企业接入机房及设备' },
  { key: 'has_authorization', label: '是否具有授权书' },
  { key: 'auth_start_date', label: '授权开始日期' },
  { key: 'auth_end_date', label: '授权结束日期' },
  { key: 'group_code', label: '集团编码' },
  { key: 'region', label: '所属地区' },
  { key: 'other_room_description', label: '其他接入机房说明' },
  { key: 'is_green_channel', label: '是否绿色通道' },
  { key: 'blacklist_whitelist_type', label: '黑白名单类型' },
  { key: 'audit_form', label: '端口审核表' },
  { key: 'customer_type', label: '客户类型' },
  // 资质信息
  { key: 'enterprise_name', label: '企业名称' },
  { key: 'cert_type', label: '单位证件类型' },
  { key: 'cert_number', label: '单位证件号码' },
  { key: 'app_platform_name', label: 'APP/平台名称' },
  { key: 'legal_representative_name', label: '法人姓名' },
  { key: 'responsible_name', label: '责任人姓名' },
  { key: 'responsible_cert_type', label: '责任人证件类型' },
  { key: 'responsible_cert_number', label: '责任人证件号码' },
  { key: 'responsible_address', label: '责任人证件地址' },
  { key: 'responsible_phone', label: '责任人手机号' },
  { key: 'handler_name', label: '经办人姓名' },
  { key: 'handler_cert_type', label: '经办人证件类型' },
  { key: 'handler_cert_number', label: '经办人证件号码' },
  { key: 'handler_address', label: '经办人证件地址' },
  { key: 'handler_phone', label: '经办人手机号' },
  { key: 'sms_signature', label: '短信签名' },
  { key: 'signature_type', label: '签名类型/来源' },
  { key: 'signature_verified', label: '是否签名校验' },
  { key: 'is_gateway_signature', label: '是否网关签名' },
  { key: 'sms_template_content', label: '短信模板内容' },
  { key: 'template_has_variable', label: '模板是否包含变量' },
  { key: 'template_param_type', label: '模板参数类型' },
  { key: 'template_param_length', label: '模板参数长度' },
  { key: 'business_attribute', label: '业务属性' },
  { key: 'business_type', label: '业务类型' },
  { key: 'business_subtype', label: '业务细类' },
  { key: 'specific_usage', label: '具体用途' },
  { key: 'diversion_number', label: '引流号码' },
  { key: 'diversion_number_type', label: '引流号码类型' },
  { key: 'diversion_number_usage', label: '引流号码用途' },
  { key: 'diversion_content', label: '引流内容' },
  { key: 'link_address', label: '链接地址' },
  { key: 'link_type', label: '链接类型' },
]
```

删除 `operation_type`、`submit_unit`、`carrier_enterprise_id`。

- [ ] **Step 2: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/export-groups/components/export-group-dialog.tsx
git commit -m "feat(frontend): 导出字段组列表更新为新字段结构"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 启动服务**

```bash
cd backend && fastapi dev app/main.py &
cd frontend && pnpm run dev &
```

- [ ] **Step 2: 手动验证清单**

1. 资质管理页：列表正常加载，签名搜索框在第一位
2. 资质新建：折叠面板正常展开/收起，所有新字段可填写
3. 资质编辑：已有数据正确回填
4. 资质详情：所有分组正确显示字段值
5. 资质导入：下载模板包含新 header，导入新模板成功
6. 端口管理页：列表正常，新列显示正常
7. 端口新建/编辑：表单字段正确，废弃字段已移除
8. 端口导入：下载模板 header 正确
9. 导出字段组：可选字段列表完整，拖拽排序正常
10. 报备创建 Step 1：资质表格列正确，签名导入功能正常

- [ ] **Step 3: 完成**
