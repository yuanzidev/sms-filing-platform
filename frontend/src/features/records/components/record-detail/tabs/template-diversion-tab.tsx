import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { record: FilingRecord }

export function TemplateDiversionTab(_props: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>模板信息</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暂无模板</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>分流信息</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暂无分流</p>
        </CardContent>
      </Card>
    </div>
  )
}
