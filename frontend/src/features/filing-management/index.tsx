import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getFilingTasks, deleteFilingTask, getFilingTaskDownloadUrl } from '@/lib/api/filing-tasks'
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

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FilingManagementPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  const handleDownload = async (id: string) => {
    try {
      const url = await getFilingTaskDownloadUrl(id)
      window.open(url, '_blank')
    } catch {
      toast.error('获取下载链接失败')
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
      cell: ({ getValue }) => formatDate(getValue() as string),
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
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">报备管理</h1>
        <Button asChild>
          <Link to="/filing-management/create">新建报备</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
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
    </div>
  )
}
