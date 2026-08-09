import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  getPortInfos,
  deletePortInfo,
  downloadPortInfoTemplate,
  importPortInfos,
} from '@/lib/api/port-info'
import type { PortInfo } from '@/lib/api/types'
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
import { Input } from '@/components/ui/input'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { ImportDialog } from '@/components/shared/import-dialog'
import { PROVINCES } from '@/components/shared/province-city-fields'
import { StatusTag } from '@/components/shared/status-tag'
import { ThemeSwitch } from '@/components/theme-switch'
import { PortInfoDetailDialog } from './components/port-info-detail-dialog'
import { PortInfoDialog } from './components/port-info-dialog'

const PAGE_SIZE = 10
const CARRIERS = ['中国移动', '中国联通', '中国电信', '中国广电']

export function PortInfoPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PortInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PortInfo | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<PortInfo | undefined>()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [searchInputs, setSearchInputs] = useState({
    carrier: '',
    province: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<{
    carrier?: string
    province?: string
  }>({})
  const [keyword, setKeyword] = useState('')
  const [cityFilter, setCityFilter] = useState('__all__')
  const [portTypeFilter, setPortTypeFilter] = useState('__all__')
  const [mainPortFilter, setMainPortFilter] = useState('')
  const queryClient = useQueryClient()

  const filters = {
    page,
    page_size: PAGE_SIZE,
    carrier: appliedFilters.carrier,
    province: appliedFilters.province,
    keyword: keyword || undefined,
    city: cityFilter !== '__all__' ? cityFilter : undefined,
    port_type: portTypeFilter !== '__all__' ? portTypeFilter : undefined,
    main_port_number: mainPortFilter || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['port-info', filters],
    queryFn: () => getPortInfos(filters),
  })

  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of data?.data ?? []) {
      if (p.city) set.add(p.city)
    }
    return Array.from(set).sort()
  }, [data])

  const portTypeOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of data?.data ?? []) {
      if (p.port_type) set.add(p.port_type)
    }
    return Array.from(set).sort()
  }, [data])

  const handleSearch = () => {
    setAppliedFilters({
      carrier: searchInputs.carrier || undefined,
      province: searchInputs.province || undefined,
    })
    setPage(1)
  }

  const handleReset = () => {
    setSearchInputs({ carrier: '', province: '' })
    setAppliedFilters({})
    setKeyword('')
    setCityFilter('__all__')
    setPortTypeFilter('__all__')
    setMainPortFilter('')
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
      await Promise.all(
        selectedIds.map((idx) => deletePortInfo(portInfos[Number(idx)]?.id))
      )
      toast.success(`已删除 ${selectedCount} 条记录`)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
    } catch {
      toast.error('批量删除失败')
    }
  }

  const columns = useMemo<ColumnDef<PortInfo>[]>(
    () => [
      {
        id: 'port_number',
        header: '端口号',
        accessorFn: (row) => row.main_port_number || row.sub_port_number || '-',
      },
      {
        accessorKey: 'carrier',
        header: '运营商',
        cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
      },
      {
        accessorKey: 'province',
        header: '省份',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'city',
        header: '城市',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'region',
        header: '所属地区',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'port_type',
        header: '端口类型',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'customer_type',
        header: '客户类型',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'basic_telecom_enterprise_id',
        header: '基础电信企业ID',
        cell: ({ getValue }) => getValue() || '-',
      },
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
            <ActionIconButton
              label='详情'
              icon='view'
              tone='view'
              onClick={() => {
                setDetailTarget(row.original)
              }}
            />
            <ActionIconButton
              label='编辑'
              icon='edit'
              tone='edit'
              onClick={() => {
                setSelected(row.original)
                setDialogOpen(true)
              }}
            />
            <ActionIconButton
              label='删除'
              icon='delete'
              tone='delete'
              onClick={() => {
                setToDelete(row.original)
                setDeleteDialogOpen(true)
              }}
            />
          </div>
        ),
      },
    ],
    []
  )

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
              管理端口详细信息（运营商、端口号、地区、客户类型等）
            </p>
          </div>
          <div className='flex space-x-2'>
            <Button
              onClick={() => {
                setSelected(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新建端口信息
            </Button>
            <Button variant='outline' onClick={() => setImportDialogOpen(true)}>
              <Upload className='mr-2 h-4 w-4' />
              导入数据
            </Button>
            <Button
              variant='outline'
              onClick={() => downloadPortInfoTemplate()}
            >
              <Download className='mr-2 h-4 w-4' />
              下载模板
            </Button>
            {selectedCount > 0 && (
              <Button variant='destructive' onClick={handleBatchDelete}>
                <Trash2 className='mr-2 h-4 w-4' />
                删除 ({selectedCount})
              </Button>
            )}
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['port-info'] })
              }
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='border-border/80 bg-card mt-4 mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4 shadow-sm shadow-slate-950/5'>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>运营商</label>
            <Select
              value={searchInputs.carrier}
              onValueChange={(v) =>
                setSearchInputs((s) => ({
                  ...s,
                  carrier: v === '__all__' ? '' : v,
                }))
              }
            >
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部</SelectItem>
                {CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>接入省</label>
            <Select
              value={searchInputs.province}
              onValueChange={(v) =>
                setSearchInputs((s) => ({
                  ...s,
                  province: v === '__all__' ? '' : v,
                }))
              }
            >
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='全部' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部</SelectItem>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>关键词</label>
            <Input
              placeholder='搜索端口号/主端口备案公司'
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
              className='w-48'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>城市</label>
            <Select
              value={cityFilter}
              onValueChange={(v) => {
                setCityFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='城市' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部城市</SelectItem>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>端口类型</label>
            <Select
              value={portTypeFilter}
              onValueChange={(v) => {
                setPortTypeFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='端口类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>全部类型</SelectItem>
                {portTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex gap-2'>
            <Button size='sm' onClick={handleSearch}>
              搜索
            </Button>
            <Button variant='ghost' size='sm' onClick={handleReset}>
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
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['port-info'] })
        }
      />

      {detailTarget && (
        <PortInfoDetailDialog
          open={!!detailTarget}
          onOpenChange={(open) => {
            if (!open) setDetailTarget(undefined)
          }}
          portInfo={detailTarget}
        />
      )}

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
        title='导入端口信息'
        onDownloadTemplate={downloadPortInfoTemplate}
        onImport={importPortInfos}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['port-info'] })
        }
      />
    </>
  )
}

export default PortInfoPage
