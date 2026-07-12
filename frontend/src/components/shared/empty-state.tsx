import type React from 'react'
import type { ComponentType } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border/80 bg-muted/25 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      <div className='bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-full'>
        <Icon className='h-6 w-6' />
      </div>
      <p className='text-sm font-semibold'>{title}</p>
      {description && (
        <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
          {description}
        </p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}
