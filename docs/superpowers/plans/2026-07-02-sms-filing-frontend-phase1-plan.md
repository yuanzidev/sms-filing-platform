# SMS 报备管理系统前端第一阶段 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 SMS 报备管理平台前端第一阶段 7 个核心页面（工作台、报备 CRUD、端口管理、API 数据展示），基于 MSW mock 数据独立开发。

**Architecture:** 沿用现有 TanStack Router + TanStack Query + ShadcnUI 模式。新增 `components/shared/` 存放 9 个通用业务组件，`lib/mock/` 集中管理 MSW mock 数据与 handlers，`features/` 下按模块组织页面组件，`hooks/` 封装数据获取逻辑。

**Tech Stack:** React 19, TypeScript, Vite 7, TanStack Router, TanStack Query, ShadcnUI, Tailwind CSS v4, React Hook Form + Zod, Recharts, @tanstack/react-table, MSW

## Global Constraints

- 所有页面数据来自 MSW mock，通过 `import.meta.env.DEV` 条件启用
- 遵循现有 API 函数模式：`lib/api/` 下导出 async 函数，使用 `api` axios 实例
- 遵循现有路由约定：TanStack Router 文件路由，`_authenticated` 组下创建
- 侧边栏图标使用 `@tabler/icons-react`
- 不要修改 `routeTree.gen.ts`（自动生成）
- 中文界面文案

---

## Task 1: Install MSW and create mock infrastructure

**Files:**
- Create: `frontend/src/lib/mock/browser.ts`
- Create: `frontend/src/lib/mock/utils.ts`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces: MSW browser worker setup, mock utility functions (paginate, filter, sort, search)

- [ ] **Step 1: Install MSW**

```bash
cd frontend && pnpm add -D msw
```

- [ ] **Step 2: Create `frontend/src/lib/mock/utils.ts`**

```typescript
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  }
}

export function filterBySearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  query: string
): T[] {
  if (!query) return items
  const lower = query.toLowerCase()
  return items.filter((item) =>
    searchFields.some((field) => {
      const val = item[field]
      return val != null && String(val).toLowerCase().includes(lower)
    })
  )
}

export function filterByFields<T>(
  items: T[],
  filters: Partial<Record<keyof T, unknown>>
): T[] {
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true
      return item[key as keyof T] === value
    })
  )
}

export function sortByField<T>(
  items: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return order === 'asc' ? -1 : 1
    if (av > bv) return order === 'asc' ? 1 : -1
    return 0
  })
}
```

- [ ] **Step 3: Create `frontend/src/lib/mock/browser.ts`**

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

- [ ] **Step 4: Modify `frontend/src/main.tsx` — add MSW startup**

在 `main.tsx` 中，`render(<App />)` 之前添加：

```typescript
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./lib/mock/browser')
    return worker.start({ onUnhandledRequest: 'bypass' })
  }
  return Promise.resolve()
}

enableMocking().then(() => {
  // 现有的 render 逻辑
})
```

把现有的 `render(<App />)` 包装到 `.then()` 回调中。

- [ ] **Step 5: Run `pnpm run dev` and verify MSW starts without errors**

预期：控制台显示 `[MSW] Mocking enabled.`，无网络请求报错。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/mock/ frontend/src/main.tsx frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: add MSW mock infrastructure with utility functions"
```

---

## Task 2: Mock data — shared types and record mock data

**Files:**
- Create: `frontend/src/lib/mock/data/records.ts`
- Create: `frontend/src/lib/mock/data/ports.ts`
- Create: `frontend/src/lib/mock/data/dashboard.ts`
- Create: `frontend/src/lib/mock/data/api-data.ts`

**Interfaces:**
- Produces: Mock data arrays for records (~50 items), main ports (10), sub ports (20), dashboard stats, API data (20)

- [ ] **Step 1: Create shared type definitions inline in `frontend/src/lib/mock/data/records.ts`**

```typescript
export type Carrier = '移动' | '联通' | '电信'
export type RecordStatus = '草稿' | '已报备' | '变更中' | '停用'
export type PortStatus = '空闲' | '使用中' | '停用' | '异常'
export type SubPortStatus = '空闲' | '已分配' | '已报备' | '停用'
export type ApiDataStatus = '待处理' | '已入库' | '校验失败' | '已忽略'

