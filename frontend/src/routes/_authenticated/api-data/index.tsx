import { createFileRoute } from '@tanstack/react-router'
import { ApiAccessPage } from '@/features/api-data'

export const Route = createFileRoute('/_authenticated/api-data/')({
  component: ApiAccessPage,
})
