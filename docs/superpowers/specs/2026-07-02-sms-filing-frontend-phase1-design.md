# SMS 报备管理系统 — 前端第一阶段设计规格

## 概述

### 目标

完成 SMS 报备管理平台前端第一阶段 7 个核心页面，搭建系统主骨架：能看统计、能录报备、能查详情、能管端口、能看 API 接入数据。

### 不在本阶段范围

导入任务、导出任务、字段模板、端口随机组合、API 接入配置/日志、操作日志、变更记录、附件完整性校验。

### 技术栈（沿用现有）

- React 19 + TypeScript + Vite 7
- TanStack Router（文件路由）、TanStack Query（服务端状态）
- ShadcnUI + Tailwind CSS v4
- React Hook Form + Zod（表单校验）
- Recharts（图表）
- Zustand（客户端状态，已有）

### 数据策略

开发阶段使用 Mock 数据驱动。在 `src/lib/mock/` 下集中管理 mock data 和 MSW handlers。API 函数（`src/lib/api/`）保持不变，通过 MSW 拦截请求返回 mock 数据。后期后端就绪后，移除 MSW 初始化即可切换到真实 API。

---

## 菜单与路由

### 菜单结构（精简版）

```
工作台
报备管理
端口管理
API 接入管理
```

### 路由树

```
/_authenticated/
  index.tsx                          # → 工作台
  records/
    index.tsx                        # → 报备列表
    create.tsx                       # → 报备新增
    $recordId/
      detail.tsx                     # → 报备详情
      edit.tsx                       # → 报备编辑
  ports/
    main/
      index.tsx                      # → 主端口列表
      $portId/detail.tsx             # → 主端口详情
    sub/
      index.tsx                      # → 子端口列表
      $portId/detail.tsx             # → 子端口详情
  api-data/
    index.tsx                        # → API 接入数据展示
```

侧边栏菜单配置在 `src/components/layout/data/sidebar-data.ts` 中更新。

---

## 页面详细设计

### 1. 工作台 (`/_authenticated/index.tsx`)

**定位**：首页概览，只读展示，不做编辑操作。

**页面结构**（自上而下）：

```
┌──────────────────────────────────────────┐
│  统计卡片行（6 个）                       │
│  报备总数 | 本月新增 | 本月变更 | ...     │
├──────────────────────────────────────────┤
│  图表行（2 列）                           │
│  近 30 天报备趋势折线图 | 运营商分布饼图  │
├──────────────────────────────────────────┤
│  待处理事项 + 最近变更记录（2 列）        │
└──────────────────────────────────────────┘
```

**统计卡片**（用 ShadcnUI Card 组件，2 行 × 3 列）：

| 卡片 | 数据来源 |
|------|---------|
| 报备总数 | `GET /api/dashboard/stats` → `total_records` |
| 本月新增 | `GET /api/dashboard/stats` → `new_this_month` |
| 本月变更 | `GET /api/dashboard/stats` → `updated_this_month` |
| 待完善资料 | `GET /api/dashboard/stats` → `incomplete` |
| 授权即将到期 | `GET /api/dashboard/stats` → `expiring_soon`（30 天内） |
| 已关联端口 | `GET /api/dashboard/stats` → `with_ports` |

**图表**（用 Recharts）：

- 近 30 天趋势：`GET /api/dashboard/trends?days=30` → `[{date, count}]` → `<AreaChart>` 或 `<BarChart>`
- 运营商分布：`GET /api/dashboard/carrier-distribution` → `[{carrier, count}]` → `<PieChart>`

**待处理事项**（列表，每项可点击跳转）：

| 类型 | 跳转目标 |
|------|---------|
| 未关联端口（N 条） | `/records?status=no_port` |
| 附件缺失（N 条） | `/records?status=missing_attachment` |
| 授权即将到期（N 条） | `/records?expiring=30` |
| 字段校验失败（N 条） | `/records?status=validation_failed` |

