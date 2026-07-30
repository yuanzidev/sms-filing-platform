# 新建报备：主端口/子端口两级选择 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建报备页面支持按主端口分组显式选择子端口，替换原有的"随机端口数量"机制；导出 Excel 仍保留主/子端口字段。

**Architecture:** 后端 `FilingTaskCreate` 删除 `port_count`、新增 `port_ids: list[UUID]`；`POST /filing-tasks` 改为按 ID 精确取端口，去掉随机打乱。前端新建报备流程从 3 步扩为 4 步，新增"选端口"步骤：用分组表格（按 `main_port_number` 分组）呈现，组头与子行各有 checkbox 支持多选。

**Tech Stack:** FastAPI + SQLModel（后端）；React + TypeScript + TanStack Query + TanStack Table + ShadcnUI（前端）。

## Global Constraints

- 后端依赖：`uv`（不要直接 pip install）；测试用 `uv run pytest`
- 前端依赖：`pnpm`；lint 用 `pnpm run lint`
- 所有响应字段中文文案保持现有风格
- Excel 导出列 `main_port_number` / `sub_port_number` 必须保留
- 不修改 `FilingTask` 表结构、不需要 Alembic 迁移（仅改输入 schema）
- 不修改 `generate_excel` 函数
- 分支策略：直接在 `main` 分支开发，commit message 不带 AI 署名

---

## File Structure

**改动文件：**

| 文件 | 责任 |
|---|---|
| `backend/app/models/filing_task.py` | `FilingTaskCreate` schema：删 `port_count`、加 `port_ids` |
| `backend/app/api/routes/filing_tasks.py` | `create_task`：删 random、按 `port_ids` 取数 |
| `backend/app/api/routes/port_info.py` | `GET /port-info` 的 `page_size` 上限放宽到 500 |
| `backend/app/tests/api/routes/test_filing_tasks.py` | 新建：`create_task` 的 happy path 与边界 case |
| `backend/app/tests/api/routes/test_port_info.py` | 新建：`page_size=500` 通过 |
| `frontend/src/lib/api/types.ts` | `CreateFilingTaskRequest` 类型：删 `port_count`、加 `port_ids` |
| `frontend/src/features/filing-management/create.tsx` | 新增 Step 2 选端口；3→4 步；接入 `port_ids` |

**不动文件：**
- `backend/app/crud/filing_task.py`（CRUD 没有引用 `create.port_count`，无需改）
- `backend/app/api/routes/filing_tasks.py` 中的 `generate_excel`、`build_field_map`、`get_field_value`
- `frontend/src/lib/api/filing-tasks.ts`（API 客户端无需改）
- `frontend/src/lib/api/port-info.ts`（`getPortInfos` 已支持 `page_size` 参数，无需改）

---

## Task 1: 后端 — `FilingTaskCreate` schema 改为 `port_ids`，`create_task` 改为按 ID 取端口

**Files:**
- Modify: `backend/app/models/filing_task.py:33-38`
- Modify: `backend/app/api/routes/filing_tasks.py:326-430`（`create_task` 函数）
- Test: `backend/app/tests/api/routes/test_filing_tasks.py`（新建）

**Interfaces:**
- Produces: `FilingTaskCreate.port_ids: list[uuid.UUID]`（新字段）；`POST /api/v1/filing-tasks` 接受新 body 形态
- Consumes: `app.crud.filing_task.create_filing_task`（不变）；`generate_excel`（不变）

- [ ] **Step 1: 写失败测试（happy path）**

创建 `backend/app/tests/api/routes/test_filing_tasks.py`：

