# 子端口库（Sub-Port Library）设计文档

日期：2026-08-30
状态：已确认

## 背景与目标

为满足不同主端口下报备签名的专属子端口管理要求，新增"子端口库"模块，实现子端口统一管理：

- 子端口按归属主端口分类管理，主端口下子端口号唯一
- 表格列由字段组（复用报备管理下的导出字段组）驱动，支持库级切换
- 新增固定"状态"字段：在线 / 下线 / 整改（单选）
- 支持导入模板生成、批量导入（新增+覆盖更新）、手动编辑、单条/批量删除、导入删除清单删除

## 关键决策

| 决策点 | 结论 |
|---|---|
| 动态字段存储 | 方案 A：固定列 + JSON 字段值字典 |
| 字段组使用方式 | 库级切换：页面顶部选择字段组，表格列/导入模板/编辑表单随之变化；数据存 JSON 不丢失 |
| 主端口归属 | 文本主端口号列（不强制关联已有端口数据），唯一性 = 主端口号+子端口号组合 |
| 菜单位置 | 侧边栏独立菜单项"子端口库"（端口管理下方），路由 `/sub-ports` |
| 批量删除 | 表格多选删除 + 导入删除清单（主端口号+子端口号两列 Excel）两种方式 |

## 数据模型

新表 `sub_port_record`（`backend/app/models/sub_port_record.py`）：

```python
class SubPortRecord(SQLModel, table=True):
    id: UUID (PK)
    main_port_number: str(100), index     # 归属主端口号
    sub_port_number: str(100), index      # 子端口号
    status: str(20), default "在线"        # 枚举：在线/下线/整改
    field_values: JSON                     # {field_code: 字符串值}，键为字段组注册表字段编码
    created_at / updated_at
    UniqueConstraint("main_port_number", "sub_port_number")
```

- 字段组字段值仅存字符串；不属于任何字段组语义校验（自由文本）
- 切换/删除字段组不影响已有数据

## 后端 API

路由前缀 `/api/v1/sub-port-library`，`get_current_active_superuser` 保护，注册进 `app/api/main.py`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/template?group_id=` | 按字段组生成导入模板 Excel：固定列（主端口号、子端口号、状态）+ 字段组字段列表头 + "填写说明" sheet。**不含示例数据行**，避免用户直接导入模板时把示例数据入库 |
| POST | `/import/preview`（FormData: file, group_id） | 解析 Excel 返回前 5 行预览、未识别表头、总行数 |
| POST | `/import`（FormData: file, group_id） | Upsert 导入：按主端口号+子端口号匹配，存在则覆盖更新，不存在则新增；返回 total/success_count/error_count/errors |
| POST | `/import/parse-delete`（FormData: file） | 解析删除清单，返回 matched_count、unmatched 列表明细，不执行删除 |
| POST | `/import/delete`（FormData: file） | 执行删除清单，返回删除数量与未匹配明细 |
| GET | `/` | 分页列表；params: page, page_size, keyword（主/子端口号模糊）, status, main_port_number（精确） |
| POST | `/` | 手动新增，唯一冲突返回 400 |
| PATCH | `/{id}` | 手动编辑，唯一冲突返回 400 |
| DELETE | `/{id}` | 单条删除 |
| POST | `/batch-delete` | body: `{ids: [uuid]}`，返回删除数量 |

### 导入解析规则

- 表头按标签匹配：固定列（主端口号/子端口号/状态）+ 选中字段组各字段的 `field_label`；与资质导入一致，未识别表头进 `unrecognized_headers` 警告并忽略
- 每行校验：
  - 主端口号、子端口号为空 → error（行号+原因+建议）
  - 状态非空但不在 {在线, 下线, 整改} → error
  - 状态为空 → 默认"在线"
  - 同一文件内主端口号+子端口号重复 → 后者 error
- 字段组字段值统一转字符串存储；空值存 `""`
- 无错误的行为原子写入（有 error 的行跳过，其余正常导入，与资质导入行为一致）

### 删除清单格式

两列：`主端口号`、`子端口号`（表头宽松匹配）。匹配（主端口号+子端口号）存在则删除，未匹配的返回明细。

## 前端

- 路由：`src/routes/_authenticated/sub-ports/index.tsx` → `SubPortLibraryPage`
- 侧边栏：`sidebar-data.ts` 主要功能组新增"子端口库"（端口管理下方，icon 用 tabler 图标）
- 功能模块：`src/features/sub-port-library/`
  - `index.tsx`：页面主体，参照 `port-info/index.tsx`
    - 顶部：字段组选择器（下拉，默认第一个字段组，选择持久化到 localStorage）+ 新增 + 导入数据 + 下载模板 + 导入删除清单 + 多选批量删除 + 刷新
    - 筛选：关键词（主/子端口号模糊）+ 状态下拉（全部/在线/下线/整改）+ 主端口号输入
    - 表格：固定列（主端口号、子端口号、状态 badge）+ 当前字段组动态列（从 `field_values` 取值）+ 创建时间 + 操作（编辑/删除）
    - 状态 badge 颜色：在线=绿、下线=灰、整改=橙
    - 复用：`DataTable`（行选择）、`ImportDialog`、`SearchableSelect`、`ActionIconButton`、`StatusTag`
  - `components/sub-port-dialog.tsx`：新增/编辑对话框——主端口号、子端口号 Input；状态 Select 单选（在线/下线/整改）；当前字段组各字段 Input
  - `components/import-delete-dialog.tsx`：导入删除清单——上传 → 预览统计（将删除 N 条、未匹配 M 条明细）→ 确认执行
- API 模块：`src/lib/api/sub-port-library.ts`，模式与 `port-info.ts` 一致

## 数据库迁移

Alembic 迁移：新增 `sub_port_record` 表（含唯一约束与索引）。

## 测试

后端 pytest（`app/tests/test_sub_port_library.py`）：

1. 模板下载：200，表头含固定列 + 字段组字段列
2. 导入新增：新数据入库、状态默认在线、字段组字段值正确
3. 导入覆盖更新：已存在记录被导入值覆盖
4. 导入校验：缺主端口号/子端口号、非法状态 → errors 明细且不入库
5. 唯一性：手动创建/编辑重复组合返回 400
6. 文件内重复行：第二条报错
7. 删除清单：parse-delete 预览正确；delete 执行删除并返回未匹配
8. 列表：分页、keyword 模糊、status 筛选、main_port_number 精确筛选
9. 手动 CRUD + batch-delete

前端：`pnpm run lint` + `pnpm run build` 通过（项目无前端单测框架）。

## 验收标准对照

| 需求 | 实现 |
|---|---|
| 自定义子端口导入模板可正常生成 | GET /template 按字段组生成 |
| 状态字段显示/编辑，三个枚举正确存储 | 固定列 + 单选编辑 + badge 展示 |
| 手动修改、批量导入更新正常 | PATCH + upsert 导入 |
| 单条删除、批量删除正常 | DELETE + batch-delete + 导入删除清单 |
| 重复子端口号触发唯一性校验 | DB 唯一约束 + 导入预检 + 手动 400 |
