# 报备平台第二批整改优化 — 设计文档

> 来源：`docs/报备平台第二批整改优化点汇总.md`
> 日期：2026-08-09
> 状态：待确认

## 概述

本文档将客户第二批整改优化点拆分为 11 个可执行的中型开发任务，按 P0/P1/P2 优先级组织。每个任务包含现状、改造内容、涉及文件和预估工作量。

**总预估：7 个工作日**

---

## P0 任务（优先修复，影响核心流程）

### P0-1：端口信息必填规则放宽 + 错误提示优化

**预估**：1 天
**依赖**：需确认最小必填字段集（文档待确认 #1 #2），否则按以下默认值执行。

**现状**：
- `PortInfoBase` 强制 7 个必填字段：carrier, main_port_number, enterprise_name, port_type, carrier_room, enterprise_room, authorization_letter
- 前端 `port-info-dialog.tsx` 中 zod schema 同步校验
- 创建失败只返回 Pydantic 422 或统一的 "端口信息创建失败"
- 导入模板必填列检查与模型一致

**改造内容**：

后端：
- `app/models/port_info.py`：carrier_room、enterprise_room、authorization_letter 改为 `Optional[str]`，默认值 `None`
- `app/alembic/`：生成迁移将对应列改为 nullable
- `app/crud/port_info.py`：create 方法加入结构化错误返回
- `app/api/routes/port_info.py`：导入必填列检查同步调整；create 端点返回结构化错误 `{field, reason, suggestion}`

前端：
- `src/features/port-info/components/port-info-dialog.tsx`：zod schema 移除对应必填校验，表单项标注"选填"
- 创建失败时解析后端结构化错误，在对应字段下方展示

**待确认**：业务确认项 #1、#2

---

### P0-2：子端口生成规则扩展

**预估**：1 天
**依赖**：需确认三种模式是否都要（文档待确认 #3 #4）

**现状**：
- `app/services/sub_port_allocator.py`：仅 `random.sample` 模式，固定 6 位零填充，范围硬编码 100000-999999
- 无固定后缀、顺序生成等模式
- 前端 Step 3 仅支持输入范围起止值

**改造内容**：

后端：
- `app/services/sub_port_allocator.py`：新增 `AllocationMode` 枚举（random / sequential / fixed_suffix），重构 `allocate_sub_ports` 按模式分发
- 新增 `generate_by_suffix(main_port, suffix)` 和 `generate_sequential(main_port, start, end)`
- 移除 6 位硬编码限制，通过参数控制宽度
- `app/api/routes/filing_tasks.py`：`FilingTaskCreate` 新增 `allocation_mode`、`fixed_suffix` 参数；availability 检查适配多模式

前端：
- `src/features/filing-management/create.tsx`：Step 3 新增模式选择（范围随机 / 顺序生成 / 固定后缀），每种模式展示对应输入项
- 模式切换时重新查询可用性

**待确认**：业务确认项 #3、#4

---

### P0-3：短信子端口号命名与拼接

**预估**：0.5 天
**依赖**：需确认命名和拼接规则（文档待确认 #5 #6）

**现状**：
- 仅有一个"子端口号"列，无"短信子端口号"概念
- `generate_excel` 中无拼接逻辑

**改造内容**：

后端：
- `app/api/routes/filing_tasks.py`：`generate_excel` 中新增三列——主端口号、子端口扩展码、短信子端口号（主端口号 + 子端口扩展码拼接）
- `app/services/export_field_registry.py`：注册表新增三个字段条目（port_main_number, port_sub_extension, port_full_number）
- 子端口分配结果中同时返回拼接结果

前端：
- `src/features/filing-management/create.tsx`：Step 3 展示端口号、扩展码、完整短信子端口号的预览
- `src/features/port-info/index.tsx`：表格中"子端口号"列标签改为"子端口扩展码"
- 报备管理详情中展示三个字段

**待确认**：业务确认项 #5、#6

---

### P0-4：资质导入失败定位与错误报告

**预估**：1 天

**现状**：
- 导入遇第一个错误即整批回滚，仅返回一行错误文本
- 端口导入和资质导入各有一份重复的导入逻辑
- 空行导致图片行索引错位 bug（`continue` 跳过空行后 `ExtractedImage.row_index` 不变）

**改造内容**：

