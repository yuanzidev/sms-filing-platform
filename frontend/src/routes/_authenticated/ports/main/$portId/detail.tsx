import { createFileRoute } from '@tanstack/react-router'
import { MainPortDetail } from '@/features/ports/main/components/main-port-detail'
import { useMainPort, useSubPorts } from '@/hooks/use-ports'

function MainPortDetailPage() {
  const { portId } = Route.useParams()
  const { data: port, isLoading, error } = useMainPort(portId)
  const { data: subPorts } = useSubPorts({ main_port_id: portId })

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
  }

  if (error || !port) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载失败：{error?.message ?? '端口不存在'}</div>
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