**最近变更记录**：简单表格，字段：变更时间、操作类型、企业名称、主端口号、操作人。

**状态管理**：全部通过 TanStack Query 获取，无客户端状态。图表和列表数据各自独立 query。

---

### 2. 报备列表 (`/_authenticated/records/index.tsx`)

**页面结构**：

```
┌──────────────────────────────────────────┐
│  搜索区域                                 │
│  [企业名称] [主端口号] [运营商▼] [状态▼]  │
│  [搜索] [重置]          [展开高级搜索 ▾]  │
│  （高级搜索默认折叠）                      │
├──────────────────────────────────────────┤
│  工具栏                                   │
│  [+ 新增报备]  [批量导出]  [批量操作▾]    │
│  已选 N 条                                │
├──────────────────────────────────────────┤
│  数据表格                                 │
│  ☐ | 报备编号 | 运营商 | 企业名称 | ...   │
├──────────────────────────────────────────┤
│  分页器                                   │
└──────────────────────────────────────────┘
```

**列表字段**（12 列，操作列固定右侧）：

报备编号、运营商、企业名称、主端口号、子端口号、短信签名、业务类型、接入省、接入地市、当前状态、授权结束日期、更新时间、操作

**搜索条件**：

- 基础搜索（始终可见）：企业名称（输入框）、主端口号（输入框）、子端口号（输入框）、短信签名（输入框）、运营商（Select）、当前状态（Select）
- 高级搜索（默认折叠）：统一社会信用代码、业务类型、接入省/地市、授权到期时间范围、创建时间范围、导入批次

**操作按钮**：

- 单条：查看 → `/records/$id/detail`、编辑 → `/records/$id/edit`、复制新增 → `/records/create?copy_from=$id`、关联端口（Dialog）、导出（单条下载）、变更记录（Dialog）
- 批量（勾选后启用）：批量导出、批量修改状态、批量关联端口、批量删除

**表格交互**：

- 列排序：报备编号、更新时间、授权结束日期
- 状态列用不同颜色标签（草稿=灰色、已报备=绿色、变更中=橙色、停用=红色）
- 授权结束日期距当前 < 30 天的行高亮（黄色背景或警告图标）

**Hook 设计**：

```typescript
// src/hooks/use-records.ts
useRecords(filters: RecordFilters) → useQuery({ queryKey: ['records', filters], queryFn: ... })
useRecord(id: string) → useQuery({ queryKey: ['record', id], queryFn: ... })
useCreateRecord() → useMutation({ mutationFn: ... })
useUpdateRecord() → useMutation({ mutationFn: ... })
useDeleteRecord() → useMutation({ mutationFn: ... })
useDeleteRecords() → useMutation({ mutationFn: ... })  // 批量
```

---

### 3. 报备新增/编辑 (`/_authenticated/records/create.tsx`, `edit.tsx`)

**页面布局**：左侧锚点导航（固定 220px 宽）+ 右侧分组表单（滚动区域）。

```
┌──────┬───────────────────────────────────┐
│锚点   │  表单区域                          │
│导航   │  ┌─ 基础信息 ──────────────────┐  │
│      │  │  运营商: [...]  操作类型: [.] │  │
│基础   │  └────────────────────────────┘  │
│信息   │  ┌─ 端口信息 ──────────────────┐  │
│端口   │  │  主端口号: [搜索选择...]     │  │
│信息 ●│  │  子端口号: [搜索选择...]     │  │
│区域   │  └────────────────────────────┘  │
│信息   │  ┌─ 区域信息 ──────────────────┐  │
│企业   │  │  ...                         │  │
│信息   │  └────────────────────────────┘  │
│...    │  ...滚动...                       │
│附件   │  ┌─ 附件信息 ──────────────────┐  │
│信息   │  │  统一附件上传区              │  │
│      │  └────────────────────────────┘  │
│      │  [保存草稿] [提交]                │
└──────┴───────────────────────────────────┘
```

**锚点导航行为**：

