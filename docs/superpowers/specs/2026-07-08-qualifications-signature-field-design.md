# 资质管理签名字段设计

- 日期：2026-07-08
- 范围：资质管理模块（qualifications）新增一个必填文本字段 `signature`，覆盖后端模型/迁移、API（含导入模板与解析、列表查询）、前端表单与列表、测试

## 1. 背景

资质管理目前已有 15 个文本字段（企业名称、责任人、经办人相关）和 5 个图片字段。业务侧需要新增一个签名字段，用于记录"签字人姓名 / 主体名字 / 备注文字"。该字段必须可导入、可查询。

## 2. 目标

- 在 `qualification_info` 表新增一个 `signature` 文本字段（必填，最长 200 字符）
- Excel 导入模板新增"签名"列；导入时缺失或为空，按行号报错
- 列表查询接口支持按 `signature` 模糊搜索
- 前端新增/编辑表单、详情、列表列、查询表单同步支持

## 3. 非目标

- 不引入手写签名图片上传（与现有 5 个图片字段区分）
- 不引入数字签名 / 哈希校验
- 不拆分为 signature_name + signature_date 等多字段（YAGNI）
- 不影响其他模块

## 4. 数据模型

`backend/app/models/qualification_info.py`

在 `QualificationInfoBase` 末尾（`handler_phone` 之后）追加：

```python
signature: str = Field(max_length=200, index=True)
```

- 必填（无 default）
- `index=True`，与 `enterprise_name`、`cert_number` 同档，支持 `ilike` 过滤
- `QualificationInfoUpdate` 中保持 `signature: str | None = None`（部分更新语义，与其他字段一致）

## 5. 迁移策略

执行 `uv run alembic revision --autogenerate -m "add signature to qualification_info"`。

由于 `signature` 必填，对历史已有行需要回填：

- upgrade 中：先用 `op.add_column(..., server_default="")` 加列；再 `op.execute("UPDATE qualification_info SET signature = '未提供' WHERE signature = ''")`；最后 `op.alter_column(..., server_default=None, nullable=False)` 重建为 NOT NULL
- downgrade 中：`op.drop_column("qualification_info", "signature")`

具体 SQL 在生成的迁移脚本里手动调整。

## 6. 后端 API

### 6.1 CRUD（`backend/app/crud/qualification.py`）

`get_qualifications` 增加模糊过滤：

```python
if signature:
    statement = statement.where(QualificationInfo.signature.ilike(f"%{signature}%"))
```

### 6.2 路由（`backend/app/api/routes/qualifications.py`）

**模板生成**（`download_qualification_template`）：

- `_QUALIFICATION_HEADERS` 在 `经办人手机号` 之后、`单位证件图片` 之前插入 `"签名"`
- `example_data` 末尾追加示例文本，如 `"张三 经办"`
- 模板里图片示例单元格从 `P2` 改为 `Q2`（文本列插入后图片列右移 1 列）

**导入解析**（`import_qualifications`）：

- `header_to_field` 映射追加 `"签名": "signature"`
- 在行循环中校验：`signature` 缺失或为空 → 抛 400，错误信息 `"第 X 行：签名为必填项"`
- 图片列定位基于表头文本动态识别，无需调整

**list 接口**（约 241-253 行）：

- 新增 query 参数 `signature: str | None = None`
- 透传给 CRUD

## 7. 前端

### 7.1 类型与 API

- `frontend/src/lib/api/types.ts`：`QualificationInfo` 追加 `signature: string`
- `frontend/src/lib/api/qualifications.ts`：
  - `QualificationQuery` 追加 `signature?: string`
  - `getQualifications` 把 `signature` 拼到 query string

### 7.2 表单（`frontend/src/features/qualifications/components/qualification-dialog.tsx`）

- `formSchema` 追加：
  ```ts
  signature: z.string().min(1, '签名不能为空'),
  ```
- 表单 UI 在"经办人手机号"之后、图片上传区之前加一个 Input（必填）

### 7.3 列表页（`frontend/src/features/qualifications/index.tsx`）

- 表格新增"签名"列
- 查询表单新增"签名"搜索框，与"企业名称"、"证件号码"风格一致

## 8. 测试

### 8.1 后端

在已有的 qualification 测试文件中追加：

- 下载模板第 16 列表头等于 `"签名"`
- 导入缺失签名的行 → 400
- 导入完整行 → 成功创建且 `signature` 字段正确
- list 接口 `?signature=张三` 过滤正确

### 8.2 前端（手动验证）

- 表单不填签名 → zod 报错"签名不能为空"
- 列表页表格能看到"签名"列
- 搜索框输入能触发过滤
- 详情/编辑模式能正确回填

## 9. 验收清单

- [ ] 后端模型与迁移完成，`alembic upgrade head` 通过
- [ ] 后端测试全部通过
- [ ] 前端 `pnpm run lint` 与 `pnpm run build` 通过
- [ ] 下载模板 → 填一行签名留空 → 导入报错
- [ ] 下载模板 → 填两行带签名 → 导入成功
- [ ] 列表页搜"张三" → 仅剩一行
- [ ] 表单未填签名 → 提交报错
