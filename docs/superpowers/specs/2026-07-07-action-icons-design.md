# 操作列图标化 & 表格视觉现代化

**日期**: 2026-07-07
**范围**: 前端 4 个文件
**目标**: 让报备管理、资质管理、端口管理三个页面的操作列更生动;同时统一优化空状态、搜索框、运营商 Badge 等细节,提升现代感。

## 背景

当前三个业务页面的表格操作列使用纯文字 `Button variant="ghost"`(部分有图标,部分没有),与已现代化的 `users-columns.tsx` 风格不一致。空状态、搜索框也偏简陋。

## 设计

### 1. 操作列统一规范(核心改动)

**容器**: `<div className="flex items-center gap-1">`
**按钮**: `<Button variant="ghost" size="sm" className="h-8">`
**图标尺寸**: `h-4 w-4`(替代当前的 h-3 w-3)
**图标-文字间距**: 用 `<span className="flex items-center gap-1.5">` 包裹,移除原 `mr-1`

**操作 → 图标 → 颜色映射**:

| 操作 | 图标 | className |
|------|------|-----------|
| 查看 / 详情 | `Eye` | (默认) |
| 编辑 | `Pencil` | `text-blue-600 hover:text-blue-700 hover:bg-blue-50` |
| 下载 | `Download` | (默认) |
| 删除 | `Trash2` | `text-red-600 hover:text-red-700 hover:bg-red-50` |

**改动点**:

- `frontend/src/features/filing-management/index.tsx` L134-149
  - 查看: 图标尺寸 h-3→h-4
  - 下载: 新增 `<Download />`
  - 删除: 新增 `<Trash2 />`(从 lucide-react 导入)

- `frontend/src/features/qualifications/index.tsx` L106-122
  - 详情: 新增 `<Eye />`
  - 编辑: 新增 `<Pencil />`
  - 删除: 新增 `<Trash2 />`

- `frontend/src/features/port-info/index.tsx` L124-137
  - 编辑: 新增 `<Pencil />`
  - 删除: 新增 `<Trash2 />`

### 2. 运营商 Badge 颜色编码(端口管理)

`port-info/index.tsx` L110-113 的"运营商"列:保留 `Badge variant="outline"`,但按运营商名称着色文字。

**映射**:

| 运营商 | 文字色 | className |
|--------|--------|-----------|
| 移动 | 蓝 | `text-blue-600 border-blue-200` |
| 联通 | 红 | `text-red-600 border-red-200` |
| 电信 | 绿 | `text-green-600 border-green-200` |
| 其他 | 默认 | (默认 outline) |

(注:报备管理、资质管理当前无 Badge 列,本次不动)

### 3. 空状态优化

`frontend/src/components/shared/data-table/data-table.tsx` L96-101:

```tsx
<TableCell colSpan={columns.length} className="h-32 text-center">
  <div className="flex flex-col items-center gap-2 py-4">
    <Inbox className="h-10 w-10 text-muted-foreground/40" />
    <p className="text-sm font-medium">暂无数据</p>
    <p className="text-xs text-muted-foreground">尝试调整筛选条件或新建记录</p>
  </div>
</TableCell>
```

需要 `import { Inbox } from 'lucide-react'`。所有使用 DataTable 的页面自动受益。

### 4. 搜索栏关键词输入框加搜索图标前缀

**报备管理** L207-216(关键词框)、**资质管理**(企业名称、证件号码框):

```tsx
<div className="relative">
  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="搜索任务名称"
    value={keyword}
    onChange={...}
    className="w-48 pl-8"
  />
</div>
```

(顶层 `Search` 图标来自 `@/components/search`,此处使用 lucide-react 的 `Search`,二者无冲突)

**端口管理**:无关键词输入框,跳过。

## 影响文件清单

1. `frontend/src/features/filing-management/index.tsx` — 操作列 + 搜索框
2. `frontend/src/features/qualifications/index.tsx` — 操作列 + 2 个搜索框
3. `frontend/src/features/port-info/index.tsx` — 操作列 + 运营商 Badge
4. `frontend/src/components/shared/data-table/data-table.tsx` — 空状态

## 不在本次范围

- 报备管理、资质管理暂不加 Badge(当前无 Badge 列,加入会扩大范围)
- 不改 users 角色管理页面(已是 DropdownMenu 风格)
- 不动 Datatable 排序、分页等其它逻辑
- 不引入新依赖

## 验证

- 启动 `pnpm run dev`,三个页面逐项查看操作列图标+文字、颜色
- 制造空数据场景(过滤无结果)查看空状态
- 端口管理运营商列移动/联通/电信三色显示正确
- 运行 `pnpm run lint` 通过
