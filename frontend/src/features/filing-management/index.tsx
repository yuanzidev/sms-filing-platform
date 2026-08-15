import { useCallback, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Download, Plus, RefreshCw, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  getFilingTasks,
  deleteFilingTask,
  downloadFilingTaskFile,
  regenerateFilingTask,
} from '@/lib/api/filing-tasks'
import type { FilingTask } from '@/lib/api/types'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { ThemeSwitch } from '@/components/theme-switch'

const PAGE_SIZE = 10

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DownloadErrorDetail {
  reason?: string
  can_retry?: boolean
}

/**
 * 解析下载接口错误响应中的 detail。
 * 下载请求以 blob 接收，错误响应体也是 Blob，需先解析 JSON 再取 detail。
 */
async function parseDownloadErrorDetail(
  err: unknown
): Promise<DownloadErrorDetail | undefined> {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  let detail: unknown
  if (data instanceof Blob) {
    try {
      detail = (JSON.parse(await data.text()) as { detail?: unknown }).detail
    } catch {
      return undefined
    }
  } else if (data && typeof data === 'object') {
    detail = (data as { detail?: unknown }).detail
  }
  return typeof detail === 'object' && detail !== null
    ? (detail as DownloadErrorDetail)
    : undefined
}

export function FilingManagementPage() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
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

  const tasks = useMemo(() => data?.data ?? [], [data])
  const total = data?.total ?? 0

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
    queryFn: () =>
      import('@/lib/api/filing-tasks').then((m) => m.getFilingTask(detailId!)),
    enabled: !!detailId,
  })

  const handleRegenerate = useCallback(async (id: string) => {
    setRegenerating(id)
    try {
      await regenerateFilingTask(id)
      toast.success('文件已重新生成，可以下载了')
      queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })
    } catch {
      toast.error('重新生成失败')
    } finally {
      setRegenerating(null)
    }
  }, [queryClient])

  const handleDownload = useCallback(
    async (id: string) => {
      try {
        await downloadFilingTaskFile(id)
      } catch (err) {
        const detail = await parseDownloadErrorDetail(err)
        const reason = detail?.reason || '文件下载失败'
        if (detail?.can_retry) {
          toast.error(reason, {
            action: { label: '重新生成', onClick: () => handleRegenerate(id) },
          })
        } else {
          toast.error(reason)
        }
      }
    },
    [handleRegenerate]
  )

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

  const columns = useMemo<ColumnDef<FilingTask>[]>(
    () => [
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
          <div className='flex items-center gap-1'>
            <ActionIconButton
              label='查看'
              icon='view'
              tone='view'
              onClick={() => setDetailId(row.original.id)}
            />
            <ActionIconButton
              label='下载'
              icon='download'
              tone='download'
              disabled={regenerating === row.original.id}
              onClick={() => handleDownload(row.original.id)}
            />
            <ActionIconButton
              label='删除'
              icon='delete'
              tone='delete'
              onClick={() => setDeleteId(row.original.id)}
            />
          </div>
        ),
      },
    ],
    // handleDownload 依赖 tasks，随列表刷新重新生成闭包，避免下载时拿不到最新任务数据
    [handleDownload, regenerating]
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
            <h2 className='text-2xl font-bold tracking-tight'>报备管理</h2>
            <p className='text-muted-foreground'>
              管理报备任务，查看导出文件并支持按日期和关键词筛选
            </p>
          </div>
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['filing-tasks'] })
              }
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              刷新
            </Button>
            <Button asChild>
              <Link to='/filing-management/create'>
                <Plus className='mr-2 h-4 w-4' />
                新建报备
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='border-border/80 bg-card mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4 shadow-sm shadow-slate-950/5'>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>开始日期</label>
            <Input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='w-40'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>结束日期</label>
            <Input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='w-40'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>关键词</label>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                type='text'
                placeholder='搜索任务名称、操作人、字段组'
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className='w-48 pl-8'
              />
            </div>
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
          data={tasks}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />

        <Dialog
          open={!!detailId}
          onOpenChange={(open) => !open && setDetailId(null)}
        >
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>任务详情</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-5 w-3/4' />
                <Skeleton className='h-5 w-1/2' />
                <Skeleton className='h-5 w-full' />
              </div>
            ) : taskDetail ? (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>任务名称：</span>
                    {taskDetail.task_name}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>操作人：</span>
                    {taskDetail.operator_name}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>字段组：</span>
                    {taskDetail.export_group_name}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>排序字段：</span>
                    {taskDetail.group_by_field || '-'}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>资质数量：</span>
                    {taskDetail.qualification_count}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>端口数量：</span>
                    {taskDetail.port_count}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>文件大小：</span>
                    {formatFileSize(taskDetail.file_size)}
                  </div>
                  <div>
                    <span className='text-muted-foreground'>生成时间：</span>
                    {formatCN(taskDetail.created_at)}
                  </div>
                </div>
                <Separator />
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>资质明细</span>
                    <span className='text-muted-foreground'>
                      {taskDetail.qualifications?.length ?? 0} / {taskDetail.qualification_count}
                    </span>
                  </div>
                  <div className='max-h-44 space-y-2 overflow-auto rounded-md border p-2'>
                    {taskDetail.qualifications?.length ? (
                      taskDetail.qualifications.map((qualification) => (
                        <div key={qualification.id} className='rounded-md bg-muted/60 p-2'>
                          <div className='font-medium'>{qualification.enterprise_name}</div>
                          <div className='mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                            <span>签名：{qualification.sms_signature || '-'}</span>
                            <span>单位证件号：{qualification.cert_number || '-'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='py-4 text-center text-muted-foreground'>暂无资质明细</div>
                    )}
                  </div>
                </div>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>端口明细</span>
                    <span className='text-muted-foreground'>
                      {taskDetail.ports?.length ?? 0} / {taskDetail.port_count}
                    </span>
                  </div>
                  <div className='max-h-44 space-y-2 overflow-auto rounded-md border p-2'>
                    {taskDetail.ports?.length ? (
                      taskDetail.ports.map((port) => (
                        <div key={port.id} className='rounded-md bg-muted/60 p-2'>
                          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 font-medium'>
                            <span>{port.main_port_number}</span>
                            <span className='text-muted-foreground'>
                              子端口：{port.sub_port_number || '-'}
                            </span>
                          </div>
                          <div className='mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                            <span>运营商：{port.carrier}</span>
                            <span>端口类型：{port.port_type}</span>
                            <span className='col-span-2'>备案公司：{port.enterprise_name}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='py-4 text-center text-muted-foreground'>暂无端口明细</div>
                    )}
                  </div>
                </div>
                {taskDetail.download_url && (
                  <Button
                    className='w-full'
                    onClick={() =>
                      window.open(taskDetail.download_url!, '_blank')
                    }
                  >
                    <Download className='mr-2 h-4 w-4' />
                    下载 Excel 文件
                  </Button>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除该报备任务吗？此操作不可撤销，对应的导出文件也将被删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Main>
    </>
  )
}