```python
"""Tests for filing-tasks API: explicit port selection."""
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app.core.config import settings


def _create_qualification(client, headers, name="测试企业"):
    r = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=headers,
        json={
            "enterprise_name": name,
            "sms_signature": "签名X",
            "legal_representative_cert_type": "身份证",
            "legal_representative_cert_number": "110101199001011234",
            "legal_representative_cert_address": "北京市朝阳区XX路1号",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_port(client, headers, main_port_number, sub_port_number=None):
    payload = {
        "carrier": "中国移动",
        "main_port_number": main_port_number,
        "enterprise_name": "测试企业",
        "group_code": "G001",
        "carrier_room": "机房A",
        "enterprise_room": "机房B",
        "port_type": "短信",
        "operation_type": "新增",
        "authorization_letter": "AUTH001",
    }
    if sub_port_number is not None:
        payload["sub_port_number"] = sub_port_number
    r = client.post(
        f"{settings.API_V1_STR}/port-info",
        headers=headers,
        json=payload,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_export_group(client, headers, name="导出组"):
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=headers,
        json={
            "name": name,
            "fields": [
                {"field_name": "main_port_number", "sort_order": 1},
                {"field_name": "sub_port_number", "sort_order": 2},
            ],
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_create_filing_task_with_explicit_port_ids(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers)
    port_id_main = _create_port(client, superuser_token_headers, "10698")
    port_id_sub = _create_port(client, superuser_token_headers, "10698", "0001")
    group_id = _create_export_group(client, superuser_token_headers)

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id_main, port_id_sub],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["qualification_count"] == 1
    assert body["port_count"] == 2
    assert len(body["port_ids"]) == 2
    assert body["download_url"]

    # 下载并校验 Excel 包含两个端口行（资质×端口=2行 + 表头）
    r2 = client.get(
        f"{settings.API_V1_STR}/filing-tasks/{body['id']}/download",
        headers=superuser_token_headers,
    )
    assert r2.status_code == 200
    wb = load_workbook(BytesIO(r2.content))
    ws = wb.active
    assert ws.cell(row=1, column=1).value == "主端口号"
    assert ws.cell(row=1, column=2).value == "子端口号"
    # 资质(1) × 端口(2) = 2 数据行
    assert ws.max_row == 3
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -v`
Expected: FAIL — `KeyError: 'port_ids'` 或 422 Validation Error（因为 schema 还没改）

- [ ] **Step 3: 更新 schema**

修改 `backend/app/models/filing_task.py:33-38`：

```python
class FilingTaskCreate(SQLModel):
    task_name: str | None = None  # auto-generated if not provided
    qualification_ids: list[uuid.UUID]
    port_ids: list[uuid.UUID]
    export_group_id: uuid.UUID
    group_by_field: str | None = None
```

（删除 `port_count` 字段，新增 `port_ids` 字段）

- [ ] **Step 4: 更新 `create_task` 路由**

修改 `backend/app/api/routes/filing_tasks.py`，在 `create_task` 函数中（约 326 行起）：

找到原 `# 3. Load ports randomly` 段（约 346-355 行）：

```python
    # 3. Load ports randomly
    all_ports = list(session.exec(select(PortInfo)).all())
    if not all_ports:
        raise HTTPException(status_code=404, detail="端口信息为空，请先导入端口数据")

    shuffled = list(all_ports)
    random.shuffle(shuffled)
    port_count = create.port_count if create.port_count is not None else len(shuffled)
    selected_ports = shuffled[:port_count]
    selected_port_ids = [p.id for p in selected_ports]
```

替换为：

```python
    # 3. Load ports by explicit IDs
    if not create.port_ids:
        raise HTTPException(status_code=400, detail="至少选择一个端口")

    selected_ports = list(
        session.exec(
            select(PortInfo).where(PortInfo.id.in_(create.port_ids))  # type: ignore
        ).all()
    )
    if len(selected_ports) != len(create.port_ids):
        raise HTTPException(status_code=400, detail="部分端口ID无效")
    selected_port_ids = [p.id for p in selected_ports]
```

文件顶部 `import random` 可保留（无害），也可一并删除——若删除，确认没有其他地方用到。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -v`
Expected: PASS

- [ ] **Step 6: 添加边界 case 测试**

在 `backend/app/tests/api/routes/test_filing_tasks.py` 末尾追加：

```python
def test_create_filing_task_rejects_empty_port_ids(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers)
    group_id = _create_export_group(client, superuser_token_headers)

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 400
    assert "至少选择一个端口" in r.json()["detail"]


