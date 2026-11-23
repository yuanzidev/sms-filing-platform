import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import { Download, FileX, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getExportGroups } from '@/lib/api/export-groups'
import {
  getSubPortRecords,
  getSubPortFilterOptions,
  deleteSubPortRecord,
  batchDeleteSubPortRecords,
  downloadSubPortTemplate,
  downloadSubPortStatusTemplate,
  downloadSubPortRecords,
  importSubPorts,
  importSubPortStatuses,
  previewSubPortsImport,
  renameMainPort,
  SUB_PORT_STATUSES,
} from '@/lib/api/sub-port-library'
import type { SubPortRecord } from '@/lib/api/sub-port-library'
import type { ExportGroup } from '@/lib/api/types'
import { formatCN } from '@/lib/time'
import { usePermissions } from '@/hooks/use-permissions'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { ImportDialog } from '@/components/shared/import-dialog'
import { StatusTag } from '@/components/shared/status-tag'
import { ThemeSwitch } from '@/components/theme-switch'
import { ImportDeleteDialog } from './components/import-delete-dialog'
import { SubPortDialog } from './components/sub-port-dialog'
import { ValueFilter } from './components/value-filter'
import { getSubPortLibraryFields } from './fields'

const GROUP_ID_STORAGE_KEY = 'sub-port-library-group-id'
const NO_GROUP: ExportGroup = { id: '__none__', name: '不按字段组', description: null, fields: [], created_at: '', updated_at: '' }
const carrierForGroup = (name: string) => {
  const matches = ['联通', '电信', '移动', '广电'].filter((carrier) =>
    name.includes(carrier)
  )
  return matches.length === 1 ? `中国${matches[0]}` : '__all__'
}
const UNICOM_BUSINESS_TYPES = [
  'A01-金融推销（包含贷款理财和保险推销）', 'A02-零售业推销', 'A03-电信业务宣传',
  'A04-网络游戏推广', 'A05-教育培训推销', 'A06-房产中介推销',
  'A07-股票证券推销', 'A08-医疗卫生推销', 'A09-猎头招聘推广',
  'A10-旅游推广', 'A11-其它营销类别', 'B01-操作验证', 'B02-民生服务',
  'B03-业务提醒（非金融类）', 'B04-业务提醒（金融类）', 'B05-还款通知',
  'B06-其他业务管理服务类', 'C01-非应急公益性', 'C02-应急公益性',
]

const STATUS_COLOR_MAP: Record<string, string> = {
  在线: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  下线: 'border-slate-200 bg-slate-50 text-slate-700',
  整改: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
}

