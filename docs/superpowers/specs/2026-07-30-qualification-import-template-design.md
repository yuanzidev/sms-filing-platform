# 资质导入模板对齐新版本 — 设计文档

日期：2026-07-30

## 概述

按业务方提供的新版 Excel 模板 `docs/资质导入模板-4(1).xlsx`，调整资质管理（qualification_info）的导入/导出模板：

1. 模板表头列顺序按新模板重排为 45 列
2. 改名 4 个字段（仅中文表头 + `FileAttachment.field_name`，不动数据库列名）
3. 新增 1 个图片字段（引流链接举证）

数据库表结构（qualification_info 列）保持不变；历史 `FileAttachment.field_name` 走 Alembic 数据迁移回填。

## 一、字段映射（新模板 45 列）

| 序号 | 新表头 | 数据库字段 / 图片 field_name | 标记 |
|---:|---|---|---|
| 01 | 企业名称 | `enterprise_name` | |
| 02 | 单位证件号码 | `cert_number` | |
| 03 | 法人姓名 | `legal_representative_name` | |
| 04 | 法人证件类型 | `legal_representative_cert_type` | |
| 05 | 法人证件号码 | `legal_representative_cert_number` | |
| 06 | 责任人姓名 | `responsible_name` | |
| 07 | 责任人证件类型 | `responsible_cert_type` | |
| 08 | 责任人证件号码 | `responsible_cert_number` | |
| 09 | 责任人手机号 | `responsible_phone` | |
| 10 | 短信签名 | `sms_signature` | |
| 11 | 签名类型/来源 | `signature_type` | |
| 12 | 短信模板内容 | `sms_template_content` | |
| 13 | 引流号码 | `diversion_number` | |
| 14 | **引流链接** | `link_address` | **改名**（原"链接地址"） |
| 15 | 签名举证附件 | 图片 field_name | |
| 16 | **引流号码举证附件** | 图片 field_name | **改名**（原"引流举证附件"） |
| 17 | **引流链接举证** | 图片 field_name | **新增** |
| 18 | 单位证件图片 | 图片 field_name | |
| 19 | 责任人身份证正面 | 图片 field_name | |
| 20 | 责任人身份证反面 | 图片 field_name | |
| 21 | **法人身份证正面** | 图片 field_name | **改名**（原"经办人身份证正面"） |
| 22 | **法人身份证反面** | 图片 field_name | **改名**（原"经办人身份证反面"） |
| 23 | 单位证件类型 | `cert_type` | |
| 24 | APP/平台名称 | `app_platform_name` | |
| 25 | 法人证件地址 | `legal_representative_cert_address` | |
| 26 | 责任人证件地址 | `responsible_address` | |
| 27 | 经办人姓名 | `handler_name` | |
| 28 | 经办人证件类型 | `handler_cert_type` | |
| 29 | 经办人证件号码 | `handler_cert_number` | |
| 30 | 经办人证件地址 | `handler_address` | |
| 31 | 经办人手机号 | `handler_phone` | |
| 32 | 是否签名校验 | `signature_verified` | |
| 33 | 是否网关签名 | `is_gateway_signature` | |
| 34 | 模板是否包含变量 | `template_has_variable` | |
| 35 | 模板参数类型 | `template_param_type` | |
| 36 | 模板参数长度 | `template_param_length` | |
| 37 | 业务属性 | `business_attribute` | |
| 38 | 业务类型 | `business_type` | |
| 39 | 业务细类 | `business_subtype` | |
| 40 | 具体用途 | `specific_usage` | |
| 41 | 引流号码类型 | `diversion_number_type` | |
| 42 | 引流号码用途 | `diversion_number_usage` | |
| 43 | 引流内容 | `diversion_content` | |
| 44 | 链接类型 | `link_type` | |
| 45 | 经办人现场照片 | 图片 field_name | |

### 改名/新增清单

