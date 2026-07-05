import { createFileRoute } from '@tanstack/react-router'
import { MainPortsPage } from '@/features/ports/main'

export const Route = createFileRoute('/_authenticated/ports/main')({
  component: MainPortsPage,
})
