import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MainPortDetail } from '@/features/ports/main/components/main-port-detail'
import { getMainPort, getSubPorts } from '@/lib/api/ports'

function MainPortDetailPage() {
  const { portId } = Route.useParams()

  const { data: port, isLoading } = useQuery({
    queryKey: ['ports', 'main', portId],
    queryFn: () => getMainPort(portId),
  })

  const { data: subPorts } = useQuery({
    queryKey: ['ports', 'sub', { main_port_id: portId }],
    queryFn: () => getSubPorts({ main_port_id: portId, page_size: 100 }),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
  }

  if (!port) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">端口不存在</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">主端口详情 - {port.port_number}</h1>
      <MainPortDetail port={port} subPortCount={subPorts?.total ?? 0} />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/ports/main/$portId/detail')({
  component: MainPortDetailPage,
})
