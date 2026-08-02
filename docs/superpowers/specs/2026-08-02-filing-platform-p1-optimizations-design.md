# 报备平台 P1 优化设计文档

- 文档日期：2026-08-02
- 来源问题汇总：`docs/报备平台用户问题与优化方向汇总.md`
- 范围：P1 优先级项（6 个问题，分 5 组）。P2（问题 9）已在上轮 P0 中顺手完成。
- 上轮 P0 参考：`docs/superpowers/specs/2026-08-02-filing-platform-p0-optimizations-design.md`

---

## 一、整体范围

| 组 | 问题编号 | 问题简述 | 改动量 |
|---|---|---|---|
| A | 2 | 短信签名模板示例去掉 `【】` | 极小 |
| B | 3, 7 | 补举证图片字段进注册表 + 导入说明增强 | 小 |
| C | 4 | 端口信息管理加关键词搜索 + 多条件下拉筛选 | 中 |
| D | 5 | `enterprise_name` 标签改"主端口备案公司" | 中 |
| E | 8 | 报备管理关键词扩到操作人/字段组 + 自定义任务名 | 中 |

五组独立，可任意顺序实施。

---

## 二、组 A：短信签名模板示例去括号

### A.1 改动

`backend/app/api/routes/qualifications.py:115` — 模板示例数据行：

```python
# 改前
"【示例平台】",                # 短信签名

# 改后
"示例平台",                    # 短信签名
```

仅此一处。无自动添加括号的逻辑，不需改其他地方。

---

## 三、组 B：举证图片字段 + 导入说明

### B.1 注册表补字段

`backend/app/services/export_field_registry.py` 在图片材料分组追加 4 个：

```python
ExportField("signature_proof", "签名举证附件", "image_qualification", "图片材料"),
ExportField("diversion_number_proof", "引流号码举证附件", "image_qualification", "图片材料"),
ExportField("diversion_link_proof", "引流链接举证", "image_qualification", "图片材料"),
ExportField("handler_scene_photo", "经办人现场照片", "image_qualification", "图片材料"),
```

### B.2 导出映射补全

`backend/app/api/routes/filing_tasks.py` 的 `_CN_TO_LOGICAL_IMG` 字典追加：

```python
"签名举证附件": "signature_proof",
"引流号码举证附件": "diversion_number_proof",
"引流链接举证": "diversion_link_proof",
"经办人现场照片": "handler_scene_photo",
```

这样字段组勾选后，导出时 Excel 单元格嵌入对应图片。

### B.3 导入模板填写说明增强

`backend/app/api/routes/qualifications.py::download_qualification_template` 的 notes 列表：

- 已有第 1-7 条 + 第 8 条（P0 加的法人字段选填说明）
- 追加第 9 条："9. 支持图片的列：单位证件图片、责任人身份证正面/反面、法人身份证正面/反面、签名举证附件、引流号码举证附件、引流链接举证、经办人现场照片；图片文件建议小于 10MB，支持 PNG、JPEG 格式"

`backend/app/api/routes/port_info.py::download_port_info_template` 的 notes 列表：

- 追加第 9 条："9. 授权书图片列支持插入图片文件；导出时图片会嵌入 Excel 单元格"

### B.4 测试

- 注册表测试追加 4 个新字段存在性断言
- 导出回归测试验证新图片列出现在 Excel 表头

---

## 四、组 C：端口信息管理查询筛选

### C.1 后端 API 扩展

`backend/app/api/routes/port_info.py::read_port_infos` 扩查询参数：

```python
def read_port_infos(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    carrier: str | None = None,
    province: str | None = None,
    # 新增
    keyword: str | None = None,
    city: str | None = None,
    port_type: str | None = None,
    main_port_number: str | None = None,
) -> Any:
```

`backend/app/crud/port_info.py::list_port_infos` 签名同步扩展，查询逻辑：

- `keyword` → `WHERE (main_port_number ILIKE '%kw%' OR sub_port_number ILIKE '%kw%' OR enterprise_name ILIKE '%kw%')`
- `city`、`port_type` → 精确等值匹配
- `main_port_number` → `ILIKE '%value%'`

### C.2 前端筛选区改造

`frontend/src/features/port-info/index.tsx`:

- 在现有运营商下拉、省份下拉旁边增加：
  - 一个关键词输入框（placeholder: "搜索端口号/企业名称"）
  - 城市下拉（从数据中动态提取选项，或使用静态常见城市列表）
  - 端口类型下拉（短信/语音/等，从数据中提取或使用静态列表）
- 保留「搜索」和「重置」按钮
- 布局：一行紧凑排列

### C.3 测试

