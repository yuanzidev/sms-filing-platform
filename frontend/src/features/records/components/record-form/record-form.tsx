import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { AnchorFormLayout } from '@/components/shared/anchor-form-layout'
import { BasicInfoSection } from './sections/basic-info-section'
import { PortInfoSection } from './sections/port-info-section'
import { RegionInfoSection } from './sections/region-info-section'
import { EnterpriseInfoSection } from './sections/enterprise-info-section'
import { ResponsibleInfoSection } from './sections/responsible-info-section'
import { HandlerInfoSection } from './sections/handler-info-section'
import { AuthInfoSection } from './sections/auth-info-section'
import { BusinessInfoSection } from './sections/business-info-section'
import { SignatureInfoSection } from './sections/signature-info-section'
import { RoomInfoSection } from './sections/room-info-section'
import { TemplateInfoSection } from './sections/template-info-section'
import { DiversionInfoSection } from './sections/diversion-info-section'
import { AttachmentInfoSection } from './sections/attachment-info-section'
import { ExtendedFieldsSection } from './sections/extended-fields-section'

const templateSchema = z.object({
  id: z.string(),
  content: z.string(),
  has_variable: z.boolean(),
  param_type: z.string(),
  param_length: z.number(),
})

const diversionSchema = z.object({
  id: z.string(),
  content: z.string(),
  ratio: z.number(),
})

export const recordFormSchema = z.object({
  carrier: z.string().min(1, '请选择运营商'),
  record_number: z.string().optional(),
  operation_type: z.string().optional(),
  submit_unit: z.string().optional(),
  source_file: z.string().optional(),
  import_batch: z.string().optional(),
  status: z.string().optional(),

  main_port: z.string().min(1, '请选择主端口'),
  sub_port: z.string().optional(),
  port_range: z.string().optional(),
  port_type: z.string().optional(),
  port_activation_date: z.string().optional(),
  allow_self_extension: z.boolean().optional(),

  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),

  enterprise_name: z.string().min(1, '请输入企业名称'),
  cert_type: z.string().optional(),
  cert_number: z.string().optional(),
  customer_type: z.string().optional(),
  group_code: z.string().optional(),
  app_platform_name: z.string().optional(),

  responsible_name: z.string().optional(),
  responsible_cert_type: z.string().optional(),
  responsible_cert_number: z.string().optional(),
  responsible_cert_address: z.string().optional(),
  responsible_phone: z.string().optional(),

  handler_name: z.string().optional(),
  handler_cert_type: z.string().optional(),
  handler_cert_number: z.string().optional(),
  handler_cert_address: z.string().optional(),
  handler_phone: z.string().optional(),

  has_authorization: z.boolean().optional(),
  auth_start_date: z.string().optional(),
  auth_end_date: z.string().optional(),
  auth_attachment: z.string().optional(),
  contract_attachment: z.string().optional(),

  business_attribute: z.string().optional(),
  business_type: z.string().optional(),
  business_subtype: z.string().optional(),
  carrier_original_biz_type: z.string().optional(),
  specific_usage: z.string().optional(),
  is_green_channel: z.boolean().optional(),
  blacklist_type: z.string().optional(),

  sms_signature: z.string().min(1, '请输入短信签名'),
  signature_type: z.string().optional(),
  signature_verified: z.boolean().optional(),
  is_gateway_signature: z.boolean().optional(),
  signature_attachment: z.string().optional(),

  carrier_room: z.string().optional(),
  enterprise_room: z.string().optional(),
  other_room: z.string().optional(),

  templates: z.array(templateSchema).default([]),
  diversions: z.array(diversionSchema).default([]),
  attachments: z.array(z.object({
    type: z.string(),
    name: z.string(),
    status: z.string(),
  })).default([]),
})

export type RecordFormValues = z.infer<typeof recordFormSchema>

const defaultValues: RecordFormValues = {
  carrier: '',
  record_number: '',
  operation_type: '',
  submit_unit: '',
  source_file: '',
  import_batch: '',
  status: '草稿',
  main_port: '',
  sub_port: '',
  port_range: '',
  port_type: '',
  port_activation_date: '',
  allow_self_extension: false,
  province: '',
  city: '',
  district: '',
  enterprise_name: '',
  cert_type: '',
  cert_number: '',
  customer_type: '',
  group_code: '',
  app_platform_name: '',
  responsible_name: '',
  responsible_cert_type: '',
  responsible_cert_number: '',
  responsible_cert_address: '',
  responsible_phone: '',
  handler_name: '',
  handler_cert_type: '',
  handler_cert_number: '',
  handler_cert_address: '',
  handler_phone: '',
  has_authorization: false,
  auth_start_date: '',
  auth_end_date: '',
  auth_attachment: '',
  contract_attachment: '',
  business_attribute: '',
  business_type: '',
  business_subtype: '',
  carrier_original_biz_type: '',
  specific_usage: '',
  is_green_channel: false,
  blacklist_type: '',
  sms_signature: '',
  signature_type: '',
  signature_verified: false,
  is_gateway_signature: false,
  signature_attachment: '',
  carrier_room: '',
  enterprise_room: '',
  other_room: '',
  templates: [],
  diversions: [],
  attachments: [],
}

const sections = [
  { id: 'section-basic', title: '基础信息' },
  { id: 'section-port', title: '端口信息' },
  { id: 'section-region', title: '区域信息' },
  { id: 'section-enterprise', title: '企业信息' },
  { id: 'section-responsible', title: '负责人信息' },
  { id: 'section-handler', title: '经办人信息' },
  { id: 'section-auth', title: '授权信息' },
  { id: 'section-business', title: '业务信息' },
  { id: 'section-signature', title: '签名信息' },
  { id: 'section-room', title: '机房信息' },
  { id: 'section-template', title: '模板信息' },
  { id: 'section-diversion', title: '分流信息' },
  { id: 'section-attachment', title: '附件信息' },
  { id: 'section-extended', title: '扩展字段' },
]

interface RecordFormProps {
  initialValues?: Partial<RecordFormValues>
  onSubmit: (values: RecordFormValues) => Promise<void>
  submitLabel?: string
}

export function RecordForm({ initialValues, onSubmit, submitLabel = '提交' }: RecordFormProps) {
  const form = useForm<RecordFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recordFormSchema) as any,
    defaultValues: { ...defaultValues, ...initialValues },
  })

  const { handleSubmit, formState: { isSubmitting } } = form

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit as any)}>
        <AnchorFormLayout sections={sections}>
          <div className="space-y-6">
            <div id="section-basic"><BasicInfoSection /></div>
            <div id="section-port"><PortInfoSection /></div>
            <div id="section-region"><RegionInfoSection /></div>
            <div id="section-enterprise"><EnterpriseInfoSection /></div>
            <div id="section-responsible"><ResponsibleInfoSection /></div>
            <div id="section-handler"><HandlerInfoSection /></div>
            <div id="section-auth"><AuthInfoSection /></div>
            <div id="section-business"><BusinessInfoSection /></div>
            <div id="section-signature"><SignatureInfoSection /></div>
            <div id="section-room"><RoomInfoSection /></div>
            <div id="section-template"><TemplateInfoSection /></div>
            <div id="section-diversion"><DiversionInfoSection /></div>
            <div id="section-attachment"><AttachmentInfoSection /></div>
            <div id="section-extended"><ExtendedFieldsSection /></div>
          </div>
        </AnchorFormLayout>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