- 点击锚点 → 右侧平滑滚动到对应分组的 DOM 位置
- 右侧滚动时 → 根据当前可视区域高亮对应锚点（IntersectionObserver）
- 分组标题用 `id` 属性作为滚动锚点

**表单分组**（14 个分组，详见需求文档第 3 节和第 6.2 节）：

1. 基础信息（7 字段）
2. 端口信息（6 字段）
3. 区域信息（3 字段）
4. 企业信息（6 字段）
5. 责任人信息（5 字段）
6. 经办人信息（5 字段）
7. 授权信息（5 字段）
8. 业务信息（7 字段）
9. 签名信息（5 字段）
10. 机房信息（3 字段）
11. 模板信息（可增删子表，4 字段/行）
12. 引流信息（可增删子表，7 字段/行）
13. 附件信息（7 个上传项）
14. 运营商扩展字段（动态）

**关键交互**：

- **运营商联动**：选择运营商后，第 14 组"运营商扩展字段"动态显示该运营商特有字段，其余分组字段标记必填/可选
- **端口选择器**：主端口号、子端口号为可搜索的 Select（或 Combobox），数据来自端口管理 Mock 数据，支持输入搜索，也支持手动输入不在列表中的端口号
- **模板信息子表**：`<Table>` 内嵌可编辑行，底部"添加模板"按钮，每行可删除。每个报备可关联 0-N 个模板
- **引流信息子表**：同上，0-N 条引流信息
- **附件上传区**：统一在页面底部，每个附件项显示：附件名称、上传状态（未上传/已上传/缺失/格式异常）、上传按钮、预览链接
- **保存草稿**和**提交**两种提交方式，调用不同的接口或传不同的 status 参数

**Hook 设计**：

```typescript
// 编辑模式：加载已有数据填充表单
useRecord(id) → useQuery

// 新增/编辑提交
useCreateRecord() → useMutation → onSuccess: navigate to detail or list
useUpdateRecord() → useMutation → onSuccess: navigate to detail or list

// 端口搜索（用于端口选择器）
usePortSearch(query: string, carrier?: string) → useQuery
```

**编辑模式**：路由 `/records/$recordId/edit`，先 `useRecord(id)` 获取数据填充表单默认值，提交时调用 `useUpdateRecord`。

**复制新增**：路由 `/records/create?copy_from=$id`，先获取源数据填充表单，但不带 `id`，提交时调用 `useCreateRecord`。

---

### 4. 报备详情 (`/_authenticated/records/$recordId/detail.tsx`)

**页面结构**：顶部操作栏 + Tabs 分组展示。

```
┌──────────────────────────────────────────┐
│  ← 返回列表    报备详情 #REC-20260702-001 │
│  [编辑] [导出] [变更记录]                 │
├──────────────────────────────────────────┤
│  [基础信息] [端口与企业] [联系人与授权]    │
│  [业务与签名] [模板/引流] [附件] [变更记录]│
├──────────────────────────────────────────┤
│  当前 Tab 内容（描述列表）                 │
│  字段名: 字段值                           │
│  字段名: 字段值                           │
│  ...                                      │
└──────────────────────────────────────────┘
```

**Tab 内容**：每个 Tab 内用 Description List（`<dl>` 或 ShadcnUI 无此组件，用 grid 布局模拟）展示字段。只读，不可编辑。附件 Tab 内提供文件预览/下载链接。

**数据获取**：`useRecord(id)` 获取完整报备数据。

---

### 5. 主端口管理 (`/_authenticated/ports/main/index.tsx`)

**类似报备列表的结构**：搜索区 + 工具栏 + 表格 + 分页。

**列表字段**：主端口号、运营商、码号使用范围、接入省、接入地市、端口类型、状态、已关联子端口数、创建时间、操作。

**操作**：查看详情 → `/ports/main/$portId/detail`、编辑（Dialog）、新增子端口 → 子端口新增页面并预填主端口、查看关联报备 → 跳转报备列表并筛选此端口、停用。