export interface FilingRecord {
  id: string
  record_number: string
  carrier: Carrier
  operation_type: string
  submit_unit: string
  source_file: string | null
  import_batch: string | null
  status: RecordStatus

  // Port
  main_port: string
  sub_port: string
  port_range: string
  port_type: string
  port_activation_date: string | null
  allow_self_extension: boolean

  // Region
  province: string
  city: string
  district: string

  // Enterprise
  enterprise_name: string
  cert_type: string
  cert_number: string
  customer_type: string
  group_code: string
  app_platform_name: string

  // Responsible person
  responsible_name: string
  responsible_cert_type: string
  responsible_cert_number: string
  responsible_cert_address: string
  responsible_phone: string

  // Handler
  handler_name: string
  handler_cert_type: string
  handler_cert_number: string
  handler_cert_address: string
  handler_phone: string

  // Authorization
  has_authorization: boolean
  auth_start_date: string | null
  auth_end_date: string | null
  auth_attachment: string | null
  contract_attachment: string | null

  // Business
  business_attribute: string
  business_type: string
  business_subtype: string
  carrier_original_biz_type: string
  specific_usage: string
  is_green_channel: boolean
  blacklist_type: string

  // Signature
  sms_signature: string
  signature_type: string
  signature_verified: boolean
  is_gateway_signature: boolean
  signature_attachment: string | null

  // Machine room
  carrier_room: string
  enterprise_room: string
  other_room: string

  // Templates (sub-table)
  templates: TemplateItem[]

  // Traffic diversion (sub-table)
  diversions: DiversionItem[]

  // Attachments
  attachments: AttachmentItem[]

  // Metadata
  created_at: string
  updated_at: string
  operator: string
}

export interface TemplateItem {
  id: string
  content: string
  has_variable: boolean
  param_type: string
  param_length: number
}

export interface DiversionItem {
  id: string
  content: string
  number_type: string
  number: string
  number_usage: string
  link_type: string
  link_url: string
  attachment: string | null
}

export interface AttachmentItem {
  type: string
  label: string
  status: '未上传' | '已上传' | '缺失' | '格式异常'
  file_name?: string
  file_url?: string
}
```

- [ ] **Step 2: Generate ~50 mock records in `records.ts`**

Generate records with `generateRecords()` function covering all 3 carriers, all 4 statuses, varied provinces/cities. Each record gets a unique `record_number` like `REC-20260702-0001`. Include at least one record with each edge case: no port, expiring auth, missing attachments, no templates.

- [ ] **Step 3: Create `frontend/src/lib/mock/data/ports.ts`**

```typescript
export interface MainPort {
  id: string
  port_number: string
  carrier: Carrier
  port_range: string
  province: string
  city: string
  port_type: string
  status: PortStatus
  sub_port_count: number
  created_at: string
}

export interface SubPort {
  id: string
  port_number: string
  main_port_id: string
  main_port_number: string
  carrier: Carrier
  enterprise_name: string
  sms_signature: string
  business_type: string
  status: SubPortStatus
  record_number: string | null
  updated_at: string
}

export const mainPorts: MainPort[] = [/* 10 items */]
export const subPorts: SubPort[] = [/* 20 items */]
```

Generate 10 main ports and 20 sub ports with varied statuses and carrier distribution.

- [ ] **Step 4: Create `frontend/src/lib/mock/data/dashboard.ts`**

```typescript
export const dashboardStats = {
  total_records: 48,
  new_this_month: 12,
  updated_this_month: 7,
  incomplete: 5,
  expiring_soon: 3,
  with_ports: 35,
}

export function generateTrendData(days: number) {
  // Generate [{date: '2026-07-01', count: N}, ...] for last N days
}

