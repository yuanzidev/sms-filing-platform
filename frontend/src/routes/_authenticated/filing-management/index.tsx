import { createFileRoute } from '@tanstack/react-router'
import { FilingManagementPage } from '@/features/filing-management'

export const Route = createFileRoute('/_authenticated/filing-management/')({
  component: FilingManagementPage,
})
