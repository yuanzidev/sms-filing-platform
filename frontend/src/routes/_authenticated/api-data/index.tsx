import { createFileRoute } from '@tanstack/react-router'
import { ApiDataListPage } from '@/features/api-data'

export const Route = createFileRoute('/_authenticated/api-data/')({
  component: ApiDataListPage,
})
