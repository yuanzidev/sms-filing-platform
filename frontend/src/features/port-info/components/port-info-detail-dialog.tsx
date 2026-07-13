import { useQuery } from '@tanstack/react-query'
import { XIcon } from 'lucide-react'
import { getPortInfo } from '@/lib/api/port-info'
import type { PortInfo } from '@/lib/api/types'
import { formatCN } from '@/lib/time'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  portInfo: PortInfo
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className='flex items-start gap-3 py-1.5'>
      <span className='text-muted-foreground shrink-0 text-sm'>{label}</span>
      <span className='text-sm'>
        {value != null && value !== '' ? String(value) : '-'}
      </span>
    </div>
  )
}

function booleanText(value: boolean | null) {
  if (value == null) return '-'
  return value ? '是' : '否'
}

function displayDateTime(value: string | null | undefined) {
  return value ? formatCN(value) : '-'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className='mb-2 border-b pb-1 text-sm font-semibold'>{title}</h4>
      {children}
    </div>
  )
}

export function PortInfoDetailDialog({
  open,
  onOpenChange,
  portInfo,
}: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['port-info-detail', portInfo.id],
    queryFn: () => getPortInfo(portInfo.id),
    enabled: open,
  })

  const d = detail ?? portInfo
  const titlePort = d.main_port_number || d.sub_port_number || d.port_range || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='flex max-h-[92vh] w-[calc(100vw-4rem)] max-w-[1200px] sm:max-w-[1200px] flex-col gap-0 overflow-hidden p-0'
      >
        <DialogHeader className='shrink-0 border-b px-6 py-3'>
          <div className='flex items-start justify-between gap-4'>
            <DialogTitle>端口详情 — {titlePort}</DialogTitle>
            <DialogClose asChild>
              <Button type='button' variant='ghost' size='icon' className='-mt-1 -mr-2 size-8 shrink-0' aria-label='关闭'>
                <XIcon className='h-4 w-4' />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-1/2' />
            </div>
          ) : (
            <div className='grid gap-x-8 gap-y-6 md:grid-cols-2'>
              <Section title='基础信息'>
                <FieldRow label='运营商' value={d.carrier} />
                <FieldRow label='主端口号' value={d.main_port_number} />
                <FieldRow label='子端口号' value={d.sub_port_number} />
                <FieldRow label='端口范围' value={d.port_range} />
                <FieldRow label='端口类型' value={d.port_type} />
                <FieldRow label='客户类型' value={d.customer_type} />
                <FieldRow label='端口开通日期' value={d.port_activation_date} />
              </Section>

              <Section title='接入信息'>
                <FieldRow label='省份' value={d.province} />
                <FieldRow label='城市' value={d.city} />
                <FieldRow label='所属地区' value={d.region} />
                <FieldRow label='集团编码' value={d.group_code} />
              </Section>

              <Section title='机房与授权'>
                <FieldRow label='运营商机房' value={d.carrier_room} />
                <FieldRow label='企业机房' value={d.enterprise_room} />
                <FieldRow label='其他机房说明' value={d.other_room_description} />
                <FieldRow label='是否具有授权书' value={booleanText(d.has_authorization)} />
                <FieldRow label='授权开始日期' value={d.auth_start_date} />
                <FieldRow label='授权截止日期' value={d.auth_end_date} />
              </Section>

              <Section title='扩展配置'>
                <FieldRow label='允许自行扩展' value={booleanText(d.allow_self_extension)} />
                <FieldRow label='是否绿色通道' value={booleanText(d.is_green_channel)} />
                <FieldRow label='黑白名单类型' value={d.blacklist_whitelist_type} />
                <FieldRow label='端口审核表' value={d.audit_form} />
              </Section>

              <Section title='时间信息'>
                <FieldRow label='创建时间' value={displayDateTime(d.created_at)} />
                <FieldRow label='更新时间' value={displayDateTime(d.updated_at)} />
              </Section>
            </div>
          )}
        </div>

        <div className='flex shrink-0 justify-end border-t px-6 py-3'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
