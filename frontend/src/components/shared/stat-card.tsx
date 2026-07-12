import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: React.ReactNode
  icon?: React.ReactNode
  tone?: 'blue' | 'cyan' | 'amber' | 'red' | 'violet' | 'emerald'
}

const toneClassNames: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  red: 'bg-red-50 text-red-600 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  violet:
    'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
}

export function StatCard({ title, value, icon, tone = 'blue' }: StatCardProps) {
  return (
    <Card className='overflow-hidden py-0'>
      <CardContent className='flex items-center gap-4 p-4'>
        {icon && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1',
              toneClassNames[tone]
            )}
          >
            {icon}
          </div>
        )}
        <div className='min-w-0'>
          <p className='text-muted-foreground truncate text-sm'>{title}</p>
          <p className='mt-1 text-2xl font-bold tracking-tight'>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
