import { createFileRoute } from '@tanstack/react-router'
import { PortInfoPage } from '@/features/port-info'

export const Route = createFileRoute('/_authenticated/port-info/')({
  component: PortInfoPage,
})
