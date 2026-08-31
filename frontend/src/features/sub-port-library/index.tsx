import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import { Download, FileX, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSubPortRecords,
  deleteSubPortRecord,
  batchDeleteSubPortRecords,
  downloadSubPortTemplate,
  importSubPorts,
  previewSubPortsImport,
  SUB_PORT_STATUSES,
} from '@/lib/api/sub-port-library'
import type { SubPortRecord } from '@/lib/api/sub-port-library'
import { getExportGroups } from '@/lib/api/export-groups'
import type { ExportGroup } from '@/lib/api/types'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { usePermissions } from '@/hooks/use-permissions'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { ImportDialog } from '@/components/shared/import-dialog'
import { StatusTag } from '@/components/shared/status-tag'
import { ThemeSwitch } from '@/components/theme-switch'
import { ImportDeleteDialog } from './components/import-delete-dialog'
import { SubPortDialog } from './components/sub-port-dialog'

const PAGE_SIZE = 10
const GROUP_ID_STORAGE_KEY = 'sub-port-library-group-id'

const STATUS_COLOR_MAP: Record<string, string> = {
  在线:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  下线: 'border-slate-200 bg-slate-50 text-slate-700',
  整改:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
}

export function SubPortLibraryPage() {
  const [groupId, setGroupId] = useState<string>(
    () => localStorage.getItem(GROUP_ID_STORAGE_KEY) || ''
  )
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [mainPortFilter, setMainPortFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SubPortRecord | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SubPortRecord | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const { has } = usePermissions()

  const groupsQuery = useQuery({
    queryKey: ['export-groups'],
    queryFn: getExportGroups,
  })
  const groups: ExportGroup[] = useMemo(
    () => groupsQuery.data?.data ?? [],
    [groupsQuery.data]
  )

  // 默认选中第一个字段组；持久化的 groupId 不在列表中时回退
  const selectedGroup: ExportGroup | undefined = useMemo(() => {
    return groups.find((g) => g.id === groupId) ?? groups[0]
  }, [groups, groupId])

  useEffect(() => {
    if (groups.length > 0) {
      if (!groups.some((g) => g.id === groupId)) {
        setGroupId(groups[0].id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups])

  const handleGroupChange = (id: string) => {
    setGroupId(id)
    localStorage.setItem(GROUP_ID_STORAGE_KEY, id)
    setRowSelection({})
    setPage(1)
  }

  const filters = {
    page,
    page_size: PAGE_SIZE,
    keyword: keyword || undefined,
    status: statusFilter !== '__all__' ? statusFilter : undefined,
    main_port_number: mainPortFilter || undefined,
  }

  const recordsQuery = useQuery({
    queryKey: ['sub-port-library', selectedGroup?.id ?? '', filters],
    queryFn: () => getSubPortRecords(filters),
    enabled: !!selectedGroup,
  })

  const records = recordsQuery.data?.data ?? []
  const total = recordsQuery.data?.total ?? 0

  const selectedIds = Object.keys(rowSelection).filter((id) =>
    records.some((r) => r.id === id)
  )
  const selectedCount = selectedIds.length

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['sub-port-library'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubPortRecord(id),
    onSuccess: () => {
      toast.success('子端口记录删除成功')
      invalidate()
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('子端口记录删除失败'),
  })

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => batchDeleteSubPortRecords(ids),
    onSuccess: (result) => {
      toast.success(`已删除 ${result.deleted_count} 条记录`)
      setRowSelection({})
      invalidate()
    },
    onError: () => toast.error('批量删除失败'),
  })

  const sortedFields = useMemo(() => {
    if (!selectedGroup) return []
    return [...selectedGroup.fields].sort((a, b) => a.sort_order - b.sort_order)
  }, [selectedGroup])

  const columns = useMemo<ColumnDef<SubPortRecord>[]>(() => {
    const base: ColumnDef<SubPortRecord>[] = [
      {
        accessorKey: 'main_port_number',
        header: '主端口号',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'sub_port_number',
        header: '子端口号',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ getValue }) => (
          <StatusTag status={getValue() as string} customMap={STATUS_COLOR_MAP} />
        ),
      },
    ]
    const dynamic: ColumnDef<SubPortRecord>[] = sortedFields.map((field) => ({
      id: `field_${field.field_name}`,
      header: field.field_label,
      cell: ({ row }) => row.original.field_values?.[field.field_name] || '-',
    }))
    const tail: ColumnDef<SubPortRecord>[] = [
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ getValue }) => formatCN(getValue() as string),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            {has('sub_port:write') && (
              <ActionIconButton
                label='编辑'
                icon='edit'
                tone='edit'
                onClick={() => {
                  setEditing(row.original)
                  setDialogOpen(true)
                }}
              />
            )}
            {has('sub_port:write') && (
              <ActionIconButton
                label='删除'
                icon='delete'
                tone='delete'
                onClick={() => {
                  setToDelete(row.original)
                  setDeleteDialogOpen(true)
                }}
              />
            )}
          </div>
        ),
      },
    ]
    return [...base, ...dynamic, ...tail]
  }, [sortedFields, has])

  if (groupsQuery.isLoading) {
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
          <p className='text-muted-foreground py-10 text-center text-sm'>加载中...</p>
        </Main>
      </>
    )
  }

  if (!selectedGroup) {
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
          <div className='flex flex-col items-center justify-center py-24 text-center'>
            <FileX className='text-muted-foreground h-12 w-12' />
            <p className='mt-4 text-lg font-medium'>暂无字段组</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              请先在「报备管理 - 字段组」中创建字段组，再使用子端口库
            </p>
          </div>
        </Main>
      </>
    )
  }

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
            <h2 className='text-2xl font-bold tracking-tight'>子端口库</h2>
            <p className='text-muted-foreground'>
              按主端口号管理子端口状态与自定义信息
            </p>
          </div>
          <div className='flex space-x-2'>
            {has('sub_port:write') && (
              <Button
                onClick={() => {
                  setEditing(undefined)
                  setDialogOpen(true)
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                新增子端口
              </Button>
            )}
            {has('sub_port:import') && (
              <>
                <Button variant='outline' onClick={() => setImportDialogOpen(true)}>
                  <Upload className='mr-2 h-4 w-4' />
                  导入数据
                </Button>
                <Button
                  variant='outline'
                  onClick={() => downloadSubPortTemplate(selectedGroup.id)}
                >
                  <Download className='mr-2 h-4 w-4' />
                  下载模板
                </Button>
                <Button variant='outline' onClick={() => setDeleteListDialogOpen(true)}>
                  <FileX className='mr-2 h-4 w-4' />
                  导入删除清单
                </Button>
              </>
            )}
            {has('sub_port:write') && selectedCount > 0 && (
              <Button
                variant='destructive'
                onClick={() => batchDeleteMutation.mutate(selectedIds)}
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                删除 ({selectedCount})
              </Button>
            )}
            <Button
              variant='outline'
              onClick={invalidate}
              disabled={recordsQuery.isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${recordsQuery.isLoading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='border-border/80 bg-card mt-4 mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4 shadow-sm shadow-slate-950/5'>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>字段组</label>
            <Select value={selectedGroup.id} onValueChange={handleGroupChange}>
              <SelectTrigger className='w-52'>
                <SelectValue placeholder='选择字段组' />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>关键词</label>
            <Input
              placeholder='搜索主/子端口号'
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
              className='w-44'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>状态</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部</SelectItem>
                {SUB_PORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>主端口号</label>
            <Input
              placeholder='精确匹配主端口号'
              value={mainPortFilter}
              onChange={(e) => {
                setMainPortFilter(e.target.value)
                setPage(1)
              }}
              className='w-44'
            />
          </div>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setKeyword('')
                setStatusFilter('__all__')
                setMainPortFilter('')
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={records}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          enableRowSelection
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
        />
      </Main>

      <SubPortDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(undefined)
        }}
        record={editing}
        group={selectedGroup}
        onSuccess={invalidate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除子端口 {toDelete?.sub_port_number || ''} 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className='bg-red-600 hover:bg-red-700'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title='子端口数据'
        onDownloadTemplate={() => downloadSubPortTemplate(selectedGroup.id)}
        onImport={(file) => importSubPorts(file, selectedGroup.id)}
        onPreview={(file) => previewSubPortsImport(file, selectedGroup.id)}
        onSuccess={invalidate}
      />

      <ImportDeleteDialog
        open={deleteListDialogOpen}
        onOpenChange={setDeleteListDialogOpen}
        onSuccess={invalidate}
      />
    </>
  )
}

export default SubPortLibraryPage
