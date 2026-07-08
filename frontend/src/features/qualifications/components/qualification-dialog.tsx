import { useState, useRef } from 'react'
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
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import { createQualification, updateQualification, uploadQualificationImage } from '@/lib/api/qualifications'
import type { QualificationInfo } from '@/lib/api/types'

const IMAGE_FIELDS = [
  { name: 'cert_image', label: '单位证件图片' },
  { name: 'responsible_id_front', label: '责任人身份证正面' },
  { name: 'responsible_id_back', label: '责任人身份证反面' },
  { name: 'handler_id_front', label: '经办人身份证正面' },
  { name: 'handler_id_back', label: '经办人身份证反面' },
]

const formSchema = z.object({
  enterprise_name: z.string().min(1, '企业名称不能为空'),
  submit_unit: z.string().optional(),
  carrier_enterprise_id: z.string().optional(),
  cert_type: z.string().optional(),
  cert_number: z.string().optional(),
  app_platform_name: z.string().optional(),
  group_code: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_cert_type: z.string().optional(),
  responsible_cert_number: z.string().optional(),
  responsible_phone: z.string().optional(),
  handler_name: z.string().optional(),
  handler_cert_type: z.string().optional(),
  handler_cert_number: z.string().optional(),
  handler_phone: z.string().optional(),
  signature: z.string().min(1, '签名不能为空'),
})

type FormData = z.infer<typeof formSchema>

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

  const createMutation = useMutation({
    mutationFn: (data: FormData) => createQualification(data),
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
      setImageFiles({})
      setImagePreviews({})
    },
    onError: () => toast.error('资质创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateQualification(id, data),
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
      setImageFiles({})
      setImagePreviews({})
    },
    onError: () => toast.error('资质更新失败'),
  })

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

  const defaultValues = qualification
    ? {
        enterprise_name: qualification.enterprise_name,
        submit_unit: qualification.submit_unit || '',
        carrier_enterprise_id: qualification.carrier_enterprise_id || '',
        cert_type: qualification.cert_type || '',
        cert_number: qualification.cert_number || '',
        app_platform_name: qualification.app_platform_name || '',
        group_code: qualification.group_code || '',
        responsible_name: qualification.responsible_name || '',
        responsible_cert_type: qualification.responsible_cert_type || '',
        responsible_cert_number: qualification.responsible_cert_number || '',
        responsible_phone: qualification.responsible_phone || '',
        handler_name: qualification.handler_name || '',
        handler_cert_type: qualification.handler_cert_type || '',
        handler_cert_number: qualification.handler_cert_number || '',
        handler_phone: qualification.handler_phone || '',
        signature: qualification.signature || '',
      }
    : {
        enterprise_name: '',
        submit_unit: '',
        carrier_enterprise_id: '',
        cert_type: '',
        cert_number: '',
        app_platform_name: '',
        group_code: '',
        responsible_name: '',
        responsible_cert_type: '',
        responsible_cert_number: '',
        responsible_phone: '',
        handler_name: '',
        handler_cert_type: '',
        handler_cert_number: '',
        handler_phone: '',
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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset(defaultValues)
    }
    onOpenChange(newOpen)
  }

  const isPending = createMutation.isPending || updateMutation.isPending || uploading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{qualification ? '编辑资质' : '新建资质'}</DialogTitle>
          <DialogDescription>
            {qualification ? '修改企业资质信息' : '创建新的企业资质信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">企业信息</h3>
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
                  name="group_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>集团编号</FormLabel>
                      <FormControl>
                        <Input placeholder="集团编码" {...field} value={field.value || ''} />
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
                      <FormLabel>应用平台</FormLabel>
                      <FormControl>
                        <Input placeholder="应用/平台名称" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">负责人信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responsible_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="负责人姓名" {...field} value={field.value || ''} />
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
                        <Input placeholder="负责人证件号" {...field} value={field.value || ''} />
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
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">经办人信息</h3>
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
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">签名</h3>
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
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">提交信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="submit_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>提交单位</FormLabel>
                      <FormControl>
                        <Input placeholder="提交单位" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carrier_enterprise_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>运营商企业ID</FormLabel>
                      <FormControl>
                        <Input placeholder="企业唯一标识" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">证件图片</h3>
              <div className="grid grid-cols-2 gap-4">
                {IMAGE_FIELDS.map((field) => (
                  <div key={field.name}>
                    <FormLabel className="mb-1 block">{field.label}</FormLabel>
                    {imagePreviews[field.name] ? (
                      <div className="relative rounded border overflow-hidden">
                        <img src={imagePreviews[field.name]} alt={field.label} className="h-32 w-full object-contain bg-muted" />
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
            </div>

            <DialogFooter>
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
