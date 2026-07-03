import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { RecordDetail } from '@/features/records/components/record-detail/record-detail'
import { getRecord } from '@/lib/api/records'
import { Pencil } from 'lucide-react'

function RecordDetailPage() {
  const { recordId } = Route.useParams()
  const { data: record, isLoading } = useQuery({
    queryKey: ['records', recordId],
    queryFn: () => getRecord(recordId),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
  }

  if (!record) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">记录不存在</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{record.qualification_info?.enterprise_name ?? record.record_number} - 报备详情</h1>
        <Link to="/records/$recordId/edit" params={{ recordId }}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-4 w-4" />
            编辑
          </Button>
        </Link>
      </div>
      <RecordDetail record={record} />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/records/$recordId/detail')({
  component: RecordDetailPage,
})
