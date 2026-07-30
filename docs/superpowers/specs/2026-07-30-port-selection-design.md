# 新建报备：主端口/子端口两级选择

## 背景

当前新建报备页面（`frontend/src/features/filing-management/create.tsx`）在端口侧只支持"随机端口数量"——后端取全量 `PortInfo`、随机打乱后取前 N 个。用户没有显式选择主端口或子端口的能力。

需求来源：端口管理已经把主端口和子端口纳入同一张表管理（`PortInfo.main_port_number` + `PortInfo.sub_port_number`），新建报备时也应支持两级、多选的端口选择。

## 目标

- 新建报备时，用户必须显式选择端口，不再随机抽取
- 选择形态：按 `main_port_number` 分组的表格，两级多选
- 导出 Excel 仍保留 `main_port_number` / `sub_port_number` 列（沿用现有 `generate_excel` 逻辑，不动）

## 非目标

- 不引入"端口组合"实体
- 不修改 `generate_excel` 内部的字段映射或行生成逻辑
- 不调整 `PortInfo` 表结构和端口管理页

## 整体形态

新建报备从 3 步扩展为 4 步：

```
Step 1 选资质 → Step 2 选端口（新增） → Step 3 配置导出 → Step 4 确认生成
```

`Step 2 配置导出`中现有的"随机端口数量"输入框**完全移除**，由 Step 2（选端口）取代。Step 3 只保留：导出字段组、分组排序字段。

## 前端设计（Step 2 选端口）

### 数据加载与分组

- 进入 `/filing-management/create` 页面时，并行请求 `GET /api/v1/port-info?page_size=500`，一次性取全量端口
- 客户端按 `main_port_number` 字符串值分组：
  ```
  groups: Record<string, PortInfo[]> = {
    "10698": [row1, row2, ...],
    "10699": [...],
  }
  ```
- 每组按 `sub_port_number` 排序：`sub_port_number` 为 `null/空` 的行（主端口本身）排在最前，其余按字符串升序

### 表格结构

```
┌────────────────────────────────────────────────────────────────┐
│ 搜索端口号 [______]   运营商 [全部▼]      已选 3 个主端口/8 行     │
├────────────────────────────────────────────────────────────────┤
│ ▼ ☑ 10698  (3/3)                                                │
│       ☑ —     中国移动  广东  深圳  短信       ← 主端口本身行       │
│       ☑ 0001  中国移动  广东  深圳  短信                          │
│       ☑ 0002  中国移动  广东  广州  短信                          │
│ ▶ ☐ 10699  (0/2)                                                │
│ ▶ ☑ 10700  (2/2)  （展开后可见子行）                              │
└────────────────────────────────────────────────────────────────┘
```

### 组头 checkbox 三态

- 组内所有行被选中 → ☑ 实心
- 组内部分行被选中 → ☐ 加横线（indeterminate）
- 组内全未选 → ☐ 空

点击组头：若当前未全选则全选组内所有行；若当前已全选则清空组内所有行。

### 子行列

| 列 | 取值 |
|---|---|
| 端口号 | `sub_port_number`，为空显示"—"（代表主端口本身） |
| 运营商 | `carrier` |
| 省份 | `province` |
| 城市 | `city` |
| 端口类型 | `port_type` |

### 搜索/筛选

- 顶部"搜索端口号"：模糊匹配 `main_port_number` 或 `sub_port_number`，匹配则整组保留
- "运营商"下拉：按 `carrier` 过滤，匹配则整组保留

### 默认状态

- 所有组**默认折叠**（点击组头展开/折叠）
- 所有 checkbox**默认未选**
- Step 2（选端口）"下一步"按钮 disabled 条件：`selectedPortIds.length === 0`

### 状态管理

页面级 state（无需 Zustand/URL state，wizard 内部状态足够）：

```ts
const [selectedPortIds, setSelectedPortIds] = useState<Set<string>>(new Set())
// 或 Record<string, boolean>，与现有 selectedRows 风格一致
```

### Step 4 确认页"端口数量"展示

