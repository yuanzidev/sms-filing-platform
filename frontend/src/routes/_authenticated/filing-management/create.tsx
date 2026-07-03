import { createFileRoute } from '@tanstack/react-router'
import { FilingCreatePage } from '@/features/filing-management/create'

export const Route = createFileRoute('/_authenticated/filing-management/create')({
  component: FilingCreatePage,
})
