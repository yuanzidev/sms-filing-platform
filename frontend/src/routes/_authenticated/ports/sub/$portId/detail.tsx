import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SubPortDetail } from '@/features/ports/sub/components/sub-port-detail'
import { getSubPort } from '@/lib/api/ports'

function SubPortDetailPage() {
  const { portId } = Route.useParams()

  const { data: port, isLoading } = useQuery({
    queryKey: ['ports', 'sub', portId],
    queryFn: () => getSubPort(portId),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">加载中...</div>
  }

  if (!port) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">子端口不存在</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">子端口详情 - {port.port_number}</h1>
      <SubPortDetail port={port} />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/ports/sub/$portId/detail')({
  component: SubPortDetailPage,
})
