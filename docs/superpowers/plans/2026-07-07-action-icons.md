# 操作列图标化 & 表格视觉现代化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让报备管理、资质管理、端口管理三个页面的表格操作列统一为"图标+文字"风格，同时优化空状态、关键词搜索框、运营商 Badge 等细节，提升现代感。

**Architecture:** 纯前端 UI 微调，无业务逻辑改动。共触及 4 个文件，每个文件独立成一个任务。data-table 的空状态改造让所有列表页自动受益。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + lucide-react 0.523

## Global Constraints

- 项目无 UI 组件测试框架（package.json 中无 vitest/jest），每个任务用 `pnpm run lint` + `pnpm run build` + 人工浏览器验证替代自动化测试
- 提交信息使用中文，**不得包含 AI 署名**（参见全局 CLAUDE.md）
- 新功能默认直接在 main 分支开发（参见项目 memory）
- lucide-react 已是依赖（0.523.0），本次新增图标（`Pencil`, `Trash2`, `Inbox`, `Search`）均无需安装
- 涉及文件均已有相关 import 习惯，沿用相对路径 `@/components/...`、`@/features/...`、`lucide-react`

---

## File Structure

| 文件 | 责任 | 操作 |
|------|------|------|
| `frontend/src/components/shared/data-table/data-table.tsx` | 通用表格组件（空状态渲染） | Modify |
| `frontend/src/features/filing-management/index.tsx` | 报备管理页面（操作列、关键词搜索框） | Modify |
| `frontend/src/features/qualifications/index.tsx` | 资质管理页面（操作列、企业名称/证件号码搜索框） | Modify |
| `frontend/src/features/port-info/index.tsx` | 端口管理页面（操作列、运营商 Badge 着色） | Modify |

---

## Task 1: DataTable 空状态优化

**Files:**
- Modify: `frontend/src/components/shared/data-table/data-table.tsx` L1-19（imports）、L96-101（空状态块）

**Interfaces:**
- Consumes: 无
- Produces: 视觉效果，对外 API 不变

- [ ] **Step 1: 修改 imports，新增 `Inbox` 图标**

修改 `frontend/src/components/shared/data-table/data-table.tsx` 第 18-19 行（在 `import { Button } from '@/components/ui/button'` 后面），加入：

```tsx
import { Inbox } from 'lucide-react'
```

最终的 import 块尾部应为：

```tsx
import { Button } from '@/components/ui/button'
import { Inbox } from 'lucide-react'
import { useState } from 'react'
```

- [ ] **Step 2: 替换空状态渲染**

将 `frontend/src/components/shared/data-table/data-table.tsx` 中的：

```tsx
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
```

替换为：

```tsx
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Inbox className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">暂无数据</p>
                    <p className="text-xs text-muted-foreground">尝试调整筛选条件或新建记录</p>
                  </div>
                </TableCell>
              </TableRow>
```

- [ ] **Step 3: 运行 lint 验证**

Run:
```bash
cd frontend && pnpm run lint
```
Expected: 无新增错误（已有的无关警告可忽略）

- [ ] **Step 4: 运行 build 验证**

Run:
```bash
cd frontend && pnpm run build
```
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/data-table/data-table.tsx
git commit -m "feat(data-table): 优化空状态显示，增加图标和副文本"
```

---

## Task 2: 报备管理页面（操作列 + 关键词搜索框）

**Files:**
- Modify: `frontend/src/features/filing-management/index.tsx`
  - L20: imports 增补 `Trash2`
  - L134-149: 操作列按钮加图标+颜色
  - L207-216: 关键词输入框加 Search 图标前缀

**Interfaces:**
- Consumes: 无
- Produces: 视觉效果，对外 API 不变

- [ ] **Step 1: 修改 lucide-react imports**

将 `frontend/src/features/filing-management/index.tsx` 第 20 行：

```tsx
import { Plus, RefreshCw, Eye, Download } from 'lucide-react'
```

改为：

```tsx
import { Plus, RefreshCw, Eye, Download, Trash2, Search } from 'lucide-react'
```

- [ ] **Step 2: 改造操作列**

将 `frontend/src/features/filing-management/index.tsx` 第 133-149 行（actions 列）：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(row.original.id)}>
            <Eye className="mr-1 h-3 w-3" />查看
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(row.original.id)}>
            下载
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original.id)}>
            删除
          </Button>
        </div>
      ),
    },
```

替换为：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setDetailId(row.original.id)}
          >
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />查看
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(row.original.id)}
          >
            <span className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />下载
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteId(row.original.id)}
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />删除
            </span>
          </Button>
        </div>
      ),
    },
