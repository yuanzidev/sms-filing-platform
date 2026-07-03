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

export function PortEnterpriseTab({ record }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>端口信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="主端口" value={record.port_info?.main_port_number} />
          <Row label="子端口" value={record.port_info?.sub_port_number} />
          <Row label="端口范围" value={record.port_info?.port_range} />
          <Row label="端口类型" value={record.port_info?.port_type} />
          <Row label="开通日期" value={record.port_info?.port_activation_date} />
          <Row label="允许自扩展" value={record.port_info?.allow_self_extension} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>企业信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="企业名称" value={record.qualification_info?.enterprise_name} />
          <Row label="证件类型" value={record.qualification_info?.cert_type} />
          <Row label="证件号码" value={record.qualification_info?.cert_number} />
          <Row label="集团编号" value={record.qualification_info?.group_code} />
          <Row label="应用平台" value={record.qualification_info?.app_platform_name} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>区域信息</CardTitle></CardHeader>
        <CardContent>
          <Row label="省份" value={record.port_info?.province} />
          <Row label="城市" value={record.port_info?.city} />
        </CardContent>
      </Card>
    </div>
  )
}
