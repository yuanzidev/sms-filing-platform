import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { RecordForm, type RecordFormValues } from '@/features/records/components/record-form/record-form'
import { useCreateRecord } from '@/hooks/use-records'

function CreateRecordPage() {
  const navigate = useNavigate()
  const createRecord = useCreateRecord()

  async function handleSubmit(values: RecordFormValues) {
    try {
      const record = await createRecord.mutateAsync(values)
      toast.success('报备记录创建成功')
      navigate({ to: '/records/$recordId/detail', params: { recordId: record.id } })
    } catch {
      toast.error('创建失败，请重试')
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">新建报备</h1>
      <RecordForm onSubmit={handleSubmit} submitLabel="创建" />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/records/create')({
  component: CreateRecordPage,
})
