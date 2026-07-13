# 报备任务：报备名称自定义 + 新增报备编号

**日期**: 2026-07-08
**范围**: 后端模型/CRUD/迁移 + 前端类型/表单/列表
**目标**: 让报备名称（task_name）支持用户自定义（带默认值），并新增报备编号（filing_number）字段由系统自动生成。下载的 xlsx 文件名跟随用户填写的报备名称。

## 背景

当前报备任务的 `task_name` 由后端按 `BEI-YYYYMMDD-NNN` 格式自动生成，用户无法自定义。用户希望：
1. 报备名称可以自定义（用作辨识、下载文件名）
2. 同时保留一个系统自动生成的编号用于唯一标识和审计

## 设计

### 1. 数据模型变更

`backend/app/models/filing_task.py` 的 `FilingTaskBase` 新增 `filing_number` 字段：

```python
class FilingTaskBase(SQLModel):
    filing_number: str = Field(max_length=64, unique=True, index=True)  # 新增
    task_name: str = Field(max_length=256)                              # 保留，但语义改为用户可自定义
    # 其余字段不变
```

**约束**：
- `filing_number`：唯一索引、NOT NULL、自动生成、用户不可改
- `task_name`：NOT NULL、不强制唯一、用户可自定义

### 2. 自动生成逻辑

`backend/app/crud/filing_task.py` 把现有 `_task_name_sequence` 重命名为 `_filing_number_sequence`，规则不变：

```python
def _filing_number_sequence(session: Session) -> int:
    prefix = f"BEI-{date.today().strftime('%Y%m%d')}-"
    stmt = select(func.max(FilingTask.filing_number)).where(
        FilingTask.filing_number.like(f"{prefix}%")
    )
    last = session.exec(stmt).one()
    if last and last.startswith(prefix):
        return int(last[len(prefix):]) + 1
    return 1
```

`create` 函数逻辑：
- 始终自动生成 `filing_number = f"BEI-{date_str}-{seq:03d}"`
- `task_name`：若调用方传入非空字符串则用之，否则 fallback 到 `filing_number`（即默认 = 报备编号）

### 3. API Schema 变更

`backend/app/models/filing_task.py`：

- `FilingTaskCreate`：保留 `task_name: str | None = None`（签名不变，前端传非空字符串就用自定义，传 null/不传就用默认）
- `FilingTaskPublic` / `FilingTaskDetail`：新增 `filing_number: str`

### 4. 数据库迁移

新增 Alembic 迁移 `backend/app/alembic/versions/{新rev}_add_filing_number_to_filing_task.py`：

1. `op.add_column('filing_task', sa.Column('filing_number', sa.String(64), nullable=True))`
2. 数据回填：`UPDATE filing_task SET filing_number = task_name`（老数据两列相同，按用户选择）
3. `op.alter_column(... nullable=False)`
4. `op.create_unique_constraint('uq_filing_task_filing_number', 'filing_task', ['filing_number'])`
5. `op.create_index('ix_filing_task_filing_number', 'filing_task', ['filing_number'])`

降级路径反向操作。

### 5. 前端类型变更

`frontend/src/lib/api/types.ts`：

- `FilingTask` 接口新增 `filing_number: string`
- `CreateFilingTaskRequest` 新增 `task_name?: string | null`

### 6. 前端创建表单

`frontend/src/features/filing-management/create.tsx`：

- 新增 state：`const [taskName, setTaskName] = useState('')`
- 表单顶部（在"导出字段组"之前）加输入框：
  ```tsx
  <div className="flex flex-col gap-2">
    <Label>报备名称</Label>
    <Input
      placeholder="留空将自动使用报备编号（如 BEI-20260708-001）"
      value={taskName}
      onChange={(e) => setTaskName(e.target.value)}
    />
  </div>
  ```
- 提交逻辑加入：`task_name: taskName.trim() || undefined`

**不做预览 API**（YAGNI）：placeholder 文案足够，用户提交后才看到生成的 filing_number。

### 7. 前端列表展示

`frontend/src/features/filing-management/index.tsx` 第 110 行的 task_name 列改造为"主+副"两行显示：

```tsx
{
  id: 'task_name',
  header: '报备名称',
  cell: ({ row }) => (
    <div>
      <div>{row.original.task_name}</div>
      <div className="text-xs text-muted-foreground">{row.original.filing_number}</div>
    </div>
  ),
},
```

不分两列，主名称+副编号合并在一列内。

### 8. 详情对话框

`frontend/src/features/filing-management/index.tsx` 详情 Dialog 的 grid 内补一行：

```tsx
<div><span className="text-muted-foreground">报备编号：</span>{taskDetail.filing_number}</div>
```

放在"任务名称"之后。

### 9. 下载文件名（无需改代码）

确认现状已符合需求：
- 后端 `filing_tasks.py:461` Content-Disposition 用 `task.task_name.xlsx`
- 前端 `index.tsx:87` 用 `${task?.task_name || 'export'}.xlsx`

用户自定义 task_name 后，下载文件名自动跟随。**无代码改动**。

## 影响文件清单

**后端**：
1. `backend/app/models/filing_task.py` — 模型加字段 + Schema 加字段
2. `backend/app/crud/filing_task.py` — 生成逻辑改名+调整
3. `backend/app/alembic/versions/{新rev}_add_filing_number_to_filing_task.py` — 迁移
4. `backend/app/tests/test_filing_task.py`（或类似）— 加测试

**前端**：
5. `frontend/src/lib/api/types.ts` — 类型变更
6. `frontend/src/features/filing-management/create.tsx` — 表单加输入框
7. `frontend/src/features/filing-management/index.tsx` — 列表显示 + 详情

## 不在本次范围

- 不改下载相关代码（已用 task_name）
- 不动 MinIO object key（保持 `{task.id}.xlsx`）
- 不引入 filing_number 预览 API
- 不动其他模块（资质、端口等）

## 验证

- 后端：`uv run pytest backend/app/tests/test_filing_task.py` 验证 filing_number 自动生成、唯一约束、task_name 自定义/默认逻辑
- 数据库：手动检查迁移可正向+反向执行
- 前端：`pnpm run lint && pnpm run build` 通过
- 浏览器：创建一个不填名称的任务 → 列表显示编号两行；创建一个填名称的任务 → 列表显示名称+编号；下载文件名跟随名称
