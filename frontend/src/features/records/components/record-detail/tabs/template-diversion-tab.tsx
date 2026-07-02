import type { FilingRecord } from '@/lib/mock/data/records'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props { record: FilingRecord }

export function TemplateDiversionTab({ record }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>模板信息</CardTitle></CardHeader>
        <CardContent>
          {record.templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无模板</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板内容</TableHead>
                  <TableHead>参数类型</TableHead>
                  <TableHead>参数长度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.content}</TableCell>
                    <TableCell>{t.param_type || '-'}</TableCell>
                    <TableCell>{t.param_length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>分流信息</CardTitle></CardHeader>
        <CardContent>
          {record.diversions.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无分流</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分流内容</TableHead>
                  <TableHead>分流比例</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.diversions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.content}</TableCell>
                    <TableCell>{d.ratio}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
