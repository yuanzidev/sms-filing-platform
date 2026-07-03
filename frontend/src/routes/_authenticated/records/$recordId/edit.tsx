import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RecordForm, type RecordFormValues } from '@/features/records/components/record-form/record-form'
import { getRecord } from '@/lib/api/records'

function EditRecordPage() {
  const { recordId } = Route.useParams()
  const navigate = useNavigate()
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

  async function handleSubmit(values: RecordFormValues) {
    // TODO: wire to real API when create/edit is implemented
    toast.success('报备记录更新成功')
    navigate({ to: '/records/$recordId/detail', params: { recordId } })
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">编辑报备</h1>
      <RecordForm
        initialValues={record as unknown as Partial<RecordFormValues>}
        onSubmit={handleSubmit}
        submitLabel="保存"
      />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/records/$recordId/edit')({
  component: EditRecordPage,
})
