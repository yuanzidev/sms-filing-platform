import type React from 'react'
import type { ComponentType } from 'react'
import {
  Download,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ActionTone = 'default' | 'view' | 'edit' | 'delete' | 'download' | 'upload'

const toneClassNames: Record<ActionTone, string> = {
  default: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  view: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10',
  edit: 'text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-500/10',
  delete:
    'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10',
  download:
    'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10',
  upload:
    'text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-500/10',
}

const actionIcons = {
  view: Eye,
  hide: EyeOff,
  edit: Pencil,
  delete: Trash2,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
} satisfies Record<string, ComponentType<{ className?: string }>>

interface ActionIconButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> {
  label: string
  icon: keyof typeof actionIcons | ComponentType<{ className?: string }>
  tone?: ActionTone
  showLabel?: boolean
}

export function ActionIconButton({
  label,
  icon,
  tone = 'default',
  showLabel = false,
  className,
  ...props
}: ActionIconButtonProps) {
  const Icon = typeof icon === 'string' ? actionIcons[icon] : icon

  const button = (
    <Button
      type='button'
      variant='ghost'
      size={showLabel ? 'sm' : 'icon'}
      className={cn(
        showLabel ? 'h-8 px-2.5' : 'size-8',
        toneClassNames[tone],
        className
      )}
      aria-label={label}
      {...props}
    >
      <Icon className='h-4 w-4' />
      {showLabel && <span>{label}</span>}
    </Button>
  )

  if (showLabel) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side='top'>{label}</TooltipContent>
    </Tooltip>
  )
}
