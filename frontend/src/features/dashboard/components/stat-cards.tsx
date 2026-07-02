import { dashboardStats } from '@/lib/mock/data/dashboard'
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
  const cards = [
    { title: '报备总数', value: dashboardStats.total_records, icon: <FileText className="h-5 w-5" /> },
    { title: '本月新增', value: dashboardStats.new_this_month, icon: <PlusCircle className="h-5 w-5" /> },
    { title: '本月变更', value: dashboardStats.updated_this_month, icon: <RefreshCw className="h-5 w-5" /> },
    { title: '资料不全', value: dashboardStats.incomplete, icon: <AlertTriangle className="h-5 w-5" /> },
    { title: '即将到期', value: dashboardStats.expiring_soon, icon: <Clock className="h-5 w-5" /> },
    { title: '已分配端口', value: dashboardStats.with_ports, icon: <Cable className="h-5 w-5" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
      ))}
    </div>
  )
}
