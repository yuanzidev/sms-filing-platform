import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { record: FilingRecord }

function Row({ label, value }: { label: string; value: string | null | undefined | boolean }) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{typeof value === 'boolean' ? (value ? '是' : '否') : (value ?? '-')}</span>
    </div>
  )
}

export function ContactAuthTab({ record }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>负责人信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="姓名" value={record.qualification_info?.responsible_name} />
          <Row label="证件类型" value={record.qualification_info?.responsible_cert_type} />
          <Row label="证件号码" value={record.qualification_info?.responsible_cert_number} />
          <Row label="联系电话" value={record.qualification_info?.responsible_phone} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>经办人信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="姓名" value={record.qualification_info?.handler_name} />
          <Row label="证件类型" value={record.qualification_info?.handler_cert_type} />
          <Row label="证件号码" value={record.qualification_info?.handler_cert_number} />
          <Row label="联系电话" value={record.qualification_info?.handler_phone} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>授权信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="有授权书" value={record.port_info?.has_authorization} />
          <Row label="授权开始" value={record.port_info?.auth_start_date} />
          <Row label="授权截止" value={record.port_info?.auth_end_date} />
        </CardContent>
      </Card>
    </div>
  )
}
