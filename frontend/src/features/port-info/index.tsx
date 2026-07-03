import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Plus, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getPortInfos, deletePortInfo, downloadPortInfoTemplate, importPortInfos } from '@/lib/api/port-info'
import { ImportDialog } from '@/components/shared/import-dialog'
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

export function PortInfoPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PortInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PortInfo | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['port-info', { page, page_size: PAGE_SIZE }],
    queryFn: () => getPortInfos({ page, page_size: PAGE_SIZE }),
  })

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
    { accessorKey: 'created_at', header: '创建时间' },
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

        <DataTable
          columns={columns}
          data={portInfos}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </Main>

      <PortInfoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        portInfo={selected}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="端口信息"
        onDownloadTemplate={downloadPortInfoTemplate}
        onImport={importPortInfos}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除端口信息 "{toDelete?.main_port_number || toDelete?.sub_port_number || '未指定'}" 吗？此操作不可撤销。
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

export default PortInfoPage
