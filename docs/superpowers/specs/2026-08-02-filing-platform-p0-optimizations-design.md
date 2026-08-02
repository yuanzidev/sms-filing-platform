# 报备平台 P0 优化与修复设计

- 文档日期：2026-08-02
- 来源问题汇总：`docs/报备平台用户问题与优化方向汇总.md`
- 范围：本轮仅覆盖文档"P0 优先级"项（必填梳理、导出字段一致性、子端口范围随机生成）。P1 / P2 在本轮完成后另起 spec。
- 当前分支：`main`（按项目约定，新功能在 main 上开发）

---

## 一、目标

按用户反馈文档优先级，本轮完成 3 个 P0 子项，并配套验收清单：

1. **必填字段梳理**：把"难以提前获取 / 仅用于导出模板 / 变量字段"从必填改为选填，移除导入校验。
2. **导出字段一致性**：建立后端唯一字段元数据字典，前后端共用 source of truth，根治"字段组勾选了但导出缺列"。
3. **子端口范围随机生成**：新建报备支持输入子端口范围，按"资质 × 主端口笛卡尔积"数量在范围内随机分配，同一主端口下永久不重复。

不在本轮范围（P1/P2，下一轮再做）：

- 短信签名不自动补 `【】`
- 主端口 `enterprise_name` → "主端口备案公司" 改名
- 主端口表加默认子端口范围字段
- 端口信息管理 / 报备管理 搜索筛选增强
- 字段组编辑字段搜索（虽然 B 项重构后会顺手实现）
- 图片导出格式调整（链接 / 压缩包 / 内嵌等）
- 报备任务名称自定义/编辑

---

## 二、子项 A：必填字段梳理

### A.1 模型改动

`backend/app/models/qualification_info.py`：

```python
# 当前（必填）
legal_representative_cert_type: str = Field(max_length=50)
legal_representative_cert_number: str = Field(max_length=100)
legal_representative_cert_address: str = Field(max_length=500)

# 改为（选填）
legal_representative_cert_type: str | None = Field(default=None, max_length=50)
legal_representative_cert_number: str | None = Field(default=None, max_length=100)
legal_representative_cert_address: str | None = Field(default=None, max_length=500)
```

`backend/app/models/port_info.py`：

```python
# 当前（必填）
operation_type: str = Field(max_length=100)
group_code: str = Field(max_length=100)

# 改为（选填）
operation_type: str | None = Field(default=None, max_length=100)
group_code: str | None = Field(default=None, max_length=100)
```

### A.2 Alembic 迁移

文件名：`app/alembic/versions/<rev>_make_legal_and_port_fields_nullable.py`

操作：

```python
def upgrade():
    op.alter_column('qualification_info', 'legal_representative_cert_type',
                    nullable=True)
    op.alter_column('qualification_info', 'legal_representative_cert_number',
                    nullable=True)
    op.alter_column('qualification_info', 'legal_representative_cert_address',
                    nullable=True)
    op.alter_column('port_info', 'operation_type', nullable=True)
    op.alter_column('port_info', 'group_code', nullable=True)

def downgrade():
    # 回滚前需保证无 NULL 值
    op.alter_column('port_info', 'group_code', nullable=False)
    op.alter_column('port_info', 'operation_type', nullable=False)
    op.alter_column('qualification_info', 'legal_representative_cert_address',
                    nullable=False)
    op.alter_column('qualification_info', 'legal_representative_cert_number',
                    nullable=False)
    op.alter_column('qualification_info', 'legal_representative_cert_type',
                    nullable=False)
```

存量数据无需回填（NOT NULL → nullable 不影响存量）。

### A.3 导入路由硬校验删除

`backend/app/api/routes/qualifications.py`（位于 import_qualifications 内）：

删除以下 3 段：

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

`backend/app/api/routes/port_info.py`（位于 import_port_infos 内）：

删除 operation_type 与 group_code 的硬校验段。从 `required_fields` 列表里移除 `operation_type`、`group_code`。

保留：`carrier`、`main_port_number`、`enterprise_name`、`port_type`、`carrier_room`、`enterprise_room`、`authorization_letter` 的校验。

### A.4 前端表单去除必填

`frontend/src/features/qualifications/components/qualification-dialog.tsx`：

- 找到 `legal_representative_cert_type` / `legal_representative_cert_number` / `legal_representative_cert_address` 三个 FormItem
- 去掉 label 中的 `*` 必填星号
- 在对应 zod schema 中删除 `.min(1, ...)` 约束

`frontend/src/features/port-info/components/port-info-dialog.tsx`：

- 对 `operation_type` / `group_code` 做同样处理

### A.5 模板填写说明同步

`backend/app/api/routes/qualifications.py::download_qualification_template`：

在"填写说明"sheet 的 notes 列表追加：

