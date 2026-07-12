import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  Cable,
} from 'lucide-react'
import { getDashboardStats } from '@/lib/api/dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/shared/stat-card'

export function StatCards() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  })

  if (isError) {
    return (
      <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6'>
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCard
            key={i}
            title='加载失败'
            value='-'
            icon={<FileText className='h-5 w-5' />}
            tone='red'
          />
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: '报备总数',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.total_records ?? '-')
      ),
      icon: <FileText className='h-5 w-5' />,
      tone: 'blue' as const,
    },
    {
      title: '本月新增',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.new_this_month ?? '-')
      ),
      icon: <PlusCircle className='h-5 w-5' />,
      tone: 'emerald' as const,
    },
    {
      title: '本月变更',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.updated_this_month ?? '-')
      ),
      icon: <RefreshCw className='h-5 w-5' />,
      tone: 'cyan' as const,
    },
    {
      title: '资料不全',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.incomplete ?? '-')
      ),
      icon: <AlertTriangle className='h-5 w-5' />,
      tone: 'red' as const,
    },
    {
      title: '即将到期',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.expiring_soon ?? '-')
      ),
      icon: <Clock className='h-5 w-5' />,
      tone: 'amber' as const,
    },
    {
      title: '已分配端口',
      value: isLoading ? (
        <Skeleton className='h-6 w-12' />
      ) : (
        (data?.main_port_count ?? '-')
      ),
      icon: <Cable className='h-5 w-5' />,
      tone: 'violet' as const,
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6'>
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </div>
  )
}
