import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getPortInfos, deletePortInfo, downloadPortInfoTemplate, importPortInfos } from '@/lib/api/port-info'
import type { RowSelectionState } from '@tanstack/react-table'
import { ImportDialog } from '@/components/shared/import-dialog'
import { PROVINCES } from '@/components/shared/province-city-fields'
import { formatCN } from '@/lib/time'
import type { PortInfo } from '@/lib/api/types'
import { PortInfoDialog } from './components/port-info-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const PAGE_SIZE = 10
const CARRIERS = ['中国移动', '中国联通', '中国电信', '中国广电']

export function PortInfoPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PortInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PortInfo | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [searchInputs, setSearchInputs] = useState({ carrier: '', province: '', business_type: '' })
  const [appliedFilters, setAppliedFilters] = useState<{ carrier?: string; province?: string; business_type?: string }>({})
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['port-info', { page, page_size: PAGE_SIZE, ...appliedFilters }],
    queryFn: () => getPortInfos({ page, page_size: PAGE_SIZE, ...appliedFilters }),
  })

  const handleSearch = () => {
    setAppliedFilters({
      carrier: searchInputs.carrier || undefined,
      province: searchInputs.province || undefined,
      business_type: searchInputs.business_type.trim() || undefined,
    })
    setPage(1)
  }

  const handleReset = () => {
    setSearchInputs({ carrier: '', province: '', business_type: '' })
    setAppliedFilters({})
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePortInfo(id),
    onSuccess: () => {
      toast.success('端口信息删除成功')
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('端口信息删除失败'),
  })

  const portInfos = data?.data ?? []
  const total = data?.total ?? 0

  const selectedIds = Object.keys(rowSelection)
  const selectedCount = selectedIds.length

  const handleBatchDelete = async () => {
    try {
      await Promise.all(selectedIds.map((idx) => deletePortInfo(portInfos[Number(idx)]?.id)))
      toast.success(`已删除 ${selectedCount} 条记录`)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
    } catch {
      toast.error('批量删除失败')
    }
  }

  const columns = useMemo<ColumnDef<PortInfo>[]>(() => [
    {
      id: 'port_number',
      header: '端口号',
      accessorFn: (row) => row.main_port_number || row.sub_port_number || '-',
    },
    {
      accessorKey: 'carrier',
      header: '运营商',
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge>,
    },
    { accessorKey: 'business_type', header: '业务类型', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'province', header: '省份', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'city', header: '城市', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'sms_signature', header: '短信签名', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'port_type', header: '端口类型', cell: ({ getValue }) => getValue() || '-' },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ getValue }) => formatCN(getValue() as string),
    },
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
  ], [])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>端口信息管理</h2>
            <p className='text-muted-foreground'>
              管理端口详细信息（运营商、端口号、业务类型、签名等）
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              新建端口信息
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              导入数据
            </Button>
            <Button variant="outline" onClick={() => downloadPortInfoTemplate()}>
              <Download className="mr-2 h-4 w-4" />
              下载模板
            </Button>
            {selectedCount > 0 && (
              <Button variant="destructive" onClick={handleBatchDelete}>
                <Trash2 className="mr-2 h-4 w-4" />删除 ({selectedCount})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 mt-4 flex flex-wrap items-end gap-3 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">运营商</label>
            <Select
              value={searchInputs.carrier}
              onValueChange={(v) => setSearchInputs((s) => ({ ...s, carrier: v === '__all__' ? '' : v }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">接入省</label>
            <Select
              value={searchInputs.province}
              onValueChange={(v) => setSearchInputs((s) => ({ ...s, province: v === '__all__' ? '' : v }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSearch}>
              搜索
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={portInfos}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          enableRowSelection
          onRowSelectionChange={setRowSelection}
        />
      </Main>

      <PortInfoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        portInfo={selected}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此端口信息吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="导入端口信息"
        onDownloadTemplate={downloadPortInfoTemplate}
        onImport={importPortInfos}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
      />
    </>
  )
}

export default PortInfoPage
