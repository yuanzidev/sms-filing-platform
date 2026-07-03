import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusTag } from '@/components/shared/status-tag'

interface Props { record: FilingRecord }

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex border-b py-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span>{value ?? '-'}</span>
    </div>
  )
}

export function BasicInfoTab({ record }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>基础信息</CardTitle></CardHeader>
      <CardContent>
        <Row label="报备编号" value={record.record_number} />
        <Row label="运营商" value={record.port_info?.carrier} />
        <Row label="操作类型" value={record.port_info?.operation_type} />
        <Row label="提交单位" value={record.qualification_info?.submit_unit} />
        <div className="flex border-b py-2 text-sm">
          <span className="w-36 shrink-0 text-muted-foreground">状态</span>
          <StatusTag status={record.status} />
        </div>
        <Row label="来源文件" value={record.source_file} />
        <Row label="导入批次" value={record.import_batch} />
        <Row label="创建时间" value={record.created_at} />
        <Row label="更新时间" value={record.updated_at} />
      </CardContent>
    </Card>
  )
}