export function SubPortLibraryPage() {
  const [groupId, setGroupId] = useState<string>(
    () => localStorage.getItem(GROUP_ID_STORAGE_KEY) || ''
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [fourCategoryFilter, setFourCategoryFilter] = useState('__all__')
  const [carrierFilter, setCarrierFilter] = useState('__auto__')
  const [mainPortFilter, setMainPortFilter] = useState('')
  const [subPortFilter, setSubPortFilter] = useState('')
  const [resourceNameFilter, setResourceNameFilter] = useState('')
  const [selectedSubPorts, setSelectedSubPorts] = useState<string[] | null>(null)
  const [selectedSignatures, setSelectedSignatures] = useState<string[] | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SubPortRecord | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SubPortRecord | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [statusImportDialogOpen, setStatusImportDialogOpen] = useState(false)
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [namingRecord, setNamingRecord] = useState<SubPortRecord | null>(null)
  const [mainPortName, setMainPortName] = useState('')
  const [mainPortCarrier, setMainPortCarrier] = useState('')
  const [unicomBusinessType, setUnicomBusinessType] = useState('__none__')
  const [exportFieldNames, setExportFieldNames] = useState<
    Record<string, boolean>
  >({})
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
  const subPortOptionsQuery = useQuery({
    queryKey: ['sub-port-filter-options', 'sub_port_number'],
    queryFn: () => getSubPortFilterOptions('sub_port_number'),
  })
  const signatureOptionsQuery = useQuery({
    queryKey: ['sub-port-filter-options', 'sms_signature'],
    queryFn: () => getSubPortFilterOptions('sms_signature'),
  })
  const mainPortOptionsQuery = useQuery({
    queryKey: ['sub-port-filter-options', 'main_port_number'],
    queryFn: () => getSubPortFilterOptions('main_port_number'),
  })
  const carrierOptionsQuery = useQuery({
    queryKey: ['sub-port-filter-options', 'carrier'],
    queryFn: () => getSubPortFilterOptions('carrier'),
  })

  // 可清除字段组，直接查看全部子端口。
  const selectedGroup: ExportGroup | undefined = useMemo(() => {
    return groupId === '__none__' ? NO_GROUP : groups.find((g) => g.id === groupId) ?? groups[0] ?? NO_GROUP
  }, [groups, groupId])

  useEffect(() => {
    if (groups.length > 0) {
      if (groupId !== '__none__' && !groups.some((g) => g.id === groupId)) {
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
    setSelectedSubPorts(null)
    setSelectedSignatures(null)
    setCarrierFilter('__auto__')
  }

  const selectedCarrier = carrierFilter === '__auto__'
    ? carrierForGroup(selectedGroup?.name ?? '')
    : carrierFilter
  const filters = {
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    status: statusFilter !== '__all__' ? statusFilter : undefined,
    is_four_category:
      fourCategoryFilter !== '__all__' ? fourCategoryFilter : undefined,
    carrier: selectedCarrier !== '__all__' ? selectedCarrier : undefined,
    main_port_number: mainPortFilter || undefined,
    sub_port_number: subPortFilter || undefined,
    resource_name: resourceNameFilter || undefined,
    sub_port_numbers: selectedSubPorts ?? undefined,
    sms_signatures: selectedSignatures ?? undefined,
  }
  const noValuesSelected =
    selectedSubPorts?.length === 0 || selectedSignatures?.length === 0

  const recordsQuery = useQuery({
    queryKey: ['sub-port-library', selectedGroup?.id ?? '', filters],
    queryFn: () => getSubPortRecords(filters),
    enabled: !!selectedGroup && !noValuesSelected,
  })

  const records = noValuesSelected ? [] : (recordsQuery.data?.data ?? [])
  const total = noValuesSelected ? 0 : (recordsQuery.data?.total ?? 0)

  const selectedIds = Object.keys(rowSelection).filter((id) =>
    records.some((r) => r.id === id)
  )
  const selectedCount = selectedIds.length

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sub-port-library'] }),
      queryClient.invalidateQueries({ queryKey: ['sub-port-filter-options'] }),
    ])

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

  const renameMutation = useMutation({
    mutationFn: () => renameMainPort(
      namingRecord!.main_port_number,
      mainPortCarrier,
      mainPortName,
      namingRecord!.id,
    ),
    onSuccess: () => {
      toast.success('主端口命名已更新')
      setNamingRecord(null)
      invalidate()
    },
    onError: () => toast.error('主端口命名失败'),
  })

  const sortedFields = useMemo(() => {
    if (!selectedGroup) return []
    return getSubPortLibraryFields(selectedGroup)
  }, [selectedGroup])

  useEffect(() => {
    setExportFieldNames((prev) => {
      const next: Record<string, boolean> = {}
      for (const field of sortedFields) {
        next[field.field_name] = prev[field.field_name] ?? true
      }
      return next
    })
  }, [sortedFields])

  const handleExport = async () => {
    if (!selectedGroup || noValuesSelected) return
    const fieldNames = sortedFields
      .filter((field) => exportFieldNames[field.field_name])
      .map((field) => field.field_name)
    try {
      await downloadSubPortRecords({
        group_id: selectedGroup.id,
        keyword: filters.keyword,
        status: filters.status,
        is_four_category: filters.is_four_category,
        carrier: filters.carrier,
        main_port_number: filters.main_port_number,
        sub_port_number: filters.sub_port_number,
        resource_name: filters.resource_name,
        sub_port_numbers: filters.sub_port_numbers,
        sms_signatures: filters.sms_signatures,
        ids: selectedCount > 0 ? selectedIds : undefined,
        field_names: fieldNames,
        business_type: unicomBusinessType === '__none__' ? undefined : unicomBusinessType,
      })
      toast.success('子端口数据导出成功')
      setExportDialogOpen(false)
    } catch {
      toast.error('子端口数据导出失败')
    }
  }

  const columns = useMemo<ColumnDef<SubPortRecord>[]>(() => {
    const base: ColumnDef<SubPortRecord>[] = [
      {
        accessorKey: 'main_port_number',
        header: '主端口号',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span>{row.original.main_port_number || '-'}</span>
            {has('sub_port:write') && (
              <Button
                type='button'
                size='sm'
                variant='ghost'
                onClick={() => {
                  setNamingRecord(row.original)
                  setMainPortName(row.original.field_values.resource_name || '')
                  setMainPortCarrier(row.original.field_values.carrier || '')
                }}
              >命名</Button>
            )}
          </div>
        ),
      },
      { id: 'resource_name_front', header: '命名', cell: ({ row }) => row.original.field_values.resource_name || '-' },
      {
        accessorKey: 'sub_port_number',
        header: '子端口号',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ getValue }) => (
          <StatusTag
            status={getValue() as string}
            customMap={STATUS_COLOR_MAP}
          />
        ),
      },
    ]
    const dynamic: ColumnDef<SubPortRecord>[] = sortedFields.filter((field) => field.field_name !== 'resource_name').map((field) => ({
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
          <p className='text-muted-foreground py-10 text-center text-sm'>
            加载中...
          </p>
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
            {has('sub_port:write') && selectedGroup.id !== '__none__' && (
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
                <Button
                  variant='outline'
                  disabled={selectedGroup.id === '__none__'}
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  导入数据
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setStatusImportDialogOpen(true)}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  批量修改状态
                </Button>
                <Button
                  variant='outline'
                  disabled={selectedGroup.id === '__none__'}
                  onClick={() => downloadSubPortTemplate(selectedGroup.id)}
                >
                  <Download className='mr-2 h-4 w-4' />
                  下载模板
                </Button>
                <Button
                  variant='outline'
                  disabled={selectedGroup.id === '__none__'}
                  onClick={() => setExportDialogOpen(true)}
                >
                  <Download className='mr-2 h-4 w-4' />
                  导出数据
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setDeleteListDialogOpen(true)}
                >
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
                <SelectItem value='__none__'>不按字段组</SelectItem>
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
              placeholder='搜索全部字段'
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
              className='w-44'
            />
          </div>
          <Button size='sm' onClick={invalidate}>搜索</Button>
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
            <label className='text-muted-foreground text-sm'>是否四类</label>
            <Select
              value={fourCategoryFilter}
              onValueChange={(value) => {
                setFourCategoryFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部</SelectItem>
                <SelectItem value='是'>是</SelectItem>
                <SelectItem value='否'>否</SelectItem>
                <SelectItem value='__empty__'>未填写</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>运营商</label>
            <Select value={selectedCarrier} onValueChange={(value) => { setCarrierFilter(value); setPage(1) }}>
              <SelectTrigger className='w-32'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部</SelectItem>
                <SelectItem value='__empty__'>未归类</SelectItem>
                {Array.from(new Set([...(carrierOptionsQuery.data ?? []), selectedCarrier]))
                  .filter((carrier) => carrier !== '__all__' && carrier !== '__empty__')
                  .map((carrier) => <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>主端口号</label>
            <Input
              placeholder='搜索或选择主端口号'
              list='main-port-options'
              value={mainPortFilter}
              onChange={(e) => {
                setMainPortFilter(e.target.value)
                setPage(1)
              }}
              className='w-44'
            />
            <datalist id='main-port-options'>
              {(mainPortOptionsQuery.data ?? []).map((number) => <option key={number} value={number} />)}
            </datalist>
            <span className='text-muted-foreground text-xs'>已导入 {mainPortOptionsQuery.data?.length ?? 0} 个主端口</span>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>子端口号</label>
            <Input
              placeholder='精确匹配子端口号'
              value={subPortFilter}
              onChange={(e) => {
                setSubPortFilter(e.target.value)
                setPage(1)
              }}
              className='w-44'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>按子端口号筛选</label>
            <ValueFilter
              label='子端口号'
              options={subPortOptionsQuery.data ?? []}
              selected={selectedSubPorts}
              onChange={(values) => {
                setSelectedSubPorts(values)
                setPage(1)
              }}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>命名</label>
            <Input
              placeholder='搜索命名'
              value={resourceNameFilter}
              onChange={(e) => { setResourceNameFilter(e.target.value); setPage(1) }}
              className='w-40'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>按签名筛选</label>
            <ValueFilter
              label='签名'
              options={signatureOptionsQuery.data ?? []}
              selected={selectedSignatures}
              onChange={(values) => {
                setSelectedSignatures(values)
                setPage(1)
              }}
            />
          </div>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setKeyword('')
                setStatusFilter('__all__')
                setFourCategoryFilter('__all__')
                setCarrierFilter('__auto__')
                setMainPortFilter('')
                setSubPortFilter('')
                setResourceNameFilter('')
                setSelectedSubPorts(null)
                setSelectedSignatures(null)
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
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
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

      <Dialog open={!!namingRecord} onOpenChange={(open) => { if (!open) setNamingRecord(null) }}>
        <DialogContent className='sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>主端口命名</DialogTitle>
          </DialogHeader>
          <p className='text-muted-foreground text-sm'>
            {namingRecord?.main_port_number}，将同步更新该运营商下的所有子端口。
          </p>
          <Select value={mainPortCarrier} onValueChange={setMainPortCarrier}>
            <SelectTrigger><SelectValue placeholder='选择运营商' /></SelectTrigger>
            <SelectContent>{['中国联通', '中国电信', '中国移动', '中国广电'].map((carrier) => <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            aria-label='主端口名称'
            placeholder='输入主端口名称'
            value={mainPortName}
            onChange={(event) => setMainPortName(event.target.value)}
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setNamingRecord(null)}>取消</Button>
            <Button disabled={renameMutation.isPending || !mainPortCarrier} onClick={() => renameMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除子端口 {toDelete?.sub_port_number || ''}{' '}
              吗？此操作不可撤销。
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
        onImport={(file, overwrite) =>
          importSubPorts(file, selectedGroup.id, overwrite)
        }
        onPreview={(file) => previewSubPortsImport(file, selectedGroup.id)}
        onSuccess={invalidate}
        allowOverwrite
      />

      <ImportDialog
        open={statusImportDialogOpen}
        onOpenChange={setStatusImportDialogOpen}
        title='子端口状态'
        onDownloadTemplate={downloadSubPortStatusTemplate}
        onImport={async (file) => {
          const result = await importSubPortStatuses(file)
          if (result.updated_count > 0) invalidate()
          return {
            total: result.updated_count + result.error_count,
            success_count: result.updated_count,
            error_count: result.error_count,
            errors: result.errors.map((error) => ({
              row: error.row,
              field: '状态',
              value: '',
              reason: error.reason,
              suggestion: '',
            })),
            message: `已更新 ${result.updated_count} 条子端口状态`,
          }
        }}
        onSuccess={invalidate}
      />

      <ImportDeleteDialog
        open={deleteListDialogOpen}
        onOpenChange={setDeleteListDialogOpen}
        onSuccess={invalidate}
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className='sm:max-w-[520px]'>
          <DialogHeader>
            <DialogTitle>导出子端口数据</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='text-muted-foreground text-sm'>
              {selectedCount > 0
                ? `将导出已选 ${selectedCount} 条记录`
                : '将导出当前筛选条件下的全部记录'}
            </div>
            <div className='rounded-md border p-3'>
              <div className='mb-2 text-sm font-medium'>固定列</div>
              <div className='text-muted-foreground text-sm'>
                状态、子端口号、主端口号
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>联通通用业务类型（可选）</label>
              <Select value={unicomBusinessType} onValueChange={setUnicomBusinessType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>使用记录原值</SelectItem>
                  {UNICOM_BUSINESS_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2 rounded-md border p-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>导出字段</span>
                <div className='flex gap-1'>
                  <Button type='button' size='sm' variant='ghost' onClick={() =>
                    setExportFieldNames(Object.fromEntries(sortedFields.map((field) => [field.field_name, true])))
                  }>全选</Button>
                  <Button type='button' size='sm' variant='ghost' onClick={() =>
                    setExportFieldNames(Object.fromEntries(sortedFields.map((field) => [field.field_name, false])))
                  }>全不选</Button>
                </div>
              </div>
              <div className='max-h-64 space-y-2 overflow-y-auto'>
              {sortedFields.map((field) => (
                <label
                  key={field.field_name}
                  className='flex cursor-pointer items-center gap-2 text-sm'
                >
                  <Checkbox
                    checked={!!exportFieldNames[field.field_name]}
                    onCheckedChange={(checked) =>
                      setExportFieldNames((prev) => ({
                        ...prev,
                        [field.field_name]: checked === true,
                      }))
                    }
                  />
                  <span>{field.field_label}</span>
                </label>
              ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setExportDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleExport}>导出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SubPortLibraryPage
