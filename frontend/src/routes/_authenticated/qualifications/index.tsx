import { createFileRoute } from '@tanstack/react-router'
import { QualificationsPage } from '@/features/qualifications'

export const Route = createFileRoute('/_authenticated/qualifications/')({
  component: QualificationsPage,
})