| 旧中文 | 新中文 | 性质 |
|---|---|---|
| 链接地址 | 引流链接 | 文字字段，DB 列 `link_address` 保留 |
| 经办人身份证正面 | 法人身份证正面 | 图片 field_name |
| 经办人身份证反面 | 法人身份证反面 | 图片 field_name |
| 引流举证附件 | 引流号码举证附件 | 图片 field_name |
| —（无） | 引流链接举证 | 图片 field_name（新增） |

## 二、实施步骤

### 2.1 后端：`backend/app/api/routes/qualifications.py`

1. **重写 `_QUALIFICATION_HEADERS`**：按上表 45 列顺序重排，并执行 4 处改名 + 1 处新增。
2. **重写 `download_qualification_template` 的 `example_data`**：保持示例值与新列顺序一一对应；原第 35 列「链接地址」对应的示例 `"https://example.com"` 移到新第 14 列「引流链接」位置。
3. **更新 `header_to_field`**：把 `"链接地址": "link_address"` 改为 `"引流链接": "link_address"`。其余映射不变。
4. **更新示例图片 cell 位置**：当前代码 `cell_images = {"AH2": ...}`（列 34，对应旧模板第一图片列「单位证件图片」）。新版第一图片列是第 15 列「签名举证附件」，对应列字母 `O2`。改为 `cell_images = {"O2": img_buf.getvalue()}`。
5. **更新填写说明**：notes 里"图片列（单位证件图片、身份证正面/反面等）"措辞保留即可，无需改文字。

### 2.2 后端：`backend/app/api/routes/filing_tasks.py`

报备任务用资质的中文 `field_name` 反查图片，必须同步改名。logical key 保留不变（避免影响下游导出包结构）。

- `build_field_map()`（约第 39-87 行）返回的 logical→中文映射中，第 80-86 行的图片字段部分：
  - `"handler_id_front": "经办人身份证正面"` → `"handler_id_front": "法人身份证正面"`
  - `"handler_id_back": "经办人身份证反面"` → `"handler_id_back": "法人身份证反面"`
- 报备任务创建流程中第 357-364 行的局部变量 `_CN_TO_LOGICAL_IMG`（中文→logical 反查）：
  - `"经办人身份证正面": "handler_id_front"` → `"法人身份证正面": "handler_id_front"`
  - `"经办人身份证反面": "handler_id_back"` → `"法人身份证反面": "handler_id_back"`

**范围限定**：本次不把"引流号码举证附件"和"引流链接举证"加入报备任务的图片集合。报备任务图片范围保持现状（cert_image / responsible_id_front / responsible_id_back / handler_id_front / handler_id_back / auth_image）。

### 2.3 后端：Alembic 数据迁移（新建）

新建 revision `789aaa38b6b3` 之后的下一个迁移，仅做数据回填，不动表结构。

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

> 说明：迁移用裸 SQL UPDATE，不经 ORM；对 `file_attachment` 表的 `entity_type='qualification_info'` 行做精确过滤，避免误伤其他实体。

### 2.4 前端：`qualification-detail-dialog.tsx`

- 第 68-74 行 `imageFields` 数组：
  - `{ name: '经办人身份证正面', match: '经办人身份证正面' }` → `match: '法人身份证正面'`，name 同步
  - 反面同理
  - `{ name: '引流举证附件', match: '引流举证附件' }` → name/match 改为 `引流号码举证附件`
  - 新增 `{ name: '引流链接举证', match: '引流链接举证' }`
- 第 157 行 `<FieldRow label='链接地址' ... />` → `label='引流链接'`

### 2.5 前端：`qualification-dialog.tsx`

- 第 46-47 行图片 label：
  - `handler_id_front` 的 label `'经办人身份证正面'` → `'法人身份证正面'`
  - `handler_id_back` 的 label `'经办人身份证反面'` → `'法人身份证反面'`
  - **保留 key**（`handler_id_front` / `handler_id_back`）不变，与 filing_tasks 的 logical key 保持一致
