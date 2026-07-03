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
import type { PortInfo } from '@/lib/api/types'

const formSchema = z.object({
  carrier: z.string().min(1, '运营商不能为空'),
  operation_type: z.string().optional(),
  main_port_number: z.string().optional(),
  sub_port_number: z.string().optional(),
  port_range: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  port_type: z.string().optional(),
  port_activation_date: z.string().optional(),
  allow_self_extension: z.boolean().optional(),
  business_attribute: z.string().optional(),
  business_type: z.string().optional(),
  business_subtype: z.string().optional(),
  specific_usage: z.string().optional(),
  sms_signature: z.string().optional(),
  is_gateway_signature: z.boolean().optional(),
  carrier_room: z.string().optional(),
  enterprise_room: z.string().optional(),
  has_authorization: z.boolean().optional(),
  auth_start_date: z.string().optional(),
  auth_end_date: z.string().optional(),
  sms_template_content: z.string().optional(),
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
    operation_type: p?.operation_type || '',
    main_port_number: p?.main_port_number || '',
    sub_port_number: p?.sub_port_number || '',
    port_range: p?.port_range || '',
    province: p?.province || '',
    city: p?.city || '',
    port_type: p?.port_type || '',
    port_activation_date: p?.port_activation_date || '',
    allow_self_extension: p?.allow_self_extension ?? false,
    business_attribute: p?.business_attribute || '',
    business_type: p?.business_type || '',
    business_subtype: p?.business_subtype || '',
    specific_usage: p?.specific_usage || '',
    sms_signature: p?.sms_signature || '',
    is_gateway_signature: p?.is_gateway_signature ?? false,
    carrier_room: p?.carrier_room || '',
    enterprise_room: p?.enterprise_room || '',
    has_authorization: p?.has_authorization ?? false,
    auth_start_date: p?.auth_start_date || '',
    auth_end_date: p?.auth_end_date || '',
    sms_template_content: p?.sms_template_content || '',
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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset(toDefaultValues(portInfo))
    }
    onOpenChange(newOpen)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{portInfo ? '编辑端口信息' : '新建端口信息'}</DialogTitle>
          <DialogDescription>
            {portInfo ? '修改端口详细信息' : '创建新的端口详细信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="operation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>操作类型</FormLabel>
                    <FormControl>
                      <Input placeholder="新增/变更" {...field} value={field.value || ''} />
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
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>省份</FormLabel>
                    <FormControl>
                      <Input placeholder="省份" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>城市</FormLabel>
                    <FormControl>
                      <Input placeholder="城市" {...field} value={field.value || ''} />
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
                      <Input placeholder="YYYY-MM-DD" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">业务信息</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="business_attribute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>业务属性</FormLabel>
                      <FormControl>
                        <Input placeholder="政务/商用" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>业务类型</FormLabel>
                      <FormControl>
                        <Input placeholder="短信验证码/通知" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business_subtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>业务子类型</FormLabel>
                      <FormControl>
                        <Input placeholder="子类型" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specific_usage"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>具体用途</FormLabel>
                      <FormControl>
                        <Input placeholder="具体用途描述" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">签名与机房</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sms_signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>短信签名</FormLabel>
                      <FormControl>
                        <Input placeholder="【品牌名】" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_gateway_signature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                      <FormControl>
                        <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">网关签名</FormLabel>
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
                        <Input placeholder="运营商机房" {...field} value={field.value || ''} />
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
                        <Input placeholder="企业机房" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">授权配置</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="has_authorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                      <FormControl>
                        <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">有授权书</FormLabel>
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
                        <Input placeholder="YYYY-MM-DD" {...field} value={field.value || ''} />
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
                        <Input placeholder="YYYY-MM-DD" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="sms_template_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>短信模板内容</FormLabel>
                  <FormControl>
                    <Input placeholder="模板正文" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_self_extension"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">允许自扩展</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