**主端口详情**：Tabs（基础信息、子端口列表、关联报备、使用记录）。

---

### 6. 子端口管理 (`/_authenticated/ports/sub/index.tsx`)

**列表字段**：子端口号、所属主端口、运营商、企业名称、短信签名、业务类型、状态、关联报备编号、更新时间、操作。

**状态标签**：空闲=蓝色、已分配=橙色、已报备=绿色、停用=灰色。

**操作**：查看详情 → `/ports/sub/$portId/detail`、编辑、解绑（确认 Dialog）。

**子端口详情**：基础信息 + 关联报备 + 使用记录。

---

### 7. API 接入数据展示 (`/_authenticated/api-data/index.tsx`)

**页面结构**：搜索 + 表格 + 分页。

**列表字段**：接入时间、接口名称、数据类型、企业名称、主端口号、子端口号、运营商、处理状态、错误原因。

**处理状态标签**：待处理=蓝色、已入库=绿色、校验失败=红色、已忽略=灰色。

**搜索条件**：接口名称（Select）、数据类型（Select）、处理状态（Select）、企业名称（输入框）、接入时间范围。

**操作**：查看详情（Dialog 展示原始 JSON 数据）、标记为已忽略、重新处理。

---

## 共享组件

| 组件 | 用途 | 复用页面 |
|------|------|---------|
| `DataTable` | 基于 @tanstack/react-table 的通用表格，支持排序、选择、分页 | 所有列表页 |
| `SearchForm` | 基础搜索 + 高级搜索折叠，接收字段配置 | 报备列表、端口列表、API 数据 |
| `StatusTag` | 统一状态标签（颜色映射可配置） | 所有有状态字段的页面 |
| `AnchorFormLayout` | 左侧锚点 + 右侧表单，接收分组配置 | 报备新增/编辑 |
| `FileUploadGroup` | 附件上传区，展示上传状态列表 | 报备新增/编辑、报备详情 |
| `SubTableField` | 可增删行的内嵌子表 | 报备表单中的模板信息、引流信息 |
| `PortSelector` | 可搜索的端口选择器（Combobox） | 报备表单中的端口字段 |
| `ConfirmDialog` | 已有组件 `confirm-dialog.tsx` | 删除、解绑等操作 |
| `StatCard` | 统计卡片，显示数值+标题+趋势图标 | 工作台 |

**组件设计原则**：

- 每个组件通过 props 配置而非硬编码业务逻辑
- 表格列定义、搜索字段、锚点分组等通过配置数组传入
- 避免过度抽象 — 能用两次再抽组件，但第一阶段预判复用场景明确的可以直接做共享组件

---

## Mock 数据策略

### 目录结构

```
src/lib/mock/
  handlers.ts          # MSW handlers，按模块组织
  data/
    records.ts         # 报备 mock 数据（~50 条，覆盖各种状态）
    ports.ts           # 主端口 + 子端口 mock 数据
    api-data.ts        # API 接入数据 mock
    dashboard.ts       # 工作台统计 mock
  utils.ts             # 分页、筛选、排序等 mock 工具函数
```

### Mock 数据要点

- 报备数据覆盖三种运营商（移动/联通/电信），多种状态（草稿/已报备/变更中/停用）
- 端口数据包含空闲、使用中、停用状态，主端口关联 0-N 个子端口
- 统计数据与报备/端口数据保持一致（总数对得上）
- 每条 mock 数据有唯一 ID，支持按 ID 查询
- 列表接口支持分页（page/pageSize）、筛选、排序参数

### 启用方式

在 `src/main.tsx` 中条件启用：

