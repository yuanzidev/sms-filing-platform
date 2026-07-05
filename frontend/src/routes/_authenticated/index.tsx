import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StatCards } from '@/features/dashboard/components/stat-cards'
import { TrendChart } from '@/features/dashboard/components/trend-chart'
import { CarrierPieChart } from '@/features/dashboard/components/carrier-pie-chart'
import { PendingList } from '@/features/dashboard/components/pending-list'
import { ExpiringAuthList } from '@/features/dashboard/components/expiring-auth-list'
import { RecentChanges } from '@/features/dashboard/components/recent-changes'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>工作台</h2>
            <p className='text-muted-foreground'>
              SMS 报备管理平台数据概览
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <StatCards />
          <div className="grid grid-cols-2 gap-6">
            <TrendChart />
            <CarrierPieChart />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <PendingList />
            <RecentChanges />
          </div>
          <ExpiringAuthList />
        </div>
      </Main>
    </>
  )
}
