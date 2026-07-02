import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getRecords, deleteRecord } from '@/lib/mock/store'
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
import type { FilingRecord } from '@/lib/mock/data/records'

const PAGE_SIZE = 10

export function RecordListPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, total } = getRecords(filters, page, PAGE_SIZE)

  const handleSearch = (values: Record<string, string>) => {
    setFilters(values)
    setPage(1)
  }

  const handleReset = () => {
    setFilters({})
    setPage(1)
  }

  const handleDeleteConfirm = () => {
    if (!deleteId) return
    deleteRecord(deleteId)
    setDeleteId(null)
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
        data={data as FilingRecord[]}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onDelete={(id) => setDeleteId(id)}
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
            <AlertDialogAction onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