def test_create_filing_task_rejects_invalid_port_ids(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers)
    group_id = _create_export_group(client, superuser_token_headers)
    fake_id = "00000000-0000-0000-0000-000000000000"

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [fake_id],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 400
    assert "无效" in r.json()["detail"]
```

- [ ] **Step 7: 运行全部新测试确认通过**

Run: `cd backend && uv run pytest app/tests/api/routes/test_filing_tasks.py -v`
Expected: 3 passed

- [ ] **Step 8: 提交**

```bash
git add backend/app/models/filing_task.py backend/app/api/routes/filing_tasks.py backend/app/tests/api/routes/test_filing_tasks.py
git commit -m "feat(filing): 后端报备任务改为按port_ids显式选端口"
```

---

## Task 2: 后端 — `GET /port-info` 放宽 `page_size` 上限到 500

**Files:**
- Modify: `backend/app/api/routes/port_info.py:346-351`
- Test: `backend/app/tests/api/routes/test_port_info.py`（新建）

**Interfaces:**
- Produces: `GET /api/v1/port-info?page_size=500` 返回 200（不再 422）
- 不影响默认 `page_size=20`

- [ ] **Step 1: 写失败测试**

创建 `backend/app/tests/api/routes/test_port_info.py`：

```python
"""Tests for port-info API: page_size upper bound."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_port_info_accepts_large_page_size(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"page_size": 500},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["page_size"] == 500


def test_port_info_rejects_too_large_page_size(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"page_size": 501},
    )
    assert r.status_code == 422
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && uv run pytest app/tests/api/routes/test_port_info.py -v`
Expected: 第一个测试 FAIL（422），第二个 PASS

- [ ] **Step 3: 修改路由**

修改 `backend/app/api/routes/port_info.py:346-351`：

```python
def read_port_infos(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    carrier: str | None = None,
    province: str | None = None,
) -> Any:
```

（`le=100` 改为 `le=500`）

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend && uv run pytest app/tests/api/routes/test_port_info.py -v`
Expected: 2 passed

- [ ] **Step 5: 提交**

```bash
git add backend/app/api/routes/port_info.py backend/app/tests/api/routes/test_port_info.py
git commit -m "feat(port-info): page_size上限放宽到500"
```

---

## Task 3: 前端 — 类型与新建报备页面 4 步流程

**Files:**
- Modify: `frontend/src/lib/api/types.ts:332-337`
- Modify: `frontend/src/features/filing-management/create.tsx`（大改）

**Interfaces:**
- Produces: `CreateFilingTaskRequest` 新形态；`/filing-management/create` 页面 4 步流程
- Consumes: `getPortInfos`（已存在）；`useCreateFilingTask`（已存在）

- [ ] **Step 1: 更新 `CreateFilingTaskRequest` 类型**

修改 `frontend/src/lib/api/types.ts:332-337`：

```typescript
export interface CreateFilingTaskRequest {
  qualification_ids: string[]
  port_ids: string[]
  export_group_id: string
  group_by_field?: string | null
}
```

（删除 `port_count`，新增 `port_ids`）

- [ ] **Step 2: 修改 `Step` 类型与 state**

在 `frontend/src/features/filing-management/create.tsx` 顶部：

```typescript
type Step = 1 | 2 | 3 | 4
```

新增 import 与 state（在已有 state 块附近）：

```typescript
import { getPortInfos } from '@/lib/api/port-info'
import type { PortInfo } from '@/lib/api/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'

// Step 2 state (新)
const [portSearch, setPortSearch] = useState('')
const [portCarrierFilter, setPortCarrierFilter] = useState<string>('')
const [selectedPortIds, setSelectedPortIds] = useState<Record<string, boolean>>({})
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
```

- [ ] **Step 3: 拉取端口数据**

在已有 `useQuery` 块后新增：

```typescript
// Fetch all ports for selection (small dataset, < 100 rows)
const { data: portData } = useQuery({
  queryKey: ['port-info-all'],
  queryFn: () => getPortInfos({ page: 1, page_size: 500 }),
})

const allPorts: PortInfo[] = portData?.data ?? []
```

- [ ] **Step 4: 派生"按主端口分组"与"运营商选项"**

```typescript
// Group ports by main_port_number
const portGroups = useMemo(() => {
  const groups: Record<string, PortInfo[]> = {}
  for (const p of allPorts) {
    const key = p.main_port_number
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }
  // Sort each group: main port (sub_port_number is null/empty) first, then by sub_port_number
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const aSub = a.sub_port_number || ''
      const bSub = b.sub_port_number || ''
      if (aSub === '' && bSub !== '') return -1
      if (bSub === '' && aSub !== '') return 1
      return aSub.localeCompare(bSub)
    })
  }
  return groups
}, [allPorts])

const carrierOptions = useMemo(() => {
  const set = new Set<string>()
  for (const p of allPorts) set.add(p.carrier)
  return Array.from(set).sort()
}, [allPorts])
```

- [ ] **Step 5: 派生"过滤后的分组"与"选中统计"**

```typescript
const filteredGroups = useMemo(() => {
  const result: Record<string, PortInfo[]> = {}
  const search = portSearch.trim().toLowerCase()
  for (const [key, ports] of Object.entries(portGroups)) {
    if (portCarrierFilter && !ports.some((p) => p.carrier === portCarrierFilter)) continue
    if (search) {
      const matched = ports.some(
        (p) =>
          p.main_port_number.toLowerCase().includes(search) ||
          (p.sub_port_number || '').toLowerCase().includes(search) ||
          key.toLowerCase().includes(search)
      )
      if (!matched) continue
    }
    result[key] = ports
  }
  return result
}, [portGroups, portCarrierFilter, portSearch])

const selectedPortIdList = useMemo(
  () => Object.entries(selectedPortIds).filter(([, v]) => v).map(([id]) => id),
  [selectedPortIds]
)

const selectedGroupCount = useMemo(() => {
  const set = new Set<string>()
  for (const id of selectedPortIdList) {
    const p = allPorts.find((x) => x.id === id)
    if (p) set.add(p.main_port_number)
  }
  return set.size
}, [selectedPortIdList, allPorts])

function groupSelectionState(key: string, ports: PortInfo[]): 'none' | 'partial' | 'all' {
  const selectedCount = ports.filter((p) => selectedPortIds[p.id]).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === ports.length) return 'all'
  return 'partial'
}

function toggleGroup(key: string, ports: PortInfo[]) {
  const state = groupSelectionState(key, ports)
  setSelectedPortIds((prev) => {
    const next = { ...prev }
    const shouldSelect = state !== 'all'
    for (const p of ports) next[p.id] = shouldSelect
    return next
  })
}

function togglePort(id: string) {
  setSelectedPortIds((prev) => {
    const next = { ...prev }
    next[id] = !next[id]
    return next
  })
}

function toggleGroupExpanded(key: string) {
  setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
}
```

- [ ] **Step 6: 更新 step 标签与编号渲染**

找到原 step indicator 代码（约 225-240 行）：

```typescript
{([1, 2, 3] as Step[]).map((s, i) => (
```

改为：

```typescript
{([1, 2, 3, 4] as Step[]).map((s, i) => (
```

并把 label 三元表达式扩为 4 项：

```typescript
{s === 1 ? '选择资质' : s === 2 ? '选择端口' : s === 3 ? '配置导出' : '确认生成'}
```

把分隔符条件 `i < 2` 改为 `i < 3`。

- [ ] **Step 7: 新增 Step 2 UI（选端口）**

在原 `{step === 2 && (...)}` 块（配置导出）**之前**插入新的 Step 2 块：

```tsx
{/* Step 2: Select ports */}
{step === 2 && (
  <Card>
    <CardHeader>
      <CardTitle>选择端口</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索端口号"
          value={portSearch}
          onChange={(e) => setPortSearch(e.target.value)}
          className="w-64"
        />
        <Select value={portCarrierFilter} onValueChange={setPortCarrierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部运营商" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部运营商</SelectItem>
            {carrierOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          已选 {selectedGroupCount} 个主端口 / {selectedPortIdList.length} 行
        </span>
      </div>

      <div className="rounded-lg border">
        <div className="max-h-[480px] overflow-auto">
          {Object.keys(filteredGroups).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              没有匹配的端口
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(filteredGroups).map(([key, ports]) => {
                  const state = groupSelectionState(key, ports)
                  const expanded = expandedGroups[key] ?? false
                  return (
                    <Fragment key={key}>
                      <tr
                        className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleGroupExpanded(key)}
                      >
                        <td className="w-10 p-3">
                          <Checkbox
                            checked={state === 'all'}
                            ref={(el) => {
                              if (el) el.indeterminate = state === 'partial'
                            }}
                            onCheckedChange={() => toggleGroup(key, ports)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`全选主端口 ${key}`}
                          />
                        </td>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {expanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                            {key}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-right">
                          {ports.filter((p) => selectedPortIds[p.id]).length}/{ports.length}
                        </td>
                      </tr>
                      {expanded && ports.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b last:border-0 hover:bg-accent/30"
                        >
                          <td className="w-10 p-3 pl-8">
                            <Checkbox
                              checked={!!selectedPortIds[p.id]}
                              onCheckedChange={() => togglePort(p.id)}
                              aria-label={`选择端口 ${p.sub_port_number || '主端口'}`}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono">
                                {p.sub_port_number || '—'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {p.carrier} · {p.province || '-'} · {p.city || '-'} · {p.port_type || '-'}
                              </span>
                            </div>
                          </td>
                          <td />
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
        </Button>
        <Button
          onClick={() => setStep(3)}
          disabled={selectedPortIdList.length === 0}
        >
          下一步 <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

> 注意：需要在文件顶部 import `Fragment`：`import { Fragment, useMemo, useState } from 'react'`（如果原 import 已经有 useMemo、useState，只需追加 Fragment）

- [ ] **Step 8: 把原 Step 2 → Step 3，Step 3 → Step 4**

把原 `{step === 2 && (...)}` 块（配置导出）的判断条件改为 `{step === 3 && (...)}`。

块内的：
- "上一步"按钮 `onClick={() => setStep(1)}` 改为 `onClick={() => setStep(2)}`
- "下一步"按钮 `onClick={() => setStep(3)}` 改为 `onClick={() => setStep(4)}`

把原 `{step === 3 && (...)}` 块（确认生成）的判断条件改为 `{step === 4 && (...)}`。

块内的：
- "上一步"按钮 `onClick={() => setStep(2)}` 改为 `onClick={() => setStep(3)}`
- "端口数量"显示：把原 `{portCount ? `${portCount}（随机抽取）` : '全量'}` 改为 `{selectedPortIdList.length}`
- "预计行数"计算：把 `selectedIds.length * (portCount ? Number(portCount) : 0)` 改为 `selectedIds.length * selectedPortIdList.length`

- [ ] **Step 9: 删除 Step 3（配置导出）中的"随机端口数量"输入**

在原配置导出块（现在 step === 3）里，删除：

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">随机端口数量（可选）</label>
  <Input
    type="number"
    placeholder="留空使用全量端口"
    value={portCount}
    onChange={(e) => setPortCount(e.target.value)}
    className="w-full max-w-sm"
  />
  <p className="text-xs text-muted-foreground">不填写则使用全部可用端口</p>
</div>
```

同时删除顶部 state `const [portCount, setPortCount] = useState('')`。

- [ ] **Step 10: 更新 `handleCreate` 与 `estimatedRows`**

`handleCreate` 改为：

```typescript
const handleCreate = () => {
  if (!exportGroupId) {
    toast.error('请选择导出字段组')
    return
  }
  createMutation.mutate(
    {
      qualification_ids: selectedIds,
      port_ids: selectedPortIdList,
      export_group_id: exportGroupId,
      group_by_field: groupByField === '__none__' ? undefined : (groupByField || undefined),
    },
    {
      onSuccess: (task) => {
        toast.success('报备任务创建成功', {
          description: task.download_url ? '点击下载导出文件' : undefined,
          action: task.download_url
            ? {
                label: '下载',
                onClick: () => window.open(task.download_url!, '_blank'),
              }
            : undefined,
        })
        navigate({ to: '/filing-management' })
      },
      onError: () => toast.error('创建报备任务失败'),
    },
  )
}
```

`estimatedRows` 改为：

```typescript
const estimatedRows = selectedIds.length * selectedPortIdList.length
```

确认页"预计行数"展示 `estimatedRows > 0 ? estimatedRows.toLocaleString() : '0'`（移除"端口全量后确定"分支，因为现在必须显式选）。

把对应展示改为：

```tsx
<div className="col-span-2">
  <span className="text-sm text-muted-foreground">预计行数（资质 × 端口）</span>
  <p className="text-xl font-bold">{estimatedRows.toLocaleString()}</p>
</div>
```

- [ ] **Step 11: 编译校验**

Run: `cd frontend && pnpm run lint && pnpm tsc --noEmit`
Expected: 无报错

> 如果 `tsc --noEmit` 在本仓库没有配置，跳过；至少跑 `pnpm run lint` 与 `pnpm run build`。

- [ ] **Step 12: 启动开发服务器手测**

Run（背景）: `cd frontend && pnpm run dev`

打开浏览器到 `/filing-management/create`：

1. Step 1 选一个资质 → 点"下一步"
2. 看到"选择端口"页：搜索框、运营商下拉、分组表格；默认所有组折叠、所有 checkbox 未选；"下一步"灰
3. 展开一个主端口 → 勾选组头 → 组内所有行被选中
4. 取消一个子行 → 组头变 indeterminate（横线）
5. 搜索"10698" → 只剩匹配的组
6. 选好端口后"下一步"激活 → 进 Step 3 配置导出（已无"随机端口数量"输入）→ Step 4 确认页显示正确的"端口数量 = selectedPortIdList.length"
7. 点"生成报备" → 跳回列表，看到新任务
8. 下载 Excel，打开确认 `主端口号` / `子端口号` 列正确

> 同时启动后端 `cd backend && fastapi dev app/main.py` 确保请求能通

- [ ] **Step 13: 提交**

```bash
git add frontend/src/lib/api/types.ts frontend/src/features/filing-management/create.tsx
git commit -m "feat(filing): 新建报备新增端口选择步骤，替换随机端口数量"
```

---

## Self-Review 结论

**Spec 覆盖：**
- §前端设计 Step 2 → Task 3 Step 2-10 ✓
- §后端 schema 变化 → Task 1 Step 3 ✓
- §后端 API 行为（按 ID 取端口 + 校验）→ Task 1 Step 4 ✓
- §Port-info 列表接口放宽 → Task 2 ✓
- §测试后端边界 case → Task 1 Step 6 ✓
- §测试前端手测路径 → Task 3 Step 12 ✓
- §不动的部分（generate_excel、FilingTask 表结构）→ 确认未触 ✓

**Placeholder 扫描：** 无 TBD/TODO，所有步骤都有具体代码。

**类型一致性：**
- `FilingTaskCreate.port_ids: list[uuid.UUID]`（后端 Task 1）↔ `CreateFilingTaskRequest.port_ids: string[]`（前端 Task 3 Step 1）✓
- `selectedPortIds: Record<string, boolean>` → `selectedPortIdList: string[]` → 传入 `port_ids` ✓
- `selectedPortIdList.length` 与确认页"端口数量"一致 ✓