- 后端路由测试：keyword 命中主端口号/子端口号/企业名称各一条

---

## 五、组 D：企业名称标签改名

### D.1 原则

- 只改**所有用户可见的显示标签**
- 数据库字段名 `enterprise_name` 保持不变
- 资质侧 `enterprise_name` 标签保持"企业名称"
- 端口侧 `enterprise_name` 标签统一改为"主端口备案公司"

### D.2 改动清单

| 位置 | 改动 |
|---|---|
| `frontend/src/features/port-info/index.tsx` 列表表头 | "企业名称" → "主端口备案公司" |
| `frontend/src/features/port-info/components/port-info-dialog.tsx` 表单 label + zod message | "企业名称" → "主端口备案公司" |
| `frontend/src/features/port-info/components/port-info-detail-dialog.tsx` 详情 label | "企业名称" → "主端口备案公司" |
| `frontend/src/features/filing-management/create.tsx` FIELD_LABEL_MAP | `enterprise_name: '企业名称'` → `'主端口备案公司'` |
| `backend/app/services/export_field_registry.py` 端口侧 | label "企业名称" → "主端口备案公司"；新增资质侧 `enterprise_name` 独立条目，label 为"企业名称"（区分两个 entity 的 enterprise_name） |
| `backend/app/api/routes/port_info.py` 导入模板表头 `_PORT_HEADERS` | "企业名称" → "主端口备案公司" |
| `backend/app/api/routes/port_info.py` 导入 `header_to_field` | key "企业名称" → "主端口备案公司" |

### D.3 注册表处理

当前 registry 只有一个 `enterprise_name`（source=qualification, label=企业名称），取值 `qualification.enterprise_name`。端口侧 `port.enterprise_name` 目前无独立注册表条目，用户无法在字段组中单独选择端口的企业名。

改为两个独立条目：

```python
# 资质侧（保持不变）
ExportField("enterprise_name", "企业名称", "qualification", "资质信息"),
# 端口侧（新增，取值 port.enterprise_name，标签为"主端口备案公司"）
ExportField("port_enterprise_name", "主端口备案公司", "port", "端口信息"),
```

`backend/app/api/routes/filing_tasks.py::get_field_value` 中增加端口侧企业名的取值映射：

```python
# 在 get_field_value 中，field_source 分发前增加映射：
_PORT_ALIAS_MAP = {
    "port_enterprise_name": "enterprise_name",
}
# 取值时：
if source == "port":
    attr = _PORT_ALIAS_MAP.get(field_name, field_name)
    value = getattr(port, attr, "")
```

这样 `port_enterprise_name` 作为注册表逻辑名，`get_field_value` 自动转发到 `port.enterprise_name` 取值。

### D.4 测试

- 注册表测试验证两个条目都存在
- 导出测试验证"主端口备案公司"列取到 `port.enterprise_name` 的值

---

## 六、组 E：报备管理搜索扩展 + 任务名自定义

### E.1 关键词搜索扩展

`backend/app/crud/filing_task.py::list_filing_tasks`:

```python
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

前端 `frontend/src/features/filing-management/index.tsx`:

- 关键词输入框 placeholder 从"搜索任务名称"改为"搜索任务名称、操作人、字段组"

### E.2 任务名称自定义

`FilingTaskCreate.task_name` 已有 `str | None = None`，不传则自动生成。只需前端加输入框。

`frontend/src/features/filing-management/create.tsx`:

- 新增状态 `taskName: string`
- 在「配置导出」步骤（现为 step 4，5 步流程中）增加可选输入框：

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

- `handleCreate` 传 `task_name: taskName.trim() || undefined`
- 确认步骤概览中展示任务名称

### E.3 测试

- 后端路由测试：创建不同操作人/字段组/任务名的任务，关键词命中验证
- 后端路由测试：传自定义 task_name，断言任务记录中保存的是自定义名

---

## 七、验收清单

- [ ] 导入模板示例短信签名不再带 `【】` 括号
- [ ] 字段组可选字段中包含签名举证附件、引流号码举证附件、引流链接举证、经办人现场照片
- [ ] 勾选举证图片字段后，导出 Excel 包含对应图片列
- [ ] 导入模板填写说明含图片插入操作指南
- [ ] 端口信息管理支持按关键词搜索（主端口号/子端口号/企业名称）
- [ ] 端口信息管理支持按城市、端口类型下拉筛选
- [ ] 端口侧页面中"企业名称"全部显示为"主端口备案公司"
- [ ] 导出文件中端口侧企业名称列头为"主端口备案公司"
- [ ] 报备管理搜索可匹配操作人姓名和字段组名称
- [ ] 新建报备时可自定义任务名称，不填则自动生成