- `"8. 法人证件类型/号码/地址：选填；运营商报备强依赖时再填"`

`backend/app/api/routes/port_info.py::download_port_info_template`：

追加：

- `"8. 操作类型、集团编码：选填"`

### A.6 测试

新增 `backend/app/tests/api/routes/test_qualifications_import.py`（如已存在则补充 case）：

```python
def test_import_qualifications_with_empty_legal_fields():
    """法人 3 字段全空可导入"""
    # 构造 Excel：仅企业名称 + 短信签名
    # POST /qualifications/import
    # 断言 200, count == 1, 法人 3 字段为 None
```

新增 `backend/app/tests/api/routes/test_port_info_import.py`：

```python
def test_import_port_info_with_empty_operation_and_group():
    """操作类型/集团编码空可导入"""
    # 构造 Excel：仅必填字段
    # POST /port-info/import
    # 断言 200, count == 1, operation_type/group_code 为 None
```

---

## 三、子项 B：导出字段字典 + 一致性修复

### B.1 新增字段元数据字典

新文件：`backend/app/services/export_field_registry.py`

```python
from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class ExportField:
    name: str            # 逻辑字段名，如 sms_signature
    label: str           # 中文列头，如 "短信签名"
    source: str          # "qualification" | "port" | "image_qualification" | "image_port"
    group: str           # 用于前端分组展示
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

### B.2 重构 `filing_tasks.py` 导出逻辑

`backend/app/api/routes/filing_tasks.py`：

- 删除 `build_field_map()` 硬编码字典，改为 `from app.services.export_field_registry import field_map, field_source`
- 重写 `get_field_value()`：

```python
def get_field_value(qualification, port, field_name, allocated_sub_port: str | None = None) -> str:
    source = field_source(field_name)
    if source is None:
        return ""
    if field_name == "sub_port_number" and allocated_sub_port is not None:
        return allocated_sub_port
    if source == "port":
        value = getattr(port, field_name, "")
    elif source == "qualification":
        value = getattr(qualification, field_name, "")
    elif source in ("image_qualification", "image_port"):
        return "[图片]"
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

- `generate_excel()` 增加 `allocated_sub_ports: dict[tuple[uuid.UUID, str], str] | None` 参数；写 `sub_port_number` 列时按 `(qual_id, main_port_number)` 查分配号码。
- `filing_tasks.py:162` 的过滤逻辑保留 `if f.field_name in field_map`，但 field_map 现在是 registry 推导，所有 registry 字段都能匹配。

### B.3 新增 `/export-fields/registry` API

`backend/app/api/routes/export_groups.py` 增加：

```python
@router.get("/registry", response_model=list[dict])
def read_field_registry() -> Any:
    from app.services.export_field_registry import all_fields
    from dataclasses import asdict
    return [{**asdict(f), "id": f.name} for f in all_fields()]
```

路由前缀仍是 `/export-groups`，路径 `/api/v1/export-fields/registry` 也可——选择跟现有命名一致：`/api/v1/export-groups/registry`。

### B.4 前端 `export-group-dialog.tsx` 重构

`frontend/src/features/export-groups/components/export-group-dialog.tsx`：

- 删除硬编码的 `AVAILABLE_FIELDS` 列表（约 65 项）
- `useQuery({ queryKey: ['export-field-registry'], queryFn: getExportFieldRegistry })`
- 按 `group` 分组渲染（用 `<optgroup>` 或多个区块）
- 顶部加 `<Input>` 搜索框，本地按 label/name 过滤（顺手完成 P2 问题 9）
- 修复 `enterprise_name` 重复定义问题（直接消失，因为不再硬编码）

新增 `frontend/src/lib/api/export-fields.ts`：

```ts
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

### B.5 回归测试

新增 `backend/app/tests/api/routes/test_filing_tasks_export.py`：

```python
def test_export_includes_all_selected_fields():
    """勾选所有 registry 字段 → Excel 必出对应列"""
    # 1. 创建资质、端口
    # 2. 创建字段组，fields = 全部 registry
    # 3. POST /filing-tasks 创建报备任务
    # 4. GET /filing-tasks/{id}/download 下载 Excel
    # 5. openpyxl.load_workbook 解析首行表头
    # 6. 断言表头集合 == {f.label for f in REGISTRY}


def test_export_signature_type_column_present():
    """用户问题 10 回归：signature_type 列存在"""
    # 字段组仅勾选 signature_type
    # 断言 Excel 表头包含 "签名类型/来源"


def test_export_specific_usage_column_present():
    """用户问题 10 回归：specific_usage 列存在"""