从原来的 `portCount ? portCount（随机抽取）: 全量` 改为：

```
端口数量：{selectedPortIds.length}
```

## 后端设计

### Schema 变化

`backend/app/models/filing_task.py`：

```python
class FilingTaskCreate(SQLModel):
    qualification_ids: list[uuid.UUID]
    export_group_id: uuid.UUID
    group_by_field: str | None = None
    port_ids: list[uuid.UUID]          # 新增
    # 移除 port_count（仅输入层移除）
```

`FilingTask` 表结构不动——`port_count`、`port_ids` 作为**结果元数据**继续保留，记录实际导出了多少端口、哪些端口。

### API 行为

`backend/app/api/routes/filing_tasks.py` 的 `create_task`：

1. 校验 `port_ids` 非空：
   ```python
   if not create.port_ids:
       raise HTTPException(400, "至少选择一个端口")
   ```
2. 按 ID 加载端口（替换原 `random.shuffle`）：
   ```python
   selected_ports = list(session.exec(
       select(PortInfo).where(PortInfo.id.in_(create.port_ids))
   ).all())
   if len(selected_ports) != len(create.port_ids):
       raise HTTPException(400, "部分端口ID无效")
   ```
3. `generate_excel`、文件上传、任务落库等逻辑不动

### Port-info 列表接口放宽

`backend/app/api/routes/port_info.py:348`：

```python
page_size: int = Query(20, ge=1, le=500),   # 原 le=100 改为 le=500
```

默认值仍为 20，不影响端口管理页。前端选端口页用 `page_size=500` 取全量。

## 边界情况

| 场景 | 处理 |
|---|---|
| `port_ids` 为空 | 后端 400「至少选择一个端口」；前端"下一步"按钮 disabled |
| `port_ids` 含不存在 UUID | 后端 400「部分端口ID无效」 |
| `port_ids` 重复传入 | 后端 `IN` 查询天然去重 |
| 主端口组只有 1 行（`sub_port_number=None`，无子端口） | 组头 checkbox = 单行 checkbox，行为一致 |
| 同一个 `main_port_number` 跨运营商（理论场景） | 仍按 `main_port_number` 单一维度分组，组内通过"运营商"列区分 |

## 测试

### 后端测试

`backend/app/tests/api/routes/test_filing_tasks.py`：

- 现有"创建报备任务"用例：把 `port_count=N` 改为 `port_ids=[id1, id2, ...]`
- 新增 case：
  - `port_ids=[]` → 400
  - `port_ids` 含不存在 ID → 400
- 保留：正常创建 → 200，Excel 文件生成成功，包含期望的 `main_port_number` / `sub_port_number` 列

### 前端手测路径

1. Step 1 选资质 → Step 2 看到 port 列表分组渲染
2. 展开一个主端口 → 勾选组头 → 组内所有行被选中
3. 取消一个子行 → 组头变 indeterminate
4. 搜索"10698" → 只剩匹配的组
5. Step 3 配置导出（导出字段组、分组字段）→ Step 4 确认页显示正确的端口数
6. 生成 → 下载 Excel，打开确认主端口/子端口列正确

## 影响范围清单

**改动**：
- `frontend/src/features/filing-management/create.tsx`（步骤从 3 → 4，新增选端口步）
- `frontend/src/lib/api/types.ts`（`FilingTaskCreate` 类型：删 `port_count`、加 `port_ids`）
- `frontend/src/lib/api/filing-tasks.ts` 或对应 hook（参数调整）
- `backend/app/models/filing_task.py`（`FilingTaskCreate` schema：删 `port_count`、加 `port_ids`）
- `backend/app/api/routes/filing_tasks.py`（`create_task` 改为按 ID 取端口）
- `backend/app/api/routes/port_info.py`（`page_size` 上限放宽到 500）
- `backend/app/tests/api/routes/test_filing_tasks.py`（用例适配）

**不动**：
- `generate_excel` 函数
- `FilingTask` 表结构与已有迁移
- 已存在的报备任务记录（只读）
- 端口管理页
