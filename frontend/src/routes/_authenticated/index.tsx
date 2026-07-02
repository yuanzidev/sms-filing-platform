import { createFileRoute } from '@tanstack/react-router'
import { StatCards } from '@/features/dashboard/components/stat-cards'
import { TrendChart } from '@/features/dashboard/components/trend-chart'
import { CarrierPieChart } from '@/features/dashboard/components/carrier-pie-chart'
import { PendingList } from '@/features/dashboard/components/pending-list'
import { RecentChanges } from '@/features/dashboard/components/recent-changes'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">工作台</h1>
      <StatCards />
      <div className="grid grid-cols-2 gap-6">
        <TrendChart />
        <CarrierPieChart />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <PendingList />
        <RecentChanges />
      </div>
    </div>
  )
}
