import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getRecords, deleteRecord, type RecordFilters } from '@/lib/api/records'
import { RecordSearchForm } from '@/features/records/components/record-search-form'
import { RecordsTable } from '@/features/records/components/records-table'
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

export function RecordListPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['records', { ...filters, page, page_size: PAGE_SIZE }],
    queryFn: () => getRecords({ ...filters, page, page_size: PAGE_SIZE } as RecordFilters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      setDeleteId(null)
    },
    onError: () => toast.error('删除失败'),
  })

  const handleSearch = (values: Record<string, string>) => {
    setFilters(values)
    setPage(1)
  }

  const handleReset = () => {
    setFilters({})
    setPage(1)
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">报备记录</h1>

      <RecordSearchForm onSearch={handleSearch} onReset={handleReset} />

      <div className="flex items-center justify-between">
        <div />
        <Button asChild>
          <Link to="/records/create">新建报备</Link>
        </Button>
      </div>

      <RecordsTable
        data={data?.data ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onDelete={(id) => setDeleteId(id)}
        isLoading={isLoading}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该报备记录吗？此操作不可撤销。
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