export const carrierDistribution = [
  { carrier: '移动', count: 20 },
  { carrier: '联通', count: 15 },
  { carrier: '电信', count: 13 },
]
```

- [ ] **Step 5: Create `frontend/src/lib/mock/data/api-data.ts`**

```typescript
export interface ApiDataItem {
  id: string
  import_time: string
  api_name: string
  data_type: string
  enterprise_name: string
  main_port: string
  sub_port: string
  carrier: Carrier
  status: ApiDataStatus
  error_reason: string | null
  raw_data: object
}

export const apiDataItems: ApiDataItem[] = [/* 20 items */]
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/mock/data/
git commit -m "feat: add mock data for records, ports, dashboard, and API data"
```

---

## Task 3: MSW handlers

**Files:**
- Create: `frontend/src/lib/mock/handlers.ts`

**Interfaces:**
- Consumes: Mock data from `./data/*`
- Produces: MSW handlers for all API endpoints

- [ ] **Step 1: Create `frontend/src/lib/mock/handlers.ts`**

Handlers for these endpoints:
- `GET /api/v1/dashboard/stats` → `dashboardStats`
- `GET /api/v1/dashboard/trends?days=30` → `generateTrendData(30)`
- `GET /api/v1/dashboard/carrier-distribution` → `carrierDistribution`
- `GET /api/v1/records` → paginated + filtered records
- `GET /api/v1/records/:id` → single record by id
- `POST /api/v1/records` → add record, return it
- `PATCH /api/v1/records/:id` → update record, return it
- `DELETE /api/v1/records/:id` → delete record
- `GET /api/v1/ports/main` → paginated main ports
- `GET /api/v1/ports/main/:id` → single main port
- `GET /api/v1/ports/sub` → paginated sub ports
- `GET /api/v1/ports/sub/:id` → single sub port
- `GET /api/v1/api-data` → paginated API data
- `PATCH /api/v1/api-data/:id` → update API data status

Use `http.get/post/patch/delete` with URL pattern matching. For list endpoints, parse `page` and `pageSize` from search params, apply filters, return `{ data, total, page, pageSize }`.

- [ ] **Step 2: Run `pnpm run dev` and verify no 404 errors in console**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/mock/handlers.ts
git commit -m "feat: add MSW handlers for all phase 1 API endpoints"
```

---

## Task 4: API functions

**Files:**
- Create: `frontend/src/lib/api/records.ts`
- Create: `frontend/src/lib/api/ports.ts`
- Create: `frontend/src/lib/api/api-data.ts`
- Create: `frontend/src/lib/api/dashboard.ts`

**Interfaces:**
- Consumes: axios `api` instance from `../api`
- Produces: Typed async API functions following existing pattern (`lib/api/users.ts`)

- [ ] **Step 1: Create `frontend/src/lib/api/records.ts`**

Following the existing pattern from `users.ts`:

```typescript
import api from '../api'

// Reuse types from mock data or define inline
export interface RecordFilters {
  page?: number
  pageSize?: number
  enterprise_name?: string
  main_port?: string
  sub_port?: string
  sms_signature?: string
  carrier?: string
  status?: string
  // ... advanced filters
}

export interface RecordsResponse {
  data: FilingRecord[]
  total: number
  page: number
  pageSize: number
}

export const getRecords = async (params?: RecordFilters): Promise<RecordsResponse> => {
  const response = await api.get('/api/v1/records', { params })
  return response.data
}

export const getRecord = async (id: string): Promise<FilingRecord> => {
  const response = await api.get(`/api/v1/records/${id}`)
  return response.data
}

export const createRecord = async (data: Partial<FilingRecord>): Promise<FilingRecord> => {
  const response = await api.post('/api/v1/records', data)
  return response.data
}

export const updateRecord = async (id: string, data: Partial<FilingRecord>): Promise<FilingRecord> => {
  const response = await api.patch(`/api/v1/records/${id}`, data)
  return response.data
}

export const deleteRecord = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/records/${id}`)
  return response.data
}
```

- [ ] **Step 2: Create `frontend/src/lib/api/ports.ts`** (same pattern for main/sub ports)

- [ ] **Step 3: Create `frontend/src/lib/api/api-data.ts`** (list + update status)

- [ ] **Step 4: Create `frontend/src/lib/api/dashboard.ts`** (stats, trends, distribution)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/
git commit -m "feat: add API functions for records, ports, API data, and dashboard"
```

---

## Task 5: Data hooks

**Files:**
- Create: `frontend/src/hooks/use-records.ts`
- Create: `frontend/src/hooks/use-ports.ts`
- Create: `frontend/src/hooks/use-api-data.ts`
- Create: `frontend/src/hooks/use-dashboard.ts`

**Interfaces:**
- Consumes: API functions from `lib/api/*`
- Produces: TanStack Query hooks

- [ ] **Step 1: Create `frontend/src/hooks/use-records.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as recordsApi from '@/lib/api/records'
import type { RecordFilters } from '@/lib/api/records'

export function useRecords(filters: RecordFilters = {}) {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.getRecords(filters),
  })
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: ['record', id],
    queryFn: () => recordsApi.getRecord(id),
    enabled: !!id,
  })
}

export function useCreateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.createRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}

export function useUpdateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FilingRecord> }) =>
      recordsApi.updateRecord(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recordsApi.deleteRecord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}
```

- [ ] **Step 2: Create `frontend/src/hooks/use-ports.ts`** (similar pattern: useMainPorts, useMainPort, useSubPorts, useSubPort)

- [ ] **Step 3: Create `frontend/src/hooks/use-api-data.ts`** (useApiData, useUpdateApiData)

- [ ] **Step 4: Create `frontend/src/hooks/use-dashboard.ts`** (useDashboardStats, useDashboardTrends, useCarrierDistribution)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add TanStack Query hooks for all data modules"
```

---

## Task 6: Update sidebar menu

**Files:**
- Modify: `frontend/src/components/layout/data/sidebar-data.ts`

**Interfaces:**
- Produces: Updated sidebar menu with 4 business menu items

- [ ] **Step 1: Add new icon imports and menu items**

在 `sidebar-data.ts` 的 `navGroups` 中，在现有"主要功能"group 中添加 3 个菜单项，并将"系统管理"group 中的"首页"移入"主要功能"：

```typescript
import {
  IconLayoutDashboard,
  IconFileDescription,
  IconPlugConnected,
  IconApi,
  IconSettings,
  IconUserCog,
  IconUsers,
  IconList,
} from '@tabler/icons-react'

// In navGroups:
{
  title: '主要功能',
  items: [
    {
      title: '工作台',
      url: '/',
      icon: IconLayoutDashboard,
    },
    {
      title: '报备管理',
      url: '/records',
      icon: IconFileDescription,
    },
    {
      title: '端口管理',
      url: '/ports/main',
      icon: IconPlugConnected,
    },
    {
      title: 'API 接入管理',
      url: '/api-data',
      icon: IconApi,
    },
  ],
},
```

注意：`url: '/'` 在 TanStack Router 文件路由中对应 `/_authenticated/index.tsx`。如果现有路由是 `index.tsx`，确保 URL 匹配。

- [ ] **Step 2: Run `pnpm run dev` and verify sidebar shows 4 new menu items**

点击每个菜单项应能导航（即使目标页面还不存在，路由会 404 — 这是预期的）。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/data/sidebar-data.ts
git commit -m "feat: add business menu items to sidebar"
```

---

## Task 7: Shared component — StatusTag

**Files:**
- Create: `frontend/src/components/shared/status-tag.tsx`

- [ ] **Step 1: Create `frontend/src/components/shared/status-tag.tsx`**

```typescript
import { Badge } from '@/components/ui/badge'

const colorMap: Record<string, string> = {
  // Record status
  '草稿': 'bg-gray-100 text-gray-700',
  '已报备': 'bg-green-100 text-green-700',
  '变更中': 'bg-orange-100 text-orange-700',
  '停用': 'bg-red-100 text-red-700',
  // Port status
  '空闲': 'bg-blue-100 text-blue-700',
  '使用中': 'bg-green-100 text-green-700',
  '异常': 'bg-red-100 text-red-700',
  // Sub port status
  '已分配': 'bg-orange-100 text-orange-700',
  // API status
  '待处理': 'bg-blue-100 text-blue-700',
  '已入库': 'bg-green-100 text-green-700',
  '校验失败': 'bg-red-100 text-red-700',
  '已忽略': 'bg-gray-100 text-gray-700',
  // Attachment status
  '未上传': 'bg-gray-100 text-gray-500',
  '已上传': 'bg-green-100 text-green-700',
  '缺失': 'bg-red-100 text-red-700',
  '格式异常': 'bg-yellow-100 text-yellow-700',
}

interface StatusTagProps {
  status: string
  customMap?: Record<string, string>
}

export function StatusTag({ status, customMap }: StatusTagProps) {
  const map = customMap ?? colorMap
  const className = map[status] ?? 'bg-gray-100 text-gray-700'
  return <Badge className={className} variant="outline">{status}</Badge>
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/status-tag.tsx
git commit -m "feat: add StatusTag shared component"
```

---

## Task 8: Shared component — DataTable

**Files:**
- Create: `frontend/src/components/shared/data-table/data-table.tsx`

**Interfaces:**
- Consumes: `@tanstack/react-table`
- Produces: `<DataTable>` generic component with sorting, row selection, pagination

- [ ] **Step 1: Create `frontend/src/components/shared/data-table/data-table.tsx`**

基于 `@tanstack/react-table` 的通用表格组件：

```typescript
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onSortingChange?: (sorting: SortingState) => void
  enableRowSelection?: boolean
  onRowSelectionChange?: (selection: RowSelectionState) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onSortingChange,
  enableRowSelection,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      onSortingChange?.(next)
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(next)
      onRowSelectionChange?.(next)
    },
    enableRowSelection,
    state: { sorting, rowSelection },
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          上一页
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {page} / {totalPages} 页，共 {total} 条
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/data-table/
git commit -m "feat: add DataTable shared component with sorting and pagination"
```

---

## Task 9: Shared component — SearchForm

**Files:**
- Create: `frontend/src/components/shared/search-form.tsx`

**Interfaces:**
- Produces: `<SearchForm>` accepting field config array, renders base search fields inline and advanced fields in collapsible section

- [ ] **Step 1: Create `frontend/src/components/shared/search-form.tsx`**

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export interface SearchField {
  name: string
  label: string
  type: 'text' | 'select'
  options?: { label: string; value: string }[]
  advanced?: boolean
}

interface SearchFormProps {
  fields: SearchField[]
  onSearch: (values: Record<string, string>) => void
  onReset: () => void
}

export function SearchForm({ fields, onSearch, onReset }: SearchFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const basicFields = fields.filter((f) => !f.advanced)
  const advancedFields = fields.filter((f) => f.advanced)

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearch = () => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    )
    onSearch(cleaned)
  }

  const handleReset = () => {
    setValues({})
    onReset()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {basicFields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === 'select' ? (
              <Select
                value={values[field.name] ?? ''}
                onValueChange={(v) => handleChange(field.name, v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={`选择${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.name}
                placeholder={field.label}
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-[160px]"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 pb-0.5">
          <Button onClick={handleSearch}>搜索</Button>
          <Button variant="outline" onClick={handleReset}>重置</Button>
        </div>
      </div>

      {advancedFields.length > 0 && (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              高级搜索 <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-3">
              {advancedFields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      value={values[field.name] ?? ''}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      placeholder={field.label}
                      value={values[field.name] ?? ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-[160px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/search-form.tsx
git commit -m "feat: add SearchForm shared component with collapsible advanced search"
```

---

## Task 10: Shared component — StatCard

**Files:**
- Create: `frontend/src/components/shared/stat-card.tsx`

- [ ] **Step 1: Create `frontend/src/components/shared/stat-card.tsx`**

```typescript
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/stat-card.tsx
git commit -m "feat: add StatCard shared component"
```

---

## Task 11: Dashboard page

**Files:**
- Create: `frontend/src/features/dashboard/components/stat-cards.tsx`
- Create: `frontend/src/features/dashboard/components/trend-chart.tsx`
- Create: `frontend/src/features/dashboard/components/carrier-pie-chart.tsx`
- Create: `frontend/src/features/dashboard/components/pending-list.tsx`
- Create: `frontend/src/features/dashboard/components/recent-changes.tsx`
- Modify: `frontend/src/routes/_authenticated/index.tsx`

- [ ] **Step 1: Create `stat-cards.tsx`** — 6 个 StatCard 在一行，用 `useDashboardStats()` 获取数据

- [ ] **Step 2: Create `trend-chart.tsx`** — Recharts `<BarChart>`，30 天趋势，`useDashboardTrends(30)`

- [ ] **Step 3: Create `carrier-pie-chart.tsx`** — Recharts `<PieChart>`，`useCarrierDistribution()`

- [ ] **Step 4: Create `pending-list.tsx`** — 待处理事项列表，每项用 `<Link>` 跳转到对应报备筛选

- [ ] **Step 5: Create `recent-changes.tsx`** — 变更记录表格（可用简单 `<Table>` 而非 DataTable，数据量小）

- [ ] **Step 6: Modify `frontend/src/routes/_authenticated/index.tsx`** — 组装以上组件为工作台页面

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { StatCards } from '@/features/dashboard/components/stat-cards'
import { TrendChart } from '@/features/dashboard/components/trend-chart'
import { CarrierPieChart } from '@/features/dashboard/components/carrier-pie-chart'
import { PendingList } from '@/features/dashboard/components/pending-list'
import { RecentChanges } from '@/features/dashboard/components/recent-changes'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">工作台</h1>
      <StatCards />
      <div className="grid grid-cols-2 gap-6">
        <TrendChart />
        <CarrierPieChart />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <PendingList />
        <RecentChanges />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run `pnpm run dev`, verify dashboard renders with mock data**

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/dashboard/ frontend/src/routes/_authenticated/index.tsx
git commit -m "feat: add dashboard page with stats, charts, and pending items"
```

---

## Task 12: Record list page

**Files:**
- Create: `frontend/src/features/records/components/records-table.tsx`
- Create: `frontend/src/features/records/components/record-search-form.tsx`
- Create: `frontend/src/features/records/index.tsx`
- Modify: `frontend/src/routes/_authenticated/records/index.tsx`
  (Note: may already exist — check before overwriting)

- [ ] **Step 1: Create `record-search-form.tsx`** — 配置 SearchForm 的字段数组（基础 6 个 + 高级 6 个）

- [ ] **Step 2: Create `records-table.tsx`** — 12 列的 DataTable，包含操作列（查看、编辑、复制新增、关联端口、导出、变更记录按钮）

- [ ] **Step 3: Create record list page component** — 搜索 + 工具栏 + 表格，管理 `page`/`filters`/`sorting` 状态

- [ ] **Step 4: Create route file** `frontend/src/routes/_authenticated/records/index.tsx`

- [ ] **Step 5: Run `pnpm run dev`, verify record list with search/pagination**

- [ ] **Step 6: Commit**

---

## Task 13: Shared components — AnchorFormLayout, SubTableField, PortSelector, FileUploadGroup

**Files:**
- Create: `frontend/src/components/shared/anchor-form-layout.tsx`
- Create: `frontend/src/components/shared/sub-table-field.tsx`
- Create: `frontend/src/components/shared/port-selector.tsx`
- Create: `frontend/src/components/shared/file-upload-group.tsx`

**Interfaces:**
- Produces: 4 shared components used by record form

- [ ] **Step 1: Create `anchor-form-layout.tsx`**

左侧导航 + 右侧表单区域的容器组件。接收 `sections: { id: string; title: string; optional?: boolean }[]` 和 children。

使用 IntersectionObserver 跟踪右侧各 section 的可见性，高亮对应锚点。点击锚点时 `document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })`。

```typescript
interface AnchorFormLayoutProps {
  sections: { id: string; title: string }[]
  children: React.ReactNode
}
```

- [ ] **Step 2: Create `sub-table-field.tsx`**

可增删行的内嵌表格，基于 `<Table>`。接收 `columns` 和 `value`/`onChange` props，支持添加行、删除行。

```typescript
interface SubTableFieldProps<T> {
  columns: { key: string; header: string; type: 'text' | 'select' | 'number'; options?: { label: string; value: string }[] }[]
  value: T[]
  onChange: (items: T[]) => void
  addLabel?: string
}
```

内部维护 key-value 对象数组，每行可编辑，底部"添加"按钮。

- [ ] **Step 3: Create `port-selector.tsx`**

基于 ShadcnUI Popover + Command 的可搜索选择器（Combobox）。接收 `onChange` 和可选的 `carrier` filter。

```typescript
interface PortSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  carrier?: string
}
```

内部调用 `useQuery({ queryKey: ['ports', 'search', query], queryFn: ... })` 搜索端口。支持手动输入不存在的端口号。

- [ ] **Step 4: Create `file-upload-group.tsx`**

附件上传区，接收 `items: AttachmentItem[]`，渲染每个附件的名称、状态标签（StatusTag）、上传按钮。

```typescript
interface FileUploadGroupProps {
  items: AttachmentItem[]
  onUpload: (type: string) => void
  onRemove: (type: string) => void
}
```

Phase 1 中上传按钮只做 UI 展示（无真实上传逻辑），状态由 mock 数据控制。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/
git commit -m "feat: add AnchorFormLayout, SubTableField, PortSelector, FileUploadGroup components"
```

---

## Task 14: Record form sections (14分组)

**Files:**
- Create: `frontend/src/features/records/components/record-form/record-form.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/basic-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/port-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/region-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/enterprise-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/responsible-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/handler-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/auth-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/business-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/signature-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/room-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/template-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/diversion-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/attachment-info-section.tsx`
- Create: `frontend/src/features/records/components/record-form/sections/extended-fields-section.tsx`

- [ ] **Step 1: Install react-hook-form + zod resolver** (if needed — both are in package.json)

Already in dependencies. Skip install.

- [ ] **Step 2: Define Zod schema in `record-form.tsx`**

Define a comprehensive Zod schema for record form validation. Use `z.object()` with all fields, marking appropriate fields as optional.

- [ ] **Step 3: Create `record-form.tsx`** — main form component

Receives optional `defaultValues` (for edit mode). Uses `useForm` with zod resolver.
Wraps form content in AnchorFormLayout with 14 section configs.
Renders each section component. On submit, calls `useCreateRecord` or `useUpdateRecord`.

- [ ] **Step 4: Create section components**

Each section is a `<div id={sectionId}>` with a Card wrapper containing form fields. Use `useFormContext()` to access form state.

Example section (basic-info-section.tsx):
```typescript
import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function BasicInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const carrier = watch('carrier')

  return (
    <Card>
      <CardHeader><CardTitle>基础信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>运营商</Label>
          <Select value={carrier ?? ''} onValueChange={(v) => setValue('carrier', v)}>
            <SelectTrigger><SelectValue placeholder="选择运营商" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="移动">移动</SelectItem>
              <SelectItem value="联通">联通</SelectItem>
              <SelectItem value="电信">电信</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* ... other fields using Input or Select */}
      </CardContent>
    </Card>
  )
}
```

Each section follows this pattern:
- 2-column grid layout
- Label + Input/Select/Textarea for each field
- Sections with sub-tables (template, diversion) use SubTableField
- Attachment section uses FileUploadGroup

- [ ] **Step 5: `extended-fields-section.tsx`** — watches `carrier` and conditionally renders extra fields

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/records/components/record-form/
git commit -m "feat: add record form with 14 field sections and Zod validation"
```