```

- [ ] **Step 3: 关键词输入框加 Search 图标前缀**

将 `frontend/src/features/filing-management/index.tsx` 第 207-216 行（关键词输入框块）：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">关键词</label>
            <Input
              type="text"
              placeholder="搜索任务名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-48"
            />
          </div>
```

替换为：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">关键词</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索任务名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-48 pl-8"
              />
            </div>
          </div>
```

- [ ] **Step 4: 运行 lint + build 验证**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: 无错误

- [ ] **Step 5: 浏览器人工验证**

```bash
cd frontend && pnpm run dev
```
打开 http://localhost:5173/filing-management
- 操作列：查看（眼睛图标，灰）、下载（下载图标，灰）、删除（垃圾桶图标，红）
- 关键词输入框左侧有放大镜图标
- 输入不存在的关键词搜索，验证空状态显示 Inbox 图标+主副文本

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/filing-management/index.tsx
git commit -m "feat(filing-management): 操作列按钮图标化，关键词搜索框加搜索图标"
```

---

## Task 3: 资质管理页面（操作列 + 2 个搜索框）

**Files:**
- Modify: `frontend/src/features/qualifications/index.tsx`
  - L11: imports 增补 `Eye`, `Pencil`, `Search`
  - L106-122: 操作列按钮加图标+颜色
  - L174-193: 企业名称/证件号码搜索框加 Search 图标前缀

**Interfaces:**
- Consumes: 无
- Produces: 视觉效果，对外 API 不变

- [ ] **Step 1: 修改 lucide-react imports**

将 `frontend/src/features/qualifications/index.tsx` 第 11 行：

```tsx
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
```

改为：

```tsx
import { Download, Eye, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
```

- [ ] **Step 2: 改造操作列**

将 `frontend/src/features/qualifications/index.tsx` 第 106-122 行（actions 列）：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setDetailTarget(row.original) }}>
            详情
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(row.original); setDialogOpen(true) }}>
            编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setToDelete(row.original); setDeleteDialogOpen(true) }}>
            删除
          </Button>
        </div>
      ),
    },
```

替换为：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setDetailTarget(row.original) }}
          >
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />详情
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => { setSelected(row.original); setDialogOpen(true) }}
          >
            <span className="flex items-center gap-1.5">
              <Pencil className="h-4 w-4" />编辑
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => { setToDelete(row.original); setDeleteDialogOpen(true) }}
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />删除
            </span>
          </Button>
        </div>
      ),
    },
```

- [ ] **Step 3: 企业名称搜索框加 Search 图标前缀**

将 `frontend/src/features/qualifications/index.tsx` 第 174-183 行（企业名称输入框块）：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">企业名称</label>
            <Input
              placeholder="搜索企业名称"
              value={searchInputs.enterprise_name}
              onChange={(e) => setSearchInputs((s) => ({ ...s, enterprise_name: e.target.value }))}
              className="w-56"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
```

替换为：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">企业名称</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索企业名称"
                value={searchInputs.enterprise_name}
                onChange={(e) => setSearchInputs((s) => ({ ...s, enterprise_name: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
```

- [ ] **Step 4: 证件号码搜索框加 Search 图标前缀**

将 `frontend/src/features/qualifications/index.tsx` 第 184-193 行（证件号码输入框块）：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">证件号码</label>
            <Input
              placeholder="搜索证件号码"
              value={searchInputs.cert_number}
              onChange={(e) => setSearchInputs((s) => ({ ...s, cert_number: e.target.value }))}
              className="w-56"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
```

替换为：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">证件号码</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索证件号码"
                value={searchInputs.cert_number}
                onChange={(e) => setSearchInputs((s) => ({ ...s, cert_number: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
```

- [ ] **Step 5: 运行 lint + build 验证**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: 无错误

- [ ] **Step 6: 浏览器人工验证**

