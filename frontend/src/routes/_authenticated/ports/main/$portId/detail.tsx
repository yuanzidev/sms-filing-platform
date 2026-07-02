import { createFileRoute } from '@tanstack/react-router'
import { MainPortDetail } from '@/features/ports/main/components/main-port-detail'
import { getMainPort, getSubPorts } from '@/lib/mock/store'

function MainPortDetailPage() {
  const { portId } = Route.useParams()
  const port = getMainPort(portId)
  const subPorts = getSubPorts({ main_port_id: portId }, 1, 100)

  if (!port) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">端口不存在</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">主端口详情 - {port.port_number}</h1>
      <MainPortDetail port={port} subPortCount={subPorts.total} />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/ports/main/$portId/detail')({
  component: MainPortDetailPage,
})