后端：
- `app/api/routes/qualifications.py` + `app/api/routes/port_info.py`：重构导入流程
  - 第一阶段：逐行校验收集所有错误（不写入）
  - 第二阶段：批量写入通过校验的行
  - 返回 `{total, success_count, error_count, errors: [{row, field, value, reason, suggestion}]}`
- 新增 `GET /qualifications/import/error-report/{batch_id}` 端点（生成带错误标注的 Excel）
- 修复空行导致图片行索引错位（两处导入逻辑同步修复）
- 新增"部分成功"模式开关（`allow_partial_success` 参数）

前端：
- `src/components/shared/import-dialog.tsx`：展示结构化错误列表（表格形式：行号、字段、值、原因、建议）
- 新增"下载错误报告"按钮
- 展示导入汇总：成功 X 条 / 失败 Y 条

---

### P0-5：资质导入模板字段顺序适配 + 法人字段选填

**预估**：0.5 天

**现状**：
- 导入按表头文本匹配字段（`header_to_field`），不依赖列序 → 列顺序调整已兼容
- 导入模板必填列检查仍要求法人证件三字段列存在
- DB 层法人字段已改为 nullable（migration `e79f8c670332`, 2026-08-02）

**改造内容**：

后端：
- `app/api/routes/qualifications.py`：移除导入必填列检查中的 `legal_representative_cert_type/number/address`
- `_QUALIFICATION_HEADERS` 更新为与客户新版模板一致的表头
- 模板下载"填写说明" sheet 更新法人字段选填说明
- 验证经办人字段顺序调整后导入正常

前端：
- 无需改动（模板由后端生成，导入错误展示已在 P0-4 覆盖）

---

### P0-6：端口信息新增"基础电信企业ID"

**预估**：0.5 天
**依赖**：需确认数据来源和填写规则（文档待确认 #8）

**现状**：`port_info` 表无此字段，代码中 grep 无结果。

**改造内容**：

后端：
- `app/models/port_info.py`：`PortInfoBase` 新增 `basic_telecom_enterprise_id: Optional[str]`
- `app/alembic/`：生成迁移新增列（varchar, nullable）
- `app/crud/port_info.py`：CRUD 支持该字段
- `app/api/routes/port_info.py`：`_PORT_HEADERS` + `header_to_field` 新增
- `app/services/export_field_registry.py`：注册表新增条目
- `app/tests/api/routes/test_port_info.py`：补充测试

前端：
- `src/lib/api/types.ts`：`PortInfo` 接口新增字段
- `src/features/port-info/components/port-info-dialog.tsx`：表单新增"基础电信企业ID"输入框
- `src/features/port-info/index.tsx`：表格新增可选列
- `src/features/port-info/components/port-info-detail-dialog.tsx`：详情展示新增

**待确认**：业务确认项 #8

---

## P1 任务（近期优化）

### P1-1：报备文件下载失败原因细化 + 重试支持

**预估**：0.5 天

**现状**：
- 下载失败统一 500 "文件下载失败: {e}"
- 无重新生成端点，file_path 写入后不可变
- 前端 `handleDownload` 中 columns memo 的 `[]` 依赖导致闭包陈旧（文件名始终 fallback 为 `export.xlsx`）

**改造内容**：

后端：
- `app/api/routes/filing_tasks.py`：下载端点区分失败类型并返回对应 HTTP 状态码
  - 文件不存在 → 404
  - 存储服务异常 → 503
  - 生成失败 → 500
- 新增 `POST /filing-tasks/{id}/regenerate` 端点，复用原 task 参数重新生成 Excel

前端：
- `src/features/filing-management/index.tsx`：修复 columns memo 依赖（加入 tasks），下载失败根据状态码展示中文提示 + "重新生成"按钮

---

### P1-2：字段组批量导入/导出

**预估**：1 天

**现状**：
- 字段组仅 CRUD 接口，无导入导出
- 字段注册表为 Python 硬编码列表，无 DB 表
- 前端为卡片列表 + 拖拽排序编辑

**改造内容**：

后端：
- `app/api/routes/export_groups.py`：新增 `GET /{id}/export`（xlsx，含字段组名、字段编码、字段名称、排序、启用状态）
- 新增 `POST /import`（按字段编码匹配注册表，校验重复/不存在/顺序冲突，返回结构化错误）
- 新增 `GET /registry/template`（字段编码对照表下载）

前端：
- `src/features/export-groups/index.tsx`：卡片列表新增"导入"按钮 + ImportDialog
- 每张卡片操作菜单新增"导出"按钮
- 复用已有 ImportDialog 组件展示导入结果

