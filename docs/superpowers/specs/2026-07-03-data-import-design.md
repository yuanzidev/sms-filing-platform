# 资质管理和端口管理数据导入功能设计

## 概述

为资质管理（QualificationInfo）和端口管理（PortInfo）增加 Excel 模板导入功能，支持模板下载和按模板批量导入数据。

## 需求要点

- 导入类型：仅新增，不做去重或更新
- 模板范围：全部字段（非必填字段可空）
- 错误处理：遇错即停，事务回滚，返回具体错误信息
- 模板格式：.xlsx，第一行为中文字段名表头

## API 设计

两个模块各新增 2 个端点：

### 资质管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/qualifications/template` | GET | 下载资质导入模板（含表头行的空 .xlsx） |
| `/api/v1/qualifications/import` | POST | 上传 Excel 文件批量导入资质 |

### 端口管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/port-info/template` | GET | 下载端口信息导入模板（含表头行的空 .xlsx） |
| `/api/v1/port-info/import` | POST | 上传 Excel 文件批量导入端口信息 |

### 模板下载

- 用 openpyxl 生成仅含表头行的 .xlsx
- 返回 `StreamingResponse`，Content-Type 为 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名：`资质导入模板.xlsx` / `端口信息导入模板.xlsx`

### 数据导入

- 接收 `multipart/form-data`，字段名 `file`
- openpyxl 逐行解析，第 1 行作为表头映射（复用 `build_field_map()` 的中文字段名映射反查）
- 校验规则：
  - `enterprise_name`（资质）/ `carrier`（端口）必填，为空时报错
  - 跳过空行（整行为空）
- 事务内批量写入 `session.add_all()` + `session.commit()`
- 导入成功返回 `{"count": N, "message": "成功导入 N 条记录"}`
- 导入失败（校验不通过或 DB 异常）返回 `{"detail": "第X行: 具体错误"}`

### 字段值类型转换

| 模型字段类型 | Excel 单元格处理 |
|-------------|-----------------|
| `str` | 直接读取，空单元格 → None |
| `bool` (如 `allow_self_extension`) | "是"/"true"/"1" → True，"否"/"false"/"0" → False，空 → None |
| `date` (如 `port_activation_date`) | 读取为 date 或 datetime → `.date()`，空 → None |

### 路由注册

在 `backend/app/api/routes/qualifications.py` 和 `port_info.py` 现有 router 中添加新端点，不需要新建文件。

## 前端设计

在两个列表页顶部操作区新增按钮：

- **下载模板按钮**：调用模板下载 API，触发浏览器下载
- **导入数据按钮**：打开导入对话框

### 导入对话框

基于 ShadcnUI Dialog 组件：

1. 顶部提示： "还没有模板？点击下载模板"（链接触发下载）
2. 文件选择区：`<Input type="file" accept=".xlsx,.xls" />`
3. 底部按钮：[取消] [确认导入]
4. 确认后上传文件到导入 API，显示 loading 状态
5. 结果处理：
   - 成功：关闭对话框，toast 提示 "成功导入 N 条记录"，刷新列表
   - 失败：在对话框内显示错误信息，不关闭对话框

### 按钮排列

```
[新建资质] [导入数据] [下载模板] [刷新]
```

## 影响范围

### 后端（修改）

- `backend/app/api/routes/qualifications.py` — 新增 `/template` 和 `/import` 端点
- `backend/app/api/routes/port_info.py` — 新增 `/template` 和 `/import` 端点

### 前端（修改）

- `frontend/src/features/qualifications/index.tsx` — 新增导入按钮和对话框
- `frontend/src/features/port-info/index.tsx` — 新增导入按钮和对话框
- `frontend/src/lib/api/qualifications.ts` — 新增 `downloadTemplate()` 和 `importExcel(file)` 方法
- `frontend/src/lib/api/port-info.ts` — 新增 `downloadTemplate()` 和 `importExcel(file)` 方法

### 不涉及

- 不需要新增数据库模型或迁移
- 不需要新增 npm 依赖
- 不需要修改 CRUD 层
- 不需要修改路由注册（在现有 router 中添加）
