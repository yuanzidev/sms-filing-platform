import type { FilingRecord } from '@/lib/mock/data/records'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusTag } from '@/components/shared/status-tag'

interface Props { record: FilingRecord }

function Row({ label, value }: { label: string; value: string | null | undefined | boolean }) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span>{typeof value === 'boolean' ? (value ? '是' : '否') : (value ?? '-')}</span>
    </div>
  )
}

export function BusinessSignatureTab({ record }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>业务信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="业务属性" value={record.business_attribute} />
          <Row label="业务类型" value={record.business_type} />
          <Row label="业务子类型" value={record.business_subtype} />
          <Row label="运营商原始业务类型" value={record.carrier_original_biz_type} />
          <Row label="具体用途" value={record.specific_usage} />
          <Row label="绿色通道" value={record.is_green_channel} />
          <Row label="黑名单类型" value={record.blacklist_type} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>签名信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="短信签名" value={record.sms_signature} />
          <Row label="签名类型" value={record.signature_type} />
          <Row label="签名已验证" value={record.signature_verified} />
          <Row label="网关签名" value={record.is_gateway_signature} />
          <Row label="签名附件" value={record.signature_attachment} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>机房信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="运营商机房" value={record.carrier_room} />
          <Row label="企业机房" value={record.enterprise_room} />
          <Row label="其他机房" value={record.other_room} />
        </CardContent>
      </Card>
    </div>
  )
}
