import { createFileRoute } from '@tanstack/react-router'
import { SubPortListPage } from '@/features/ports/sub'

export const Route = createFileRoute('/_authenticated/ports/sub/')({
  component: SubPortListPage,
})
