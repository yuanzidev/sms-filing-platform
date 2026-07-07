import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Plus, RefreshCw, Eye, Download } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getFilingTasks, deleteFilingTask, downloadFilingTaskFile } from '@/lib/api/filing-tasks'
import { formatCN } from '@/lib/time'
import type { FilingTask } from '@/lib/api/types'
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
import { toast } from 'sonner'

const PAGE_SIZE = 10

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilingManagementPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const filters = {
    page,
    page_size: PAGE_SIZE,
    keyword: keyword || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  }

  const { data } = useQuery({
    queryKey: ['filing-tasks', filters],
    queryFn: () => getFilingTasks(filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFilingTask(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })
      setDeleteId(null)
    },
    onError: () => toast.error('删除失败'),
  })

  const { data: taskDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['filing-task-detail', detailId],
    queryFn: () => import('@/lib/api/filing-tasks').then((m) => m.getFilingTask(detailId!)),
    enabled: !!detailId,
  })

  const handleDownload = async (id: string) => {
    try {
      const task = tasks.find((t: { id: string }) => t.id === id)
      await downloadFilingTaskFile(id, `${task?.task_name || 'export'}.xlsx`)
    } catch {
      toast.error('文件下载失败')
    }
  }

  const handleSearch = () => {
    setPage(1)
    // Trigger refetch via key change — already handled by the query key
    queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })
  }

  const handleReset = () => {
    setKeyword('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const tasks = data?.data ?? []
  const total = data?.total ?? 0

  const columns = useMemo<ColumnDef<FilingTask>[]>(() => [
    { accessorKey: 'task_name', header: '任务名称' },
    {
      accessorKey: 'created_at',
      header: '生成时间',
      cell: ({ getValue }) => formatCN(getValue() as string),
    },
    { accessorKey: 'operator_name', header: '操作人' },
    { accessorKey: 'qualification_count', header: '资质数' },
    { accessorKey: 'port_count', header: '端口数' },
    {
      id: 'group',
      header: '字段组',
      accessorFn: (row) => {
        let label = row.export_group_name
        if (row.group_by_field) label += ` (${row.group_by_field})`
        return label
      },
    },
    {
      accessorKey: 'file_size',
      header: '文件大小',
      cell: ({ getValue }) => formatFileSize(getValue() as number | null),
    },
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
            <h2 className='text-2xl font-bold tracking-tight'>报备管理</h2>
            <p className='text-muted-foreground'>
              管理报备任务，查看导出文件并支持按日期和关键词筛选
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
            <Button asChild>
              <Link to="/filing-management/create">
                <Plus className="mr-2 h-4 w-4" />
                新建报备
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">开始日期</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">结束日期</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
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
          data={tasks}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />

        <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>任务详情</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : taskDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">任务名称：</span>{taskDetail.task_name}</div>
                  <div><span className="text-muted-foreground">操作人：</span>{taskDetail.operator_name}</div>
                  <div><span className="text-muted-foreground">字段组：</span>{taskDetail.export_group_name}</div>
                  <div><span className="text-muted-foreground">排序字段：</span>{taskDetail.group_by_field || '-'}</div>
                  <div><span className="text-muted-foreground">资质数量：</span>{taskDetail.qualification_count}</div>
                  <div><span className="text-muted-foreground">端口数量：</span>{taskDetail.port_count}</div>
                  <div><span className="text-muted-foreground">文件大小：</span>{formatFileSize(taskDetail.file_size)}</div>
                  <div><span className="text-muted-foreground">生成时间：</span>{formatCN(taskDetail.created_at)}</div>
                </div>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">资质ID列表：</span>
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(taskDetail.qualification_ids ?? [], null, 2)}
                  </pre>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">端口ID列表：</span>
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(taskDetail.port_ids ?? [], null, 2)}
                  </pre>
                </div>
                {taskDetail.download_url && (
                  <Button className="w-full" onClick={() => window.open(taskDetail.download_url!, '_blank')}>
                    <Download className="mr-2 h-4 w-4" />下载 Excel 文件
                  </Button>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除该报备任务吗？此操作不可撤销，对应的导出文件也将被删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Main>
    </>
  )
}
