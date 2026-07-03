import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
          <Row label="业务属性" value={record.port_info?.business_attribute} />
          <Row label="业务类型" value={record.port_info?.business_type} />
          <Row label="业务子类型" value={record.port_info?.business_subtype} />
          <Row label="具体用途" value={record.port_info?.specific_usage} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>签名信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="短信签名" value={record.port_info?.sms_signature} />
          <Row label="网关签名" value={record.port_info?.is_gateway_signature} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>机房信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="运营商机房" value={record.port_info?.carrier_room} />
          <Row label="企业机房" value={record.port_info?.enterprise_room} />
        </CardContent>
      </Card>
    </div>
  )
}
