import { createFileRoute } from '@tanstack/react-router'
import { SubPortLibraryPage } from '@/features/sub-port-library'

export const Route = createFileRoute('/_authenticated/sub-ports/')({
  component: SubPortLibraryPage,
})