---

## Task 15: Record create and edit pages

**Files:**
- Create: `frontend/src/routes/_authenticated/records/create.tsx`
- Create: `frontend/src/routes/_authenticated/records/$recordId/edit.tsx`

- [ ] **Step 1: Create `create.tsx`** — renders RecordForm without defaultValues, on submit calls `useCreateRecord().mutateAsync()`, navigates to detail page on success

- [ ] **Step 2: Create `edit.tsx`** — uses `useRecord(recordId)` to load data, renders RecordForm with defaultValues, on submit calls `useUpdateRecord().mutateAsync()`

Handle loading state while record data is being fetched. Handle copy-from mode via search params in create route.

- [ ] **Step 3: Run `pnpm run dev`, test create and edit flow with mock data**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/_authenticated/records/
git commit -m "feat: add record create and edit pages"
```

---

## Task 16: Record detail page

**Files:**
- Create: `frontend/src/features/records/components/record-detail/record-detail.tsx`
- Create: `frontend/src/features/records/components/record-detail/tabs/basic-info-tab.tsx`
- Create: (additional tab files: port-enterprise-tab, contact-auth-tab, business-signature-tab, template-diversion-tab, attachments-tab, change-log-tab)
- Create: `frontend/src/routes/_authenticated/records/$recordId/detail.tsx`

- [ ] **Step 1: Create tab components** — each renders a description list (grid layout, label-value pairs) for its field group

- [ ] **Step 2: Create `record-detail.tsx`** — uses ShadcnUI Tabs, each tab renders its content component

- [ ] **Step 3: Create route file** `detail.tsx` — uses `useRecord(recordId)`, renders RecordDetail

- [ ] **Step 4: Run `pnpm run dev`, verify detail page renders all tabs**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/records/components/record-detail/ frontend/src/routes/_authenticated/records/$recordId/
git commit -m "feat: add record detail page with tabbed field groups"
```

