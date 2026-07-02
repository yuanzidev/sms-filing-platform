import type { FilingRecord } from '@/lib/mock/data/records'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { record: FilingRecord }

export function ChangeLogTab(_props: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>变更记录</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">暂无变更记录</p>
      </CardContent>
    </Card>
  )
}
