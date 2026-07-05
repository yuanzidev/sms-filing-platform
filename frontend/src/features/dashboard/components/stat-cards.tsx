import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/api/dashboard'
import { StatCard } from '@/components/shared/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  Cable,
} from 'lucide-react'

export function StatCards() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  })

  if (isError) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCard key={i} title="加载失败" value="-" icon={<FileText className="h-5 w-5" />} />
        ))}
      </div>
    )
  }

  const cards = [
    { title: '报备总数', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.total_records ?? '-'), icon: <FileText className="h-5 w-5" /> },
    { title: '本月新增', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.new_this_month ?? '-'), icon: <PlusCircle className="h-5 w-5" /> },
    { title: '本月变更', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.updated_this_month ?? '-'), icon: <RefreshCw className="h-5 w-5" /> },
    { title: '资料不全', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.incomplete ?? '-'), icon: <AlertTriangle className="h-5 w-5" /> },
    { title: '即将到期', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.expiring_soon ?? '-'), icon: <Clock className="h-5 w-5" /> },
    { title: '已分配端口', value: isLoading ? <Skeleton className="h-6 w-12" /> : (data?.main_port_count ?? '-'), icon: <Cable className="h-5 w-5" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
      ))}
    </div>
  )
}