---

## Task 17: Main port management pages

**Files:**
- Create: `frontend/src/features/ports/main/components/main-port-table.tsx`
- Create: `frontend/src/features/ports/main/components/main-port-detail.tsx`
- Create: `frontend/src/features/ports/main/index.tsx`
- Create: `frontend/src/routes/_authenticated/ports/main/index.tsx`
- Create: `frontend/src/routes/_authenticated/ports/main/$portId/detail.tsx`

- [ ] **Step 1: Create main port list page** — SearchForm + DataTable, same pattern as records list

- [ ] **Step 2: Create main port detail page** — Tabs: 基础信息、子端口列表、关联报备

- [ ] **Step 3: Run `pnpm run dev`, verify main port pages**

- [ ] **Step 4: Commit**

---

## Task 18: Sub port management pages

**Files:**
- Create: `frontend/src/features/ports/sub/components/sub-port-table.tsx`
- Create: `frontend/src/features/ports/sub/components/sub-port-detail.tsx`
- Create: `frontend/src/features/ports/sub/index.tsx`
- Create: `frontend/src/routes/_authenticated/ports/sub/index.tsx`
- Create: `frontend/src/routes/_authenticated/ports/sub/$portId/detail.tsx`

- [ ] **Step 1: Create sub port list page** — SearchForm + DataTable

