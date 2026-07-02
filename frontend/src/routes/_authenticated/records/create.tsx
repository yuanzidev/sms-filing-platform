import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { RecordForm, type RecordFormValues } from '@/features/records/components/record-form/record-form'
import { createRecord } from '@/lib/mock/store'

function CreateRecordPage() {
  const navigate = useNavigate()

  async function handleSubmit(values: RecordFormValues) {
    const record = createRecord(values as unknown as Record<string, unknown>)
    toast.success('报备记录创建成功')
    navigate({ to: '/records/$recordId/detail', params: { recordId: record.id } })
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
