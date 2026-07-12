import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSubPorts,
  createSubPort,
  updateSubPort,
  deleteSubPort,
} from '@/lib/api/ports'
import type { SubPort } from '@/lib/api/types'
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { StatusTag } from '@/components/shared/status-tag'
import { ThemeSwitch } from '@/components/theme-switch'
import { SubPortDialog } from './components/sub-port-dialog'

const PAGE_SIZE = 10

export function SubPortsPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<SubPort | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SubPort | undefined>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sub-ports', { page, page_size: PAGE_SIZE }],
    queryFn: () => getSubPorts({ page, page_size: PAGE_SIZE }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubPort(id),
    onSuccess: () => {
      toast.success('子端口删除成功')
      queryClient.invalidateQueries({ queryKey: ['sub-ports'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('子端口删除失败'),
  })

  const ports = data?.data ?? []
  const total = data?.total ?? 0

  const handleCreate = async (values: Record<string, unknown>) => {
    await createSubPort(values as Partial<SubPort>)
    toast.success('子端口创建成功')
    queryClient.invalidateQueries({ queryKey: ['sub-ports'] })
  }

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!selected) return
    await updateSubPort(selected.id, values as Partial<SubPort>)
    toast.success('子端口更新成功')
    queryClient.invalidateQueries({ queryKey: ['sub-ports'] })
  }

  const columns = useMemo<ColumnDef<SubPort>[]>(
    () => [
      { accessorKey: 'port_number', header: '子端口号' },
      {
        accessorKey: 'main_port_number',
        header: '所属主端口',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'carrier',
        header: '运营商',
        cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
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
            <h2 className='text-2xl font-bold tracking-tight'>子端口管理</h2>
            <p className='text-muted-foreground'>
              管理子端口号、主端口归属及分配状态
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
              新建子端口
            </Button>
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['sub-ports'] })
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
        <DataTable
          columns={columns}
          data={ports}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </Main>
      <SubPortDialog
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
              确定要删除子端口 "{toDelete?.port_number}" 吗？
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
    </>
  )
}
