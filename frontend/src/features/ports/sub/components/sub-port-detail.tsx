import type { SubPort } from '@/lib/mock/data/ports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusTag } from '@/components/shared/status-tag'

interface Props { port: SubPort }

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value ?? '-'}</span>
    </div>
  )
}

export function SubPortDetail({ port }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>子端口基础信息</CardTitle></CardHeader>
      <CardContent>
        <Row label="端口号" value={port.port_number} />
        <Row label="运营商" value={port.carrier} />
        <div className="flex border-b py-2 text-sm">
          <span className="w-36 shrink-0 text-muted-foreground">状态</span>
          <StatusTag status={port.status} />
        </div>
        <Row label="所属主端口" value={port.main_port_number} />
        <Row label="企业名称" value={port.enterprise_name} />
        <Row label="短信签名" value={port.sms_signature} />
        <Row label="业务类型" value={port.business_type} />
        <Row label="报备编号" value={port.record_number} />
        <Row label="更新时间" value={port.updated_at} />
      </CardContent>
    </Card>
  )
}
