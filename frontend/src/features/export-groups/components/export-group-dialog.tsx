import { useState, useEffect } from 'react'
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
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import type { ExportGroup } from '@/lib/api/types'

const AVAILABLE_FIELDS = [
  // 端口信息
  { key: 'carrier', label: '运营商' },
  { key: 'main_port_number', label: '主端口号' },
  { key: 'sub_port_number', label: '子端口号' },
  { key: 'port_range', label: '码号使用范围' },
  { key: 'province', label: '接入省' },
  { key: 'city', label: '接入地市' },
  { key: 'port_type', label: '端口类型' },
  { key: 'port_activation_date', label: '端口入网时间' },
  { key: 'allow_self_extension', label: '是否允许自行扩展' },
  { key: 'carrier_room', label: '运营商接入机房及设备' },
  { key: 'enterprise_room', label: '企业接入机房及设备' },
  { key: 'has_authorization', label: '是否具有授权书' },
  { key: 'auth_start_date', label: '授权开始日期' },
  { key: 'auth_end_date', label: '授权结束日期' },
  { key: 'group_code', label: '集团编码' },
  { key: 'region', label: '所属地区' },
  { key: 'other_room_description', label: '其他接入机房说明' },
  { key: 'is_green_channel', label: '是否绿色通道' },
  { key: 'blacklist_whitelist_type', label: '黑白名单类型' },
  { key: 'audit_form', label: '端口审核表' },
  { key: 'customer_type', label: '客户类型' },
  // 资质信息
  { key: 'enterprise_name', label: '企业名称' },
  { key: 'cert_type', label: '单位证件类型' },
  { key: 'cert_number', label: '单位证件号码' },
  { key: 'app_platform_name', label: 'APP/平台名称' },
  { key: 'legal_representative_name', label: '法人姓名' },
  { key: 'responsible_name', label: '责任人姓名' },
  { key: 'responsible_cert_type', label: '责任人证件类型' },
  { key: 'responsible_cert_number', label: '责任人证件号码' },
  { key: 'responsible_address', label: '责任人证件地址' },
  { key: 'responsible_phone', label: '责任人手机号' },
  { key: 'handler_name', label: '经办人姓名' },
  { key: 'handler_cert_type', label: '经办人证件类型' },
  { key: 'handler_cert_number', label: '经办人证件号码' },
  { key: 'handler_address', label: '经办人证件地址' },
  { key: 'handler_phone', label: '经办人手机号' },
  { key: 'sms_signature', label: '短信签名' },
  { key: 'signature_type', label: '签名类型/来源' },
  { key: 'signature_verified', label: '是否签名校验' },
  { key: 'is_gateway_signature', label: '是否网关签名' },
  { key: 'sms_template_content', label: '短信模板内容' },
  { key: 'template_has_variable', label: '模板是否包含变量' },
  { key: 'template_param_type', label: '模板参数类型' },
  { key: 'template_param_length', label: '模板参数长度' },
  { key: 'business_attribute', label: '业务属性' },
  { key: 'business_type', label: '业务类型' },
  { key: 'business_subtype', label: '业务细类' },
  { key: 'specific_usage', label: '具体用途' },
  { key: 'diversion_number', label: '引流号码' },
  { key: 'diversion_number_type', label: '引流号码类型' },
  { key: 'diversion_number_usage', label: '引流号码用途' },
  { key: 'diversion_content', label: '引流内容' },
  { key: 'link_address', label: '链接地址' },
  { key: 'link_type', label: '链接类型' },
  { key: 'enterprise_name', label: '企业名称' },
  { key: 'operation_type', label: '操作类型' },
  { key: 'authorization_letter', label: '授权书' },
  { key: 'legal_representative_cert_type', label: '法人证件类型' },
  { key: 'legal_representative_cert_number', label: '法人证件号码' },
  { key: 'legal_representative_cert_address', label: '法人证件地址' },
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
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (group?.fields?.length) {
      setSelectedFields(
        [...group.fields]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((f) => f.field_name)
      )
    } else {
      setSelectedFields([])
    }
    form.reset({
      name: group?.name ?? '',
      description: group?.description ?? '',
    })
  }, [open])

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const idx = prev.indexOf(key)
      if (idx >= 0) return prev.filter((k) => k !== key)
      return [...prev, key]
    })
  }

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    setSelectedFields((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (idx: number) => {
    setSelectedFields((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const removeField = (key: string) => {
    setSelectedFields((prev) => prev.filter((k) => k !== key))
  }

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const fields = selectedFields.map((key, idx) => {
      const fieldDef = AVAILABLE_FIELDS.find((f) => f.key === key)!
      return { field_name: key, field_label: fieldDef.label, sort_order: idx }
    })
    await onSubmit({ name: data.name, description: data.description ?? '', fields })
    onOpenChange(false)
    form.reset()
    setSelectedFields([])
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
              <FormLabel className="mb-2 block">选择字段（已选 {selectedFields.length} 项）</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                {/* 左栏：可选字段 */}
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  <div className="space-y-0.5">
                    {AVAILABLE_FIELDS.map((f) => (
                      <label
                        key={f.key}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                      >
                        <Checkbox
                          checked={selectedFields.includes(f.key)}
                          onCheckedChange={() => toggleField(f.key)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                {/* 右栏：已选字段排序 */}
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  {selectedFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      请在左侧勾选字段
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {selectedFields.map((key, idx) => {
                        const fieldDef = AVAILABLE_FIELDS.find((f) => f.key === key)!
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-1 text-sm rounded px-2 py-1.5 hover:bg-muted/50"
                          >
                            <span className="text-muted-foreground w-5 text-xs">{idx + 1}.</span>
                            <span className="flex-1 truncate">{fieldDef.label}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={idx === 0}
                              onClick={() => moveUp(idx)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={idx === selectedFields.length - 1}
                              onClick={() => moveDown(idx)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeField(key)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
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