```

---

## 四、子项 C：子端口范围随机生成

### C.1 新模型 `filing_sub_port_usage`

新文件：`backend/app/models/filing_sub_port_usage.py`

```python
"""Filing sub port usage — permanently reserves generated sub port numbers per main port."""
import uuid
from datetime import datetime
from sqlalchemy import UniqueConstraint
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
        foreign_key="filing_task.id",
        sa_column_kwargs={"ondelete": "SET NULL"},
    )
    qualification_id: uuid.UUID | None = Field(
        default=None, foreign_key="qualification_info.id"
    )
    generated_at: datetime = Field(default_factory=utcnow)
    operator_id: uuid.UUID = Field(foreign_key="user.id")
```

`backend/app/models/__init__.py` 增加 `FilingSubPortUsage` 导出。

### C.2 Alembic 迁移

文件名：`app/alembic/versions/<rev>_create_filing_sub_port_usage.py`

```python
def upgrade():
    op.create_table(
        "filing_sub_port_usage",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("main_port_number", sa.String(100), nullable=False, index=True),
        sa.Column("port_number", sa.String(100), nullable=False, index=True),
        sa.Column("carrier", sa.String(10), nullable=True),
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

def downgrade():
    op.drop_table("filing_sub_port_usage")
```

可与 A.2 迁移合并为同一份迁移文件。

### C.3 CRUD 层

新文件：`backend/app/crud/filing_sub_port_usage.py`

```python
from sqlmodel import select, func
from app.models import FilingSubPortUsage


def get_used_numbers(session, main_port_number: str) -> set[str]:
    stmt = select(FilingSubPortUsage.port_number).where(
        FilingSubPortUsage.main_port_number == main_port_number
    )
    return set(session.exec(stmt).all())


def count_used_in_range(session, main_port_number: str,
                        range_start: int, range_end: int) -> int:
    stmt = select(func.count()).select_from(FilingSubPortUsage).where(
        FilingSubPortUsage.main_port_number == main_port_number,
        FilingSubPortUsage.port_number >= str(range_start).zfill(len(str(range_end))),
        FilingSubPortUsage.port_number <= str(range_end),
    )
    return session.exec(stmt).one()


def bulk_create_usages(session, records: list[dict]) -> None:
    objs = [FilingSubPortUsage(**r) for r in records]
    session.add_all(objs)
    session.flush()  # 触发唯一约束冲突（如有）


def list_usages_by_task(session, filing_task_id):
    stmt = select(FilingSubPortUsage).where(
        FilingSubPortUsage.filing_task_id == filing_task_id
    )
    return list(session.exec(stmt).all())
```

### C.4 分配算法

新文件：`backend/app/services/sub_port_allocator.py`

```python
import random
from fastapi import HTTPException
from sqlmodel import Session

from app.crud.filing_sub_port_usage import (
    get_used_numbers, bulk_create_usages,
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
    operator_id,
    filing_task_id,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """
    按"资质 × 主端口笛卡尔积"分配子端口。
    返回 {main_port_number: [(qualification, sub_port_number), ...]}

    并发安全：DB 唯一约束兜底，应用层 retry MAX_RETRY 次。
    """
    need_per_main = len(qualifications)
    if need_per_main == 0 or not main_port_numbers:
        return {}

    # 预检：范围足够大
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
        except Exception as conflict:  # IntegrityError 等
            session.rollback()
            if attempt == MAX_RETRY - 1:
                raise SubPortConflict() from conflict
            continue
    raise SubPortConflict()
```

### C.5 报备创建流程改造

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

`backend/app/api/routes/filing_tasks.py::create_task` 增加：

```python
allocated_sub_ports: dict[tuple[uuid.UUID, str], str] = {}

if create.auto_allocate_sub_ports:
    if not (create.sub_port_range_start and create.sub_port_range_end):
        raise HTTPException(400, "自动分配子端口时必须提供范围")
    if create.sub_port_range_start > create.sub_port_range_end:
        raise HTTPException(400, "子端口范围起始必须 ≤ 结束")

    # 推断主端口号列表：从 selected_ports 里取 sub_port_number 为空的视为主端口行
    main_ports = [p for p in selected_ports if not p.sub_port_number]
    if not main_ports:
        raise HTTPException(400, "未找到主端口行")
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

`generate_excel` 调用增加参数：

```python
excel_bytes = generate_excel(
    qualifications=qualifications,
    ports=selected_ports,
    export_group=export_group,
    group_by_field=create.group_by_field,
    qual_images=qual_images,
    allocated_sub_ports=allocated_sub_ports,  # 新增
    auto_allocate_sub_ports=create.auto_allocate_sub_ports,  # 新增
)
```

`generate_excel` 内部：

- 当 `auto_allocate_sub_ports=True` 时，行迭代改为 `for q in qualifications for mpn in main_port_numbers`，每行取 `port = main_port_dict[mpn]`，`sub_port = allocated_sub_ports[(q.id, mpn)]`
- 当 `auto_allocate_sub_ports=False` 时，沿用现有资质 × 端口笛卡尔积逻辑

### C.6 前端 5 步流程

`frontend/src/features/filing-management/create.tsx`：

- 类型 `Step` 改为 `1 | 2 | 3 | 4 | 5`
- 新增状态：`subPortRangeStart: string`、`subPortRangeEnd: string`，默认 `"100001"`、`"199999"`
- Step 2 改为只展示主端口行（filter `!sub_port_number`）
- 新增 Step 3 "配置子端口范围"：
  - 两个 `<Input>` 输入起止号码
  - 校验：6 位数字、起 ≤ 止、同位数
  - 调 `GET /filing-sub-port-usages/availability?main_port_numbers=A,B&range_start=100001&range_end=199999` 显示每个主端口的可用数量
  - 提示"预计生成 N 个子端口 = 资质数 × 主端口数"
- 原 Step 3（配置导出）变 Step 4，原 Step 4（确认）变 Step 5
- 提交时把 `auto_allocate_sub_ports: true` + 范围一起 POST

`backend/app/api/routes/filing_tasks.py` 新增：

```python
@router.get("/sub-port-availability")
def check_availability(
    session: SessionDep,
    main_port_numbers: str = Query(...),  # 逗号分隔
    range_start: int = Query(...),
    range_end: int = Query(...),
) -> dict:
    from app.crud.filing_sub_port_usage import count_used_in_range
    result = {}
    for mpn in main_port_numbers.split(","):
        used = count_used_in_range(session, mpn.strip(), range_start, range_end)
        result[mpn.strip()] = {
            "used": used,
            "total": range_end - range_start + 1,
            "available": (range_end - range_start + 1) - used,
        }
    return result
```

### C.7 测试

新增 `backend/app/tests/services/test_sub_port_allocator.py`：

- `test_allocate_basic`：3 主端口 × 2 资质 → 6 个不同号码、每个主端口下不重复
- `test_allocate_excludes_history`：预插入 (A, 100001)，再分配时不返回 100001 给 A
- `test_allocate_range_exhausted`：范围 100001-100003，需要 4 个 → 抛 409
- `test_allocate_concurrent_safety`：threading 两个 allocate 同时跑同一主端口 → 不重复
- `test_delete_filing_task_keeps_usage`：创建任务后删除 → FilingSubPortUsage 仍存在，filing_task_id 变 NULL

新增 `backend/app/tests/api/routes/test_filing_tasks_export.py`（如 B.5 已建则合并）：

- `test_create_filing_task_with_auto_sub_ports`：POST 带 `auto_allocate_sub_ports=true, sub_port_range_start=100001, sub_port_range_end=199999`，断言返回的 Excel 包含分配的子端口号
- `test_create_filing_task_range_exhausted_409`：范围只够 1 个、需要 2 个 → 409 + 错误消息

---

## 五、实施顺序与提交策略

按依赖关系与风险递增顺序，建议三个独立 PR：

1. **PR-1（子项 A）**：模型 nullable + 迁移 + 导入路由 + 前端表单 + 模板说明 + 测试
2. **PR-2（子项 B）**：新增 registry + 重构 filing_tasks + API + 前端重构 + 回归测试
3. **PR-3（子项 C）**：新增占用表 + 迁移 + CRUD + 分配算法 + 报备流程改造 + 前端 5 步流程 + 测试

每个 PR 独立可 revert。三个 PR 可分别 review 与部署。

---

## 六、验收清单

对应文档"六、建议验收清单"中 P0 项：

- [ ] 资质导入时，法人证件类型/号码/地址为空不会阻塞导入
- [ ] 端口信息导入/编辑时，操作类型、集团编码为空不阻塞
- [ ] 字段组选择"签名类型/来源"等任意字段后，导出文件中出现对应列
- [ ] 字段组新增字段后，导出文件中能同步出现新增字段
- [ ] 导出结果中能正确显示具体短信签名
- [ ] 新建报备支持输入类似 `100001-199999` 的子端口范围，并能在范围内随机生成子端口
- [ ] 同一主端口下已生成过的子端口不会再次生成，即使历史报备任务被删除、作废或重新导出
- [ ] 子端口范围耗尽时，系统给出明确错误提示，不生成重复号码

---

## 七、风险与回滚

| 风险 | 缓解 |
|---|---|
| A：旧代码访问 nullable 字段时遇到 None 引发意外 | review 所有使用这些字段的路由与前端代码；导入时 None → 空字符串 |
| B：字段字典重构遗漏 | "勾选全部字段 → 导出全列"回归测试 |
| C：分配算法并发性能 | `random.sample` 一次取够；retry 上限 3 次；DB 唯一约束兜底 |
| C：用户输入过窄范围 | 前端实时显示"可用/需要"对比；后端 409 明确提示 |

回滚：每个子项独立 PR、独立迁移，可单独 revert。
