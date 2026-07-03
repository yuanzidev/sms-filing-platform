import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Download, Plus, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table/data-table'
import { getQualifications, deleteQualification, downloadQualificationTemplate, importQualifications } from '@/lib/api/qualifications'
import type { QualificationInfo } from '@/lib/api/types'
import { QualificationDialog } from './components/qualification-dialog'
import { ImportDialog } from '@/components/shared/import-dialog'
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
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['qualifications', { page, page_size: PAGE_SIZE }],
    queryFn: () => getQualifications({ page, page_size: PAGE_SIZE }),
  })

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

  const columns = useMemo<ColumnDef<QualificationInfo>[]>(() => [
    { accessorKey: 'enterprise_name', header: '企业名称' },
    { accessorKey: 'submit_unit', header: '提交单位', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'cert_number', header: '证件号码', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'responsible_name', header: '负责人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'handler_name', header: '经办人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'app_platform_name', header: '平台', cell: ({ getValue }) => getValue() || '-' },
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

        <DataTable
          columns={columns}
          data={qualifications}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
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