- [ ] **Step 2: Create sub port detail page** — Tabs: 基础信息、关联报备

- [ ] **Step 3: Run `pnpm run dev`, verify sub port pages**

- [ ] **Step 4: Commit**

---

## Task 19: API data display page

**Files:**
- Create: `frontend/src/features/api-data/components/api-data-table.tsx`
- Create: `frontend/src/features/api-data/index.tsx`
- Create: `frontend/src/routes/_authenticated/api-data/index.tsx`

- [ ] **Step 1: Create API data list page** — SearchForm + DataTable, status filter, dialog for raw data view

- [ ] **Step 2: Run `pnpm run dev`, verify API data page**

- [ ] **Step 3: Commit**

---

## Task 20: Shared component index + final integration test

**Files:**
- Create: `frontend/src/components/shared/index.ts`

- [ ] **Step 1: Create `index.ts`** — re-export all shared components

- [ ] **Step 2: Full walkthrough** — start dev server, navigate through all 7 pages, verify:
  1. Dashboard stats cards match mock data
  2. Charts render without errors
  3. Record list → search → click create → fill form → submit → see in list
  4. Record detail tabs all work
  5. Main/sub port lists work with search/pagination
  6. API data list works with status filter
  7. All pages at 1440px — no horizontal overflow

- [ ] **Step 3: Fix any issues found during walkthrough**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/index.ts
git commit -m "chore: add shared component barrel export"
```
