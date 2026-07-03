import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/api/dashboard'
import { StatCard } from '@/components/shared/stat-card'
import {
  FileText,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  Cable,
} from 'lucide-react'

export function StatCards() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  })

  const cards = [
    { title: '报备总数', value: data?.total_records ?? '-', icon: <FileText className="h-5 w-5" /> },
    { title: '本月新增', value: data?.new_this_month ?? '-', icon: <PlusCircle className="h-5 w-5" /> },
    { title: '本月变更', value: data?.updated_this_month ?? '-', icon: <RefreshCw className="h-5 w-5" /> },
    { title: '资料不全', value: data?.incomplete ?? '-', icon: <AlertTriangle className="h-5 w-5" /> },
    { title: '即将到期', value: data?.expiring_soon ?? '-', icon: <Clock className="h-5 w-5" /> },
    { title: '已分配端口', value: data?.main_port_count ?? '-', icon: <Cable className="h-5 w-5" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
      ))}
    </div>
  )
}
