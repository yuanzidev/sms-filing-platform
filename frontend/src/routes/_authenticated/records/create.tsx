import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RecordForm, type RecordFormValues } from '@/features/records/components/record-form/record-form'
import { createRecord } from '@/lib/api/records'

function CreateRecordPage() {
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: (values: RecordFormValues) => createRecord(values as Record<string, unknown>),
    onSuccess: (record) => {
      toast.success('报备记录创建成功')
      navigate({ to: '/records/$recordId/detail', params: { recordId: record.id } })
    },
    onError: () => toast.error('报备记录创建失败'),
  })

  async function handleSubmit(values: RecordFormValues) {
    createMutation.mutate(values)
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
