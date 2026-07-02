import { createFileRoute } from '@tanstack/react-router'
import { MainPortListPage } from '@/features/ports/main'

export const Route = createFileRoute('/_authenticated/ports/main/')({
  component: MainPortListPage,
})