```typescript
if (import.meta.env.DEV) {
  const { worker } = await import('./lib/mock/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

如果后续不想引入 MSW 依赖，改用 TanStack Query 的 `placeholderData` + 本地 json 数据文件也可，但 MSW 更接近真实网络请求，后期切换成本更低。

---

## 文件结构总览

```
frontend/src/
  components/
    ui/                         # ShadcnUI（已有）
    shared/                     # 新增：业务通用组件
      data-table/
        data-table.tsx          # 通用表格组件
        data-table-toolbar.tsx  # 表格工具栏
      search-form.tsx           # 搜索+高级搜索表单
      status-tag.tsx            # 状态标签
      anchor-form-layout.tsx    # 锚点表单布局
      file-upload-group.tsx     # 附件上传区
      sub-table-field.tsx       # 内嵌可编辑子表
      port-selector.tsx         # 端口搜索选择器
      stat-card.tsx             # 统计卡片
      index.ts                  # 统一导出
    layout/
      data/
        sidebar-data.ts         # 更新菜单项
  features/
    dashboard/
      components/
        stat-cards.tsx          # 统计卡片行
        trend-chart.tsx         # 趋势折线图
        carrier-pie-chart.tsx   # 运营商饼图
        pending-list.tsx        # 待处理事项
        recent-changes.tsx      # 最近变更
      index.tsx                 # 工作台页面
    records/
      components/
        records-table.tsx       # 报备列表表格
        record-search-form.tsx  # 报备搜索表单
        record-form/            # 报备表单（新增/编辑共用）
          record-form.tsx       # 表单主组件
          sections/             # 14 个分组 section 组件
            basic-info-section.tsx
            port-info-section.tsx
            ...
        record-detail/          # 报备详情
          record-detail.tsx     # 详情主组件
          tabs/                 # 各 Tab 内容
            basic-info-tab.tsx
            ...
      index.tsx                 # 报备列表页
    ports/
      main/
        components/
          main-port-table.tsx
          main-port-detail.tsx
        index.tsx
      sub/
        components/
          sub-port-table.tsx
          sub-port-detail.tsx
        index.tsx
    api-data/
      components/
        api-data-table.tsx
      index.tsx
  routes/
    _authenticated/
      index.tsx                 # 工作台
      records/
        index.tsx               # 报备列表
        create.tsx              # 报备新增
        $recordId/
          detail.tsx            # 报备详情
          edit.tsx              # 报备编辑
      ports/
        main/
          index.tsx
          $portId/detail.tsx
        sub/
          index.tsx
          $portId/detail.tsx
      api-data/
        index.tsx
  hooks/
    use-records.ts              # 报备 CRUD hooks
    use-ports.ts                # 端口 CRUD hooks
    use-api-data.ts             # API 接入数据 hooks
    use-dashboard.ts            # 工作台数据 hooks
  lib/
    api/
      records.ts                # 报备 API 函数
      ports.ts                  # 端口 API 函数
      api-data.ts               # API 接入数据 API 函数
      dashboard.ts              # 工作台 API 函数
    mock/
      handlers.ts
      browser.ts                # MSW browser setup
      data/
        records.ts
        ports.ts
        api-data.ts
        dashboard.ts
      utils.ts
```

---

## 依赖

MSW 需要新增为 devDependency：

```bash
pnpm add -D msw
```

其余依赖（recharts、@tanstack/react-table、react-hook-form、zod 等）已在 package.json 中。

---

## 验收标准

1. 工作台：6 个统计卡片数据正确，两个图表可渲染，待处理事项可点击跳转
2. 报备列表：搜索/高级搜索/排序/分页正常工作，单条和批量操作按钮可见
3. 报备新增/编辑：14 个分组表单可填写，锚点导航可点击跳转和高亮，模板/引流子表可增删行，附件上传区显示状态
4. 报备详情：Tabs 切换展示各分组字段，只读模式
5. 主端口管理：列表 CRUD 交互流畅，详情 Tab 正常
6. 子端口管理：同上
7. API 接入数据：列表搜索分页正常，处理状态标签正确
8. 所有页面在中等屏幕（1440px）下布局正常，无横向溢出
9. 所有数据来自 Mock，页面间数据一致（如同一报备 ID 在列表和详情中数据匹配）