```bash
cd frontend && pnpm run dev
```
打开 http://localhost:5173/qualifications
- 操作列：详情（眼睛图标，灰）、编辑（铅笔图标，蓝）、删除（垃圾桶图标，红）
- 企业名称/证件号码输入框左侧都有放大镜图标
- 输入不存在的搜索条件，验证空状态显示

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/qualifications/index.tsx
git commit -m "feat(qualifications): 操作列按钮图标化，搜索框加搜索图标"
```

---

## Task 4: 端口管理页面（操作列 + 运营商 Badge 着色）

**Files:**
- Modify: `frontend/src/features/port-info/index.tsx`
  - L19: imports 增补 `Pencil`, `Search`
  - L109-113: 运营商 Badge 按运营商名称着色
  - L124-137: 操作列按钮加图标+颜色
  - L223-232: 业务类型输入框加 Search 图标前缀

**Interfaces:**
- Consumes: 无
- Produces: 视觉效果，对外 API 不变

- [ ] **Step 1: 修改 lucide-react imports**

将 `frontend/src/features/port-info/index.tsx` 第 19 行：

```tsx
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
```

改为：

```tsx
import { Download, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
```

- [ ] **Step 2: 运营商 Badge 按运营商着色**

将 `frontend/src/features/port-info/index.tsx` 第 109-113 行（carrier 列）：

```tsx
    {
      accessorKey: 'carrier',
      header: '运营商',
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge>,
    },
```

替换为：

```tsx
    {
      accessorKey: 'carrier',
      header: '运营商',
      cell: ({ getValue }) => {
        const carrier = getValue() as string
        let cls = ''
        if (carrier === '中国移动') cls = 'text-blue-600 border-blue-200'
        else if (carrier === '中国联通') cls = 'text-red-600 border-red-200'
        else if (carrier === '中国电信') cls = 'text-green-600 border-green-200'
        return <Badge variant="outline" className={cls}>{carrier}</Badge>
      },
    },
```

- [ ] **Step 3: 改造操作列**

将 `frontend/src/features/port-info/index.tsx` 第 124-137 行（actions 列）：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(row.original); setDialogOpen(true) }}>
            编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setToDelete(row.original); setDeleteDialogOpen(true) }}>
            删除
          </Button>
        </div>
      ),
    },
```

替换为：

```tsx
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => { setSelected(row.original); setDialogOpen(true) }}
          >
            <span className="flex items-center gap-1.5">
              <Pencil className="h-4 w-4" />编辑
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => { setToDelete(row.original); setDeleteDialogOpen(true) }}
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />删除
            </span>
          </Button>
        </div>
      ),
    },
```

- [ ] **Step 4: 业务类型搜索框加 Search 图标前缀**

将 `frontend/src/features/port-info/index.tsx` 第 223-232 行（业务类型输入框块）：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">业务类型</label>
            <Input
              placeholder="如 验证码"
              value={searchInputs.business_type}
              onChange={(e) => setSearchInputs((s) => ({ ...s, business_type: e.target.value }))}
              className="w-40"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
```

替换为：

```tsx
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">业务类型</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="如 验证码"
                value={searchInputs.business_type}
                onChange={(e) => setSearchInputs((s) => ({ ...s, business_type: e.target.value }))}
                className="w-40 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
```

- [ ] **Step 5: 运行 lint + build 验证**

Run:
```bash
cd frontend && pnpm run lint && pnpm run build
```
Expected: 无错误

- [ ] **Step 6: 浏览器人工验证**

```bash
cd frontend && pnpm run dev
```
打开 http://localhost:5173/port-info
- 操作列：编辑（铅笔图标，蓝）、删除（垃圾桶图标，红）
- 运营商列：移动=蓝、联通=红、电信=绿
- 业务类型输入框左侧有放大镜图标
- 输入不存在的业务类型搜索，验证空状态显示

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/port-info/index.tsx
git commit -m "feat(port-info): 操作列图标化，运营商 Badge 按品牌着色，业务类型框加搜索图标"
```

---

## Self-Review 检查

### 1. Spec 覆盖检查

| Spec 条目 | 对应 Task |
|-----------|-----------|
| 操作列统一规范（查看/详情/编辑/下载/删除图标+颜色） | Task 2 / 3 / 4 |
| 运营商 Badge 着色（移动蓝、联通红、电信绿） | Task 4 |
| 空状态优化（Inbox 图标 + 主副文本） | Task 1 |
| 关键词搜索框加 Search 图标前缀（报备、资质） | Task 2 / 3 |
| 端口管理无关键词搜索框（业务类型也算搜索框，加上图标） | Task 4 |
| 不动 users、不动报备/资质 Badge 列、不动 Datatable 排序分页 | 不涉及 |

✅ 全部覆盖。

### 2. 占位符扫描

无 TBD/TODO/模糊表述。所有"实现"步骤都有完整代码块，所有"测试"步骤都有具体命令和预期输出。

### 3. 类型一致性检查

- 图标组件名：`Eye`, `Pencil`, `Trash2`, `Download`, `Search`, `Inbox` —— 各 Task 内 import 与使用一致
- 颜色 className：编辑=蓝、删除=红、查看/下载/详情=灰 —— 跨 Task 一致
- 输入框 pl-8 + absolute left-2.5 top-2.5 —— 跨 Task 一致

✅ 无类型不一致。

### 4. 范围检查

4 个 Task 各自独立，互不依赖（Task 1 改的空状态是通用组件，Task 2/3/4 在浏览器验证时会顺便验证到）。

适合单次 plan 实施。