- 第 50 行 `diversion_proof_image` 的 label `'引流举证附件'` → `'引流号码举证附件'`
- 新增图片字段项：`{ name: 'diversion_link_proof_image', label: '引流链接举证' }`
- 第 928 行 `<FormLabel>链接地址</FormLabel>` → `引流链接`

> 注：`qualification-dialog.tsx` 里图片字段 `name` 是组件内部 key（如 `responsible_id_front`），用于表单状态管理；它和 `FileAttachment.field_name`（存中文）是两套东西，所以这里的 `name` 保留英文 key 即可，仅改 label。

### 2.6 前端：`export-group-dialog.tsx`

- 第 83 行 `{ key: 'link_address', label: '链接地址' }` → `label: '引流链接'`

### 2.7 测试：`backend/app/tests/api/routes/test_qualifications.py`

- 检查是否有断言依赖旧表头顺序或旧中文名；如有，同步更新。
- 建议新增一个最小用例：调用 `GET /qualifications/template`，断言返回的 xlsx 第一行表头第 14 列为"引流链接"、第 17 列为"引流链接举证"、第 21/22 列为"法人身份证正面/反面"。

## 三、数据流

### 模板下载（GET /qualifications/template）

```
_QUALIFICATION_HEADERS（新顺序，45 列）
  ↓ openpyxl 写入第 1 行
  ↓ example_data（重排）写入第 2 行示例
  ↓ inject_cell_images 注入 O2 单元格示例图片
  ↓ 返回 xlsx
```

### 模板上传（POST /qualifications/import）

```
读 Excel 第 1 行表头 → 按中文字段名匹配 header_to_field
  ↓ 按字段名（而非列号）取值
  ↓ 业务字段写入 QualificationInfo
  ↓ 图片字段由 extract_cell_images_from_xlsx 取出，field_name = 中文表头
  ↓ upload_import_images 写入 FileAttachment（field_name 存新中文）
```

由于匹配按中文名而非列号，**任意列顺序都能正确解析**；旧模板（含旧中文名"链接地址"）将因 `header_to_field` 中找不到"链接地址"而触发必填字段缺失错误，符合预期。

### 详情查看（GET /qualifications/{id}）

```
前端 detail-dialog imageFields 数组按新中文 match
  ↓ 遍历 qualification.file_attachments，按 field_name 过滤
  ↓ 渲染图片
```

历史数据已被 Alembic 迁移把 field_name 回填到新中文，因此详情页能正确显示老资质的图片。

## 四、错误处理

- 模板上传时缺少必填字段（企业名称、法人证件类型/号码/地址）→ 已有逻辑报 400，无需改。
- 上传旧模板（中文名仍是"链接地址"）→ 用户会看到"缺少必填列"错误，提示其重新下载最新模板。可接受。
- Alembic 迁移是幂等的（按 field_name 精确匹配），重复执行无副作用。

## 五、验证标准

1. `GET /qualifications/template` 返回的 xlsx 第 1 行 45 个表头与新模板字段顺序、命名完全一致。
2. 用新模板填一行数据 + 一张"引流链接举证"图片上传，导入成功，详情页能展示该图片。
3. 历史资质（导入于本次变更前）的"经办人身份证正面"图片在迁移后能在详情页"法人身份证正面"位置正确显示。
4. 报备任务生成接口仍能正确抓取资质的"法人身份证正面/反面"图片（因 filing_tasks 中英文映射已同步）。
5. `uv run pytest backend/app/tests/api/routes/test_qualifications.py` 全绿。
6. 前端 `pnpm run lint`、`pnpm run build` 无错。

## 六、范围外（Out of Scope）

- 不修改 `qualification_info` 表结构。
- 不修改 filing_tasks 的 logical key 命名（如 `handler_id_front`）。
- 不把"引流号码举证附件"和"引流链接举证"加入报备任务的图片集合。
- 不处理其他实体（如 port_info）的 file_attachment。
- 不增加表头版本号或新旧模板兼容机制。
