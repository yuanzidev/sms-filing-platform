import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createPortInfo, updatePortInfo } from '@/lib/api/port-info'
import { ProvinceCityFields } from '@/components/shared/province-city-fields'
import { DatePicker } from '@/components/ui/date-picker-single'
import type { PortInfo } from '@/lib/api/types'

const formSchema = z.object({
  carrier: z.string().min(1, '运营商不能为空'),
  main_port_number: z.string().optional(),
  sub_port_number: z.string().optional(),
  port_range: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  port_type: z.string().optional(),
  port_activation_date: z.string().optional(),
  allow_self_extension: z.boolean().optional(),
  carrier_room: z.string().optional(),
  enterprise_room: z.string().optional(),
  has_authorization: z.boolean().optional(),
  auth_start_date: z.string().optional(),
  auth_end_date: z.string().optional(),
  group_code: z.string().optional(),
  region: z.string().optional(),
  other_room_description: z.string().optional(),
  is_green_channel: z.boolean().optional(),
  blacklist_whitelist_type: z.string().optional(),
  audit_form: z.string().optional(),
  customer_type: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  portInfo?: PortInfo
  onSuccess: () => void
}

function toDefaultValues(p?: PortInfo): FormData {
  return {
    carrier: p?.carrier || '',
    main_port_number: p?.main_port_number || '',
    sub_port_number: p?.sub_port_number || '',
    port_range: p?.port_range || '',
    province: p?.province || '',
    city: p?.city || '',
    port_type: p?.port_type || '',
    port_activation_date: p?.port_activation_date || '',
    allow_self_extension: p?.allow_self_extension ?? false,
    carrier_room: p?.carrier_room || '',
    enterprise_room: p?.enterprise_room || '',
    has_authorization: p?.has_authorization ?? false,
    auth_start_date: p?.auth_start_date || '',
    auth_end_date: p?.auth_end_date || '',
    group_code: p?.group_code || '',
    region: p?.region || '',
    other_room_description: p?.other_room_description || '',
    is_green_channel: p?.is_green_channel ?? false,
    blacklist_whitelist_type: p?.blacklist_whitelist_type || '',
    audit_form: p?.audit_form || '',
    customer_type: p?.customer_type || '',
  }
}

export function PortInfoDialog({ open, onOpenChange, portInfo, onSuccess }: Props) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: FormData) => createPortInfo(data),
    onSuccess: () => {
      toast.success('端口信息创建成功')
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('端口信息创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updatePortInfo(id, data),
    onSuccess: () => {
      toast.success('端口信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('端口信息更新失败'),
  })

  const defaultValues = toDefaultValues(portInfo)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const onSubmit = (data: FormData) => {
    if (portInfo) {
      updateMutation.mutate({ id: portInfo.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(portInfo))
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>{portInfo ? '编辑端口信息' : '新建端口信息'}</DialogTitle>
          <DialogDescription>
            {portInfo ? '修改端口详细信息' : '创建新的端口详细信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>运营商 *</FormLabel>
                    <FormControl>
                      <Input placeholder="移动/联通/电信" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口类型</FormLabel>
                    <FormControl>
                      <Input placeholder="主端口/子端口" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="main_port_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主端口号</FormLabel>
                    <FormControl>
                      <Input placeholder="主端口号码" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sub_port_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>子端口号</FormLabel>
                    <FormControl>
                      <Input placeholder="子端口号码" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port_range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口范围</FormLabel>
                    <FormControl>
                      <Input placeholder="端口号段" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port_activation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口开通日期</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <ProvinceCityFields form={form} />
              </div>
              <FormField
                control={form.control}
                name="group_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>集团编码</FormLabel>
                    <FormControl>
                      <Input placeholder="集团编码" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属地区</FormLabel>
                    <FormControl>
                      <Input placeholder="所属地区" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carrier_room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>运营商机房</FormLabel>
                    <FormControl>
                      <Input placeholder="运营商接入机房及设备" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enterprise_room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>企业机房</FormLabel>
                    <FormControl>
                      <Input placeholder="企业接入机房及设备" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="other_room_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>其他接入机房说明</FormLabel>
                    <FormControl>
                      <Input placeholder="其他机房说明" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_authorization"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">是否具有授权书</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="auth_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权开始日期</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="auth_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权截止日期</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allow_self_extension"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">是否允许自行扩展</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_green_channel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">是否绿色通道</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="blacklist_whitelist_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>黑白名单类型</FormLabel>
                    <FormControl>
                      <Input placeholder="黑名单/白名单/无" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audit_form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口审核表</FormLabel>
                    <FormControl>
                      <Input placeholder="审核表信息" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户类型</FormLabel>
                    <FormControl>
                      <Input placeholder="企业/个人" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </div>

            <DialogFooter className="shrink-0 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '处理中...' : (portInfo ? '更新' : '创建')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
