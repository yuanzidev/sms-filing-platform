import { useState, useRef, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { Upload, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createQualification, updateQualification, uploadQualificationImage } from '@/lib/api/qualifications'
import type { QualificationInfo } from '@/lib/api/types'

const IMAGE_FIELDS = [
  { name: 'cert_image', label: '单位证件图片' },
  { name: 'responsible_id_front', label: '责任人身份证正面' },
  { name: 'responsible_id_back', label: '责任人身份证反面' },
  { name: 'handler_id_front', label: '经办人身份证正面' },
  { name: 'handler_id_back', label: '经办人身份证反面' },
  { name: 'signature_proof_image', label: '签名举证附件' },
  { name: 'handler_photo', label: '经办人现场照片' },
  { name: 'diversion_proof_image', label: '引流举证附件' },
]

const PANEL_KEYS = [
  'enterprise',
  'legal',
  'responsible',
  'handler',
  'signature_template',
  'business',
  'diversion',
  'images',
] as const

type PanelKey = (typeof PANEL_KEYS)[number]

function makeDefaultOpenMap(isNew: boolean): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const key of PANEL_KEYS) {
    map[key] = isNew
  }
  return map
}

const formSchema = z.object({
  enterprise_name: z.string().min(1, '企业名称不能为空'),
  cert_type: z.string().optional(),
  cert_number: z.string().optional(),
  app_platform_name: z.string().optional(),
  legal_representative_name: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_cert_type: z.string().optional(),
  responsible_cert_number: z.string().optional(),
  responsible_address: z.string().optional(),
  responsible_phone: z.string().optional(),
  handler_name: z.string().optional(),
  handler_cert_type: z.string().optional(),
  handler_cert_number: z.string().optional(),
  handler_address: z.string().optional(),
  handler_phone: z.string().optional(),
  sms_signature: z.string().optional(),
  signature_type: z.string().optional(),
  signature_verified: z.string().optional(),
  is_gateway_signature: z.string().optional(),
  sms_template_content: z.string().optional(),
  template_has_variable: z.string().optional(),
  template_param_type: z.string().optional(),
  template_param_length: z.string().optional(),
  business_attribute: z.string().optional(),
  business_type: z.string().optional(),
  business_subtype: z.string().optional(),
  specific_usage: z.string().optional(),
  diversion_number: z.string().optional(),
  diversion_number_type: z.string().optional(),
  diversion_number_usage: z.string().optional(),
  diversion_content: z.string().optional(),
  link_address: z.string().optional(),
  link_type: z.string().optional(),
  signature: z.string().min(1, '签名不能为空'),
})

type FormData = z.infer<typeof formSchema>

// ─── Helpers ───────────────────────────────────────────────────

function boolToStr(val: boolean | null | undefined): string {
  if (val === true) return 'true'
  if (val === false) return 'false'
  return ''
}

function strToBool(val: string | undefined): boolean | undefined {
  if (val === 'true') return true
  if (val === 'false') return false
  return undefined
}

// ─── Component ─────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  qualification?: QualificationInfo
  onSuccess: () => void
}

