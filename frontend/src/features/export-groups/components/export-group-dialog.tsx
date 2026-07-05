import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ExportGroup } from '@/lib/api/types'

const AVAILABLE_FIELDS = [
  { key: 'carrier', label: '运营商' },
  { key: 'operation_type', label: '操作类型' },
  { key: 'main_port_number', label: '主端口号' },
  { key: 'sub_port_number', label: '子端口号' },
  { key: 'port_range', label: '码号使用范围' },
  { key: 'province', label: '接入省' },
  { key: 'city', label: '接入地市' },
  { key: 'port_type', label: '端口类型' },
  { key: 'port_activation_date', label: '端口入网时间' },
  { key: 'allow_self_extension', label: '是否允许自行扩展' },
  { key: 'business_attribute', label: '业务属性' },
  { key: 'business_type', label: '业务类型' },
  { key: 'business_subtype', label: '业务细类' },
  { key: 'specific_usage', label: '具体用途' },
  { key: 'sms_signature', label: '短信签名' },
  { key: 'is_gateway_signature', label: '是否网关签名' },
  { key: 'carrier_room', label: '运营商接入机房及设备' },
  { key: 'enterprise_room', label: '企业接入机房及设备' },
  { key: 'has_authorization', label: '是否具有授权书' },
  { key: 'auth_start_date', label: '授权开始日期' },
  { key: 'auth_end_date', label: '授权结束日期' },
  { key: 'sms_template_content', label: '短信模板内容' },
  { key: 'submit_unit', label: '报送单位' },
  { key: 'carrier_enterprise_id', label: '运营商企业ID' },
  { key: 'enterprise_name', label: '企业名称' },
  { key: 'cert_type', label: '单位证件类型' },
  { key: 'cert_number', label: '单位证件号码' },
  { key: 'app_platform_name', label: 'APP/平台名称' },
  { key: 'group_code', label: '集团编码' },
  { key: 'responsible_name', label: '责任人姓名' },
  { key: 'responsible_cert_type', label: '责任人证件类型' },
  { key: 'responsible_cert_number', label: '责任人证件号码' },
  { key: 'responsible_phone', label: '责任人手机号' },
  { key: 'handler_name', label: '经办人姓名' },
  { key: 'handler_cert_type', label: '经办人证件类型' },
  { key: 'handler_cert_number', label: '经办人证件号码' },
  { key: 'handler_phone', label: '经办人手机号' },
]

const formSchema = z.object({
  name: z.string().min(1, '请输入字段组名称'),
  description: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: ExportGroup
  onSubmit: (data: {
    name: string; description: string;
    fields: { field_name: string; field_label: string; sort_order: number }[];
  }) => Promise<void>
}

export function ExportGroupDialog({ open, onOpenChange, group, onSubmit }: Props) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() =>
    new Set(group?.fields?.map((f) => f.field_name) ?? [])
  )

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
    },
  })

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const fields = Array.from(selectedFields).map((key, idx) => {
      const fieldDef = AVAILABLE_FIELDS.find((f) => f.key === key)!
      return { field_name: key, field_label: fieldDef.label, sort_order: idx }
    })
    await onSubmit({ name: data.name, description: data.description ?? '', fields })
    onOpenChange(false)
    form.reset()
    setSelectedFields(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? '编辑字段组' : '新建字段组'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl><Input placeholder="如: 完整导出字段组" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl><Textarea placeholder="字段组的用途说明" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel className="mb-2 block">选择字段（已选 {selectedFields.size} 项）</FormLabel>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                      <Checkbox
                        checked={selectedFields.has(f.key)}
                        onCheckedChange={() => toggleField(f.key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit">{group ? '保存' : '创建'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
