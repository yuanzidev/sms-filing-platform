import { createFileRoute } from '@tanstack/react-router'
import { SubPortsPage } from '@/features/ports/sub'

export const Route = createFileRoute('/_authenticated/ports/sub')({
  component: SubPortsPage,
})