export function QualificationDialog({ open, onOpenChange, qualification, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  // Image file state: { fieldKey: File }
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({})
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Collapsible panel state
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>(
    () => makeDefaultOpenMap(!qualification),
  )

  // ── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const { signature_verified, is_gateway_signature, template_has_variable, ...rest } = data
      const apiData: Partial<QualificationInfo> = {
        ...rest,
        signature_verified: strToBool(signature_verified),
        is_gateway_signature: strToBool(is_gateway_signature),
        template_has_variable: strToBool(template_has_variable),
      }
      return createQualification(apiData)
    },
    onSuccess: async (result) => {
      toast.success('资质创建成功')
      // Upload images after record is created
      const id = result.id
      if (Object.keys(imageFiles).length > 0) {
        setUploading(true)
        for (const [fieldKey, file] of Object.entries(imageFiles)) {
          const fieldDef = IMAGE_FIELDS.find(f => f.name === fieldKey)
          try {
            await uploadQualificationImage(id, file, fieldDef?.label || fieldKey)
          } catch {
            toast.error(`${fieldDef?.label || fieldKey} 上传失败`)
          }
        }
        setUploading(false)
      }
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      queryClient.invalidateQueries({ queryKey: ['qualification-attachments'] })
      onSuccess()
      onOpenChange(false)
      cleanupImages()
    },
    onError: () => toast.error('资质创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => {
      const { signature_verified, is_gateway_signature, template_has_variable, ...rest } = data
      const apiData: Partial<QualificationInfo> = {
        ...rest,
        signature_verified: strToBool(signature_verified),
        is_gateway_signature: strToBool(is_gateway_signature),
        template_has_variable: strToBool(template_has_variable),
      }
      return updateQualification(id, apiData)
    },
    onSuccess: async (_, variables) => {
      toast.success('资质更新成功')
      if (Object.keys(imageFiles).length > 0) {
        setUploading(true)
        for (const [fieldKey, file] of Object.entries(imageFiles)) {
          const fieldDef = IMAGE_FIELDS.find(f => f.name === fieldKey)
          try {
            await uploadQualificationImage(variables.id, file, fieldDef?.label || fieldKey)
          } catch {
            toast.error(`${fieldDef?.label || fieldKey} 上传失败`)
          }
        }
        setUploading(false)
      }
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      queryClient.invalidateQueries({ queryKey: ['qualification-attachments'] })
      onSuccess()
      onOpenChange(false)
      cleanupImages()
    },
    onError: () => toast.error('资质更新失败'),
  })

  // ── Image handlers ──────────────────────────────────────────

  const cleanupImages = () => {
    setImagePreviews(prev => {
      for (const url of Object.values(prev)) {
        URL.revokeObjectURL(url)
      }
      return {}
    })
    setImageFiles({})
  }

  const handleImageSelect = (fieldKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFiles(prev => ({ ...prev, [fieldKey]: file }))
    const url = URL.createObjectURL(file)
    setImagePreviews(prev => {
      const old = prev[fieldKey]
      if (old) URL.revokeObjectURL(old)
      return { ...prev, [fieldKey]: url }
    })
  }

  const handleRemoveImage = (fieldKey: string) => () => {
    setImageFiles(prev => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
    setImagePreviews(prev => {
      const next = { ...prev }
      if (next[fieldKey]) URL.revokeObjectURL(next[fieldKey])
      delete next[fieldKey]
      return next
    })
  }

  // ── Form ────────────────────────────────────────────────────

  const defaultValues: FormData = qualification
    ? {
        enterprise_name: qualification.enterprise_name,
        cert_type: qualification.cert_type || '',
        cert_number: qualification.cert_number || '',
        app_platform_name: qualification.app_platform_name || '',
        legal_representative_name: qualification.legal_representative_name || '',
        responsible_name: qualification.responsible_name || '',
        responsible_cert_type: qualification.responsible_cert_type || '',
        responsible_cert_number: qualification.responsible_cert_number || '',
        responsible_address: qualification.responsible_address || '',
        responsible_phone: qualification.responsible_phone || '',
        handler_name: qualification.handler_name || '',
        handler_cert_type: qualification.handler_cert_type || '',
        handler_cert_number: qualification.handler_cert_number || '',
        handler_address: qualification.handler_address || '',
        handler_phone: qualification.handler_phone || '',
        sms_signature: qualification.sms_signature || '',
        signature_type: qualification.signature_type || '',
        signature_verified: boolToStr(qualification.signature_verified),
        is_gateway_signature: boolToStr(qualification.is_gateway_signature),
        sms_template_content: qualification.sms_template_content || '',
        template_has_variable: boolToStr(qualification.template_has_variable),
        template_param_type: qualification.template_param_type || '',
        template_param_length: qualification.template_param_length || '',
        business_attribute: qualification.business_attribute || '',
        business_type: qualification.business_type || '',
        business_subtype: qualification.business_subtype || '',
        specific_usage: qualification.specific_usage || '',
        diversion_number: qualification.diversion_number || '',
        diversion_number_type: qualification.diversion_number_type || '',
        diversion_number_usage: qualification.diversion_number_usage || '',
        diversion_content: qualification.diversion_content || '',
        link_address: qualification.link_address || '',
        link_type: qualification.link_type || '',
        signature: qualification.signature || '',
      }
    : {
        enterprise_name: '',
        cert_type: '',
        cert_number: '',
        app_platform_name: '',
        legal_representative_name: '',
        responsible_name: '',
        responsible_cert_type: '',
        responsible_cert_number: '',
        responsible_address: '',
        responsible_phone: '',
        handler_name: '',
        handler_cert_type: '',
        handler_cert_number: '',
        handler_address: '',
        handler_phone: '',
        sms_signature: '',
        signature_type: '',
        signature_verified: '',
        is_gateway_signature: '',
        sms_template_content: '',
        template_has_variable: '',
        template_param_type: '',
        template_param_length: '',
        business_attribute: '',
        business_type: '',
        business_subtype: '',
        specific_usage: '',
        diversion_number: '',
        diversion_number_type: '',
        diversion_number_usage: '',
        diversion_content: '',
        link_address: '',
        link_type: '',
        signature: '',
      }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const onSubmit = (data: FormData) => {
    if (qualification) {
      updateMutation.mutate({ id: qualification.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  useEffect(() => {
    if (open) {
      cleanupImages()
      form.reset(defaultValues)
      setOpenPanels(makeDefaultOpenMap(!qualification))
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const isPending = createMutation.isPending || updateMutation.isPending || uploading

  // ── Collapsible panel helper ────────────────────────────────

  function Panel({
    panelKey,
    title,
    children,
  }: {
    panelKey: PanelKey
    title: string
    children: React.ReactNode
  }) {
    return (
      <Collapsible
        open={openPanels[panelKey]}
        onOpenChange={(open) => setOpenPanels(prev => ({ ...prev, [panelKey]: open }))}
        className="border-t pt-4"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer group">
          <h3 className="text-sm font-semibold">{title}</h3>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              openPanels[panelKey] && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {children}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle>{qualification ? '编辑资质' : '新建资质'}</DialogTitle>
          <DialogDescription>
            {qualification ? '修改企业资质信息' : '创建新的企业资质信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-6 py-4">

            {/* ── 企业信息 ──────────────────────────────────── */}
            <Panel panelKey="enterprise" title="企业信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="enterprise_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>企业名称 *</FormLabel>
                      <FormControl>
                        <Input placeholder="企业全称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cert_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件类型</FormLabel>
                      <FormControl>
                        <Input placeholder="如: 营业执照" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cert_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件号码</FormLabel>
                      <FormControl>
                        <Input placeholder="统一社会信用代码" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="app_platform_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>应用/平台名称</FormLabel>
                      <FormControl>
                        <Input placeholder="应用或平台名称" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 法人信息 ──────────────────────────────────── */}
            <Panel panelKey="legal" title="法人信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="legal_representative_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>法人姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="法人代表姓名" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 责任人信息 ────────────────────────────────── */}
            <Panel panelKey="responsible" title="责任人信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responsible_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="责任人姓名" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsible_cert_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件类型</FormLabel>
                      <FormControl>
                        <Input placeholder="如: 身份证" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsible_cert_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件号码</FormLabel>
                      <FormControl>
                        <Input placeholder="责任人证件号" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsible_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>地址</FormLabel>
                      <FormControl>
                        <Input placeholder="责任人地址" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsible_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="手机号码" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 经办人信息 ────────────────────────────────── */}
            <Panel panelKey="handler" title="经办人信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="handler_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="经办人姓名" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="handler_cert_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件类型</FormLabel>
                      <FormControl>
                        <Input placeholder="如: 身份证" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="handler_cert_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>证件号码</FormLabel>
                      <FormControl>
                        <Input placeholder="经办人证件号" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="handler_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>地址</FormLabel>
                      <FormControl>
                        <Input placeholder="经办人地址" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="handler_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="手机号码" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 签名与模板 ────────────────────────────────── */}
            <Panel panelKey="signature_template" title="签名与模板">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>签名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="如：张三 经办" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sms_signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>短信签名</FormLabel>
                      <FormControl>
                        <Input placeholder="报备用短信签名" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signature_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>签名类型</FormLabel>
                      <FormControl>
                        <Input placeholder="签名类型" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signature_verified"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>签名核验</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">是</SelectItem>
                          <SelectItem value="false">否</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_gateway_signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>是否网关签名</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">是</SelectItem>
                          <SelectItem value="false">否</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sms_template_content"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>短信模板内容</FormLabel>
                      <FormControl>
                        <Input placeholder="模板内容" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="template_has_variable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模板含变量</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">是</SelectItem>
                          <SelectItem value="false">否</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="template_param_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>参数类型</FormLabel>
                      <FormControl>
                        <Input placeholder="参数类型" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="template_param_length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>参数长度</FormLabel>
                      <FormControl>
                        <Input placeholder="参数长度" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 业务信息 ──────────────────────────────────── */}
            <Panel panelKey="business" title="业务信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="business_attribute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>业务属性</FormLabel>
                      <FormControl>
                        <Input placeholder="业务属性" {...field} value={field.value || ''} />
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
                        <Input placeholder="业务类型" {...field} value={field.value || ''} />
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
                      <FormLabel>业务子类</FormLabel>
                      <FormControl>
                        <Input placeholder="业务子类" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specific_usage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>具体用途</FormLabel>
                      <FormControl>
                        <Input placeholder="具体用途说明" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 引流信息 ──────────────────────────────────── */}
            <Panel panelKey="diversion" title="引流信息">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diversion_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>引流号码</FormLabel>
                      <FormControl>
                        <Input placeholder="引流号码" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diversion_number_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>号码类型</FormLabel>
                      <FormControl>
                        <Input placeholder="号码类型" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diversion_number_usage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>引流用途</FormLabel>
                      <FormControl>
                        <Input placeholder="引流用途说明" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diversion_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>引流内容</FormLabel>
                      <FormControl>
                        <Input placeholder="引流内容" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="link_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>链接地址</FormLabel>
                      <FormControl>
                        <Input placeholder="链接 URL" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="link_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>链接类型</FormLabel>
                      <FormControl>
                        <Input placeholder="链接类型" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Panel>

            {/* ── 证件图片 ──────────────────────────────────── */}
            <Panel panelKey="images" title="证件图片">
              <div className="grid grid-cols-2 gap-4">
                {IMAGE_FIELDS.map((field) => (
                  <div key={field.name}>
                    <FormLabel className="mb-1 block">{field.label}</FormLabel>
                    {imagePreviews[field.name] ? (
                      <div className="relative rounded border overflow-hidden">
                        <img
                          src={imagePreviews[field.name]}
                          alt={field.label}
                          className="h-32 w-full object-contain bg-muted"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                          onClick={handleRemoveImage(field.name)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex h-32 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50"
                        onClick={() => fileRefs.current[field.name]?.click()}
                      >
                        <Upload className="h-5 w-5 mb-1" />
                        <span className="text-xs">上传图片</span>
                      </div>
                    )}
                    <input
                      ref={(el) => { fileRefs.current[field.name] = el }}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect(field.name)}
                      className="hidden"
                    />
                  </div>
                ))}
              </div>
            </Panel>

            </div>

            <DialogFooter className="shrink-0 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '处理中...' : (qualification ? '更新' : '创建')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
