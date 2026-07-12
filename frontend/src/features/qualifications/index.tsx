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
import { Download, Eye, Pencil, Plus, RefreshCw, Search as SearchIcon, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getQualifications, deleteQualification, downloadQualificationTemplate, importQualifications } from '@/lib/api/qualifications'
import type { RowSelectionState } from '@tanstack/react-table'
import type { QualificationInfo } from '@/lib/api/types'
import { QualificationDialog } from './components/qualification-dialog'
import { QualificationDetailDialog } from './components/qualification-detail-dialog'
import { ImportDialog } from '@/components/shared/import-dialog'
import { formatCN } from '@/lib/time'
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

export function QualificationsPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<QualificationInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<QualificationInfo | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<QualificationInfo | undefined>()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [searchInputs, setSearchInputs] = useState({ enterprise_name: '', cert_number: '', signature: '' })
  const [appliedFilters, setAppliedFilters] = useState<{ enterprise_name?: string; cert_number?: string; signature?: string }>({})
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['qualifications', { page, page_size: PAGE_SIZE, ...appliedFilters }],
    queryFn: () => getQualifications({ page, page_size: PAGE_SIZE, ...appliedFilters }),
  })

  const handleSearch = () => {
    setAppliedFilters({
      enterprise_name: searchInputs.enterprise_name.trim() || undefined,
      cert_number: searchInputs.cert_number.trim() || undefined,
      signature: searchInputs.signature.trim() || undefined,
    })
    setPage(1)
  }

  const handleReset = () => {
    setSearchInputs({ enterprise_name: '', cert_number: '', signature: '' })
    setAppliedFilters({})
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQualification(id),
    onSuccess: () => {
      toast.success('资质信息删除成功')
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('资质信息删除失败'),
  })

  const qualifications = data?.data ?? []
  const total = data?.total ?? 0

  const selectedIds = Object.keys(rowSelection)
  const selectedCount = selectedIds.length

  const handleBatchDelete = async () => {
    try {
      await Promise.all(selectedIds.map((idx) => deleteQualification(qualifications[Number(idx)]?.id)))
      toast.success(`已删除 ${selectedCount} 条记录`)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
    } catch {
      toast.error('批量删除失败')
    }
  }

  const columns = useMemo<ColumnDef<QualificationInfo>[]>(() => [
    { accessorKey: 'enterprise_name', header: '企业名称' },
    { accessorKey: 'legal_representative_name', header: '法人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'responsible_name', header: '责任人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'signature', header: '签名', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'business_type', header: '业务类型', cell: ({ getValue }) => getValue() || '-' },
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
            <h2 className='text-2xl font-bold tracking-tight'>资质管理</h2>
            <p className='text-muted-foreground'>
              管理企业资质信息（企业名称、证件、负责人、经办人等）
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              新建资质
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              导入数据
            </Button>
            <Button variant="outline" onClick={() => downloadQualificationTemplate()}>
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['qualifications'] })}
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
            <label className="text-sm text-muted-foreground">签名</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索签名"
                value={searchInputs.signature}
                onChange={(e) => setSearchInputs((s) => ({ ...s, signature: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">企业名称</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索企业名称"
                value={searchInputs.enterprise_name}
                onChange={(e) => setSearchInputs((s) => ({ ...s, enterprise_name: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">证件号码</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索证件号码"
                value={searchInputs.cert_number}
                onChange={(e) => setSearchInputs((s) => ({ ...s, cert_number: e.target.value }))}
                className="w-56 pl-8"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              />
            </div>
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
          data={qualifications}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          enableRowSelection
          onRowSelectionChange={setRowSelection}
        />
      </Main>

      <QualificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        qualification={selected}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['qualifications'] })}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="资质信息"
        onDownloadTemplate={downloadQualificationTemplate}
        onImport={importQualifications}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['qualifications'] })}
      />

      {detailTarget && (
        <QualificationDetailDialog
          open={!!detailTarget}
          onOpenChange={(open) => { if (!open) setDetailTarget(undefined) }}
          qualification={detailTarget}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资质 "{toDelete?.enterprise_name}" 吗？此操作不可撤销。
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
    </>
  )
}

export default QualificationsPage
