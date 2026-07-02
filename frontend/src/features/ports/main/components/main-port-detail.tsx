import type { MainPort } from '@/lib/mock/data/ports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusTag } from '@/components/shared/status-tag'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props { port: MainPort; subPortCount: number }

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value ?? '-'}</span>
    </div>
  )
}

export function MainPortDetail({ port, subPortCount }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>端口基础信息</CardTitle></CardHeader>
      <CardContent>
        <Row label="端口号" value={port.port_number} />
        <Row label="运营商" value={port.carrier} />
        <div className="flex border-b py-2 text-sm">
          <span className="w-36 shrink-0 text-muted-foreground">状态</span>
          <StatusTag status={port.status} />
        </div>
        <Row label="端口范围" value={port.port_range} />
        <Row label="端口类型" value={port.port_type} />
        <Row label="省份" value={port.province} />
        <Row label="城市" value={port.city} />
        <Row label="子端口数" value={String(subPortCount)} />
        <Row label="创建时间" value={port.created_at} />
      </CardContent>
    </Card>
  )
}
