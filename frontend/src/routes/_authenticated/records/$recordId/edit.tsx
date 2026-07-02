import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { RecordForm, type RecordFormValues } from '@/features/records/components/record-form/record-form'
import { useRecord, useUpdateRecord } from '@/hooks/use-records'

function EditRecordPage() {
  const { recordId } = Route.useParams()
  const navigate = useNavigate()
  const { data: record, isLoading, error } = useRecord(recordId)
  const updateRecord = useUpdateRecord()

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
  }

  if (error || !record) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载失败：{error?.message ?? '记录不存在'}</div>
  }

  async function handleSubmit(values: RecordFormValues) {
    try {
      await updateRecord.mutateAsync({ id: recordId, data: values })
      toast.success('报备记录更新成功')
      navigate({ to: '/records/$recordId/detail', params: { recordId } })
    } catch {
      toast.error('更新失败，请重试')
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">编辑报备</h1>
      <RecordForm
        initialValues={record as Partial<RecordFormValues>}
        onSubmit={handleSubmit}
        submitLabel="保存"
      />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/records/$recordId/edit')({
  component: EditRecordPage,
})
