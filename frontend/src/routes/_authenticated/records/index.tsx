import { createFileRoute } from '@tanstack/react-router'
import { RecordListPage } from '@/features/records'

export const Route = createFileRoute('/_authenticated/records/')({
  component: RecordListPage,
})