---

### P1-3：Excel 内嵌图片提取完善

**预估**：0.5 天

**现状**：
- 导入已支持 DISPIMG 提取（`extract_cell_images_from_xlsx`）和浮动图片提取（`extract_images_from_xlsx`）
- 存在空行导致图片行索引错位 bug
- 图片提取失败静默跳过，无可定位错误

**改造内容**：

后端：
- `app/services/excel_image_extractor.py`：修复空行导致图片行索引错位 bug（以实际数据行索引而非 Excel 绝对行号对齐）
- `app/api/routes/qualifications.py` + `app/api/routes/port_info.py`：图片提取失败时返回可定位错误（行号 + 列名 + 失败原因：格式不支持/超限/损坏）
- 补充图片格式和大小校验：PNG/JPEG/GIF/BMP/WEBP，单张 ≤ 10MB
- 验证全部图片列（单位证件、身份证正反面、签名举证、引流举证、引流链接举证、经办人现场照片）提取和关联正确性

---

## P2 任务（体验增强）

### P2-1：子端口生成规则持久化

**预估**：0.5 天

**现状**：生成规则通过创建请求参数传入，无持久化。

**改造内容**：

后端：
- 新增 `sub_port_generation_rule` 表（name, mode, config JSON, carrier, is_active）
- 新增规则 CRUD API
- 创建报备任务时支持引用已保存规则 ID

前端：
- Step 3 新增"选择已有规则"下拉 + "保存当前配置为规则"按钮

---

### P2-2：导入体验增强

**预估**：0.5 天

**现状**：导入模板下载无版本号，导入前无预览，未识别表头静默忽略。

**改造内容**：

后端：
- 模板下载文件名加入版本号（如 `资质导入模板_v2.xlsx`）
- 新增 `POST /qualifications/import/preview` 和 `POST /port-info/import/preview`（返回前 5 行解析结果不写入）
- 导入时未识别表头返回 warning 列表（当前静默忽略）

前端：
- 导入前可选"预览数据"按钮，展示解析结果
- 未识别表头以 warning 形式展示

---

## 执行顺序建议

```
P0-5（无依赖，改动最小）
  → P0-1（核心痛点，阻塞客户建端口）
    → P0-6（字段补充，影响面明确）
      → P0-4（错误报告基础能力，P0-1/P0-2 可复用）
        → P0-2 + P0-3（子端口联动，可并行或串行）
          → P1-1（下载修复，独立改动）
            → P1-2（字段组导入导出）
              → P1-3（图片提取完善）
                → P2-1 → P2-2
```

## 待业务确认事项（阻塞项）

以下 6 项在开始对应任务前需要确认，已标注在各任务依赖中：

1. **P0-1 阻塞**：新建主端口最小必填字段集？carrier_room / enterprise_room / authorization_letter 是否默认选填？
2. **P0-2 阻塞**：子端口是否需要同时支持范围随机、顺序生成、固定后缀三种模式？`95598` 是固定需求还是配置示例？
3. **P0-3 阻塞**："短信子端口号"是否正式作为命名？拼接是否始终为"主端口号 + 子端口扩展码"？
4. **P0-6 阻塞**："基础电信企业ID"的数据来源、填写规则和导出位置？
5. **业务确认 #9**：Excel 内嵌图片是否优先支持证件类图片列？
6. **业务确认 #10**：导入失败时是否支持部分成功？

## 验收清单（完成标准）

- [ ] 新建主端口时，非核心字段为空不阻塞创建
- [ ] 主端口创建失败时，前端展示明确失败原因和字段定位
- [ ] 子端口可按范围、顺序或固定后缀规则生成
- [ ] 生成的子端口在同一主端口下永久唯一
- [ ] 页面和导出文件能区分主端口号、子端口扩展码、短信子端口号
- [ ] 资质导入失败时能定位到失败行、字段、原因和修复建议
- [ ] 平台下载的资质导入模板与客户调整后模板一致
- [ ] 导入逻辑按表头识别字段，调整列顺序后仍能正确导入
- [ ] 法人证件类型/号码/地址默认选填
- [ ] Excel 单元格内嵌图片可被提取并关联到对应资质字段
- [ ] 字段组支持通过模板批量导入和导出
- [ ] 端口信息字段组可选择并导出"基础电信企业ID"
- [ ] 报备文件下载失败时展示明确原因，并支持重试或重新生成
