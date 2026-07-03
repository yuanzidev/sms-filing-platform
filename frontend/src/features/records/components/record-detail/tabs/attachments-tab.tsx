import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { record: FilingRecord }

export function AttachmentsTab(_props: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>附件</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">暂无附件</p>
      </CardContent>
    </Card>
  )
}
