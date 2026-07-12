import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getQualification, getQualificationAttachments } from '@/lib/api/qualifications'
import type { QualificationInfo } from '@/lib/api/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  qualification: QualificationInfo
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value != null && value !== '' ? String(value) : '-'}</span>
    </div>
  )
}

export function QualificationDetailDialog({ open, onOpenChange, qualification }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['qualification', qualification.id],
    queryFn: () => getQualification(qualification.id),
    enabled: open,
  })

  const { data: attachments } = useQuery({
    queryKey: ['qualification-attachments', qualification.id],
    queryFn: () => getQualificationAttachments(qualification.id),
    enabled: open,
  })

  const d = detail ?? qualification
  const imageAttachments = attachments ?? []

  const getImageUrl = (id: string) => `/api/v1/files/${id}/download`

  const imageFields = [
    { name: '单位证件图片', match: '单位证件图片' },
    { name: '责任人身份证正面', match: '责任人身份证正面' },
    { name: '责任人身份证反面', match: '责任人身份证反面' },
    { name: '经办人身份证正面', match: '经办人身份证正面' },
    { name: '经办人身份证反面', match: '经办人身份证反面' },
    { name: '签名举证附件', match: '签名举证附件' },
    { name: '经办人现场照片', match: '经办人现场照片' },
    { name: '引流举证附件', match: '引流举证附件' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>资质详情 — {d.enterprise_name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 企业信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">企业信息</h4>
              <FieldRow label="企业名称" value={d.enterprise_name} />
              <FieldRow label="单位证件类型" value={d.cert_type} />
              <FieldRow label="单位证件号码" value={d.cert_number} />
              <FieldRow label="APP/平台名称" value={d.app_platform_name} />
            </div>

            {/* 法人信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">法人信息</h4>
              <FieldRow label="法人姓名" value={d.legal_representative_name} />
            </div>

            {/* 责任人信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">责任人信息</h4>
              <FieldRow label="姓名" value={d.responsible_name} />
              <FieldRow label="证件类型" value={d.responsible_cert_type} />
              <FieldRow label="证件号码" value={d.responsible_cert_number} />
              <FieldRow label="手机号" value={d.responsible_phone} />
              <FieldRow label="地址" value={d.responsible_address} />
            </div>

            {/* 经办人信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">经办人信息</h4>
              <FieldRow label="姓名" value={d.handler_name} />
              <FieldRow label="证件类型" value={d.handler_cert_type} />
              <FieldRow label="证件号码" value={d.handler_cert_number} />
              <FieldRow label="手机号" value={d.handler_phone} />
              <FieldRow label="地址" value={d.handler_address} />
            </div>

            {/* 签名与模板 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">签名与模板</h4>
              <FieldRow label="签名" value={d.signature} />
              <FieldRow label="短信签名" value={d.sms_signature} />
              <FieldRow label="签名类型" value={d.signature_type} />
              <FieldRow label="签名是否已认证" value={d.signature_verified} />
              <FieldRow label="是否网关签名" value={d.is_gateway_signature} />
              <FieldRow label="模板内容" value={d.sms_template_content} />
              <FieldRow label="模板是否有变量" value={d.template_has_variable} />
              <FieldRow label="模板参数类型" value={d.template_param_type} />
              <FieldRow label="模板参数长度" value={d.template_param_length} />
            </div>

            {/* 业务信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">业务信息</h4>
              <FieldRow label="业务属性" value={d.business_attribute} />
              <FieldRow label="业务类型" value={d.business_type} />
              <FieldRow label="业务细类" value={d.business_subtype} />
              <FieldRow label="具体用途" value={d.specific_usage} />
            </div>

            {/* 引流信息 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">引流信息</h4>
              <FieldRow label="引流号码" value={d.diversion_number} />
              <FieldRow label="引流号码类型" value={d.diversion_number_type} />
              <FieldRow label="引流号码用途" value={d.diversion_number_usage} />
              <FieldRow label="引流内容" value={d.diversion_content} />
              <FieldRow label="链接地址" value={d.link_address} />
              <FieldRow label="链接类型" value={d.link_type} />
            </div>

            {/* 图片附件 */}
            <div>
              <h4 className="mb-2 text-sm font-semibold border-b pb-1">附件图片</h4>
              <div className="grid grid-cols-2 gap-4">
                {imageFields.map((field) => {
                  const matched = imageAttachments.filter(
                    (a) => a.field_name === field.match
                  )
                  return (
                    <div key={field.name} className="space-y-1">
                      <span className="text-xs text-muted-foreground">{field.name}</span>
                      {matched.length > 0 ? (
                        matched.map((a) => (
                          <div key={a.id} className="rounded border p-1">
                            <img
                              src={getImageUrl(a.id)}
                              alt={field.name}
                              className="h-32 w-full rounded object-contain bg-muted"
                            />
                            <div className="mt-1 text-xs text-muted-foreground">
                              {a.original_name} ({(a.file_size / 1024).toFixed(1)}KB)
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex h-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                          暂无
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
