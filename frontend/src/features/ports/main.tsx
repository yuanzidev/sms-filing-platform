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
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getMainPorts, createMainPort, updateMainPort, deleteMainPort } from '@/lib/api/ports'
import type { MainPort } from '@/lib/api/types'
import { MainPortDialog } from './components/main-port-dialog'
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

export function MainPortsPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<MainPort | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<MainPort | undefined>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['main-ports', { page, page_size: PAGE_SIZE }],
    queryFn: () => getMainPorts({ page, page_size: PAGE_SIZE }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMainPort(id),
    onSuccess: () => {
      toast.success('主端口删除成功')
      queryClient.invalidateQueries({ queryKey: ['main-ports'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('主端口删除失败'),
  })

  const ports = data?.data ?? []
  const total = data?.total ?? 0

  const handleCreate = async (values: Record<string, unknown>) => {
    await createMainPort(values as Partial<MainPort>)
    toast.success('主端口创建成功')
    queryClient.invalidateQueries({ queryKey: ['main-ports'] })
  }

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!selected) return
    await updateMainPort(selected.id, values as Partial<MainPort>)
    toast.success('主端口更新成功')
    queryClient.invalidateQueries({ queryKey: ['main-ports'] })
  }

  const columns = useMemo<ColumnDef<MainPort>[]>(() => [
    { accessorKey: 'port_number', header: '端口号' },
    {
      accessorKey: 'carrier',
      header: '运营商',
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge>,
    },
    { accessorKey: 'port_type', header: '端口类型', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'province', header: '省份', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'city', header: '城市', cell: ({ getValue }) => getValue() || '-' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ getValue }) => {
        const status = getValue() as string
        return <Badge variant={status === '使用中' ? 'default' : status === '停用' ? 'destructive' : 'secondary'}>{status}</Badge>
      },
    },
    {
      accessorKey: 'sub_port_count',
      header: '子端口数',
      cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span>,
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(row.original); setDialogOpen(true) }}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={() => { setToDelete(row.original); setDeleteDialogOpen(true) }}>删除</Button>
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
            <h2 className='text-2xl font-bold tracking-tight'>主端口管理</h2>
            <p className='text-muted-foreground'>管理主端口号、运营商归属及子端口统计</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />新建主端口
            </Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['main-ports'] })} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />刷新
            </Button>
          </div>
        </div>
        <DataTable columns={columns} data={ports} total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </Main>
      <MainPortDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        port={selected}
        onSubmit={selected ? handleUpdate : handleCreate}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除主端口 "{toDelete?.port_number}" 吗？其下子端口也将受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deleteMutation.mutate(toDelete.id)} className="bg-red-600 hover:bg-red-700">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
