import { createFileRoute } from '@tanstack/react-router'
import { ExportGroupsPage } from '@/features/export-groups'

export const Route = createFileRoute('/_authenticated/export-groups/')({
  component: ExportGroupsPage,
})
