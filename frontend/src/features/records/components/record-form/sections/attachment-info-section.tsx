import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AttachmentInfoSection() {
  return (
    <Card>
      <CardHeader><CardTitle>附件信息</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          保存后可在详情页上传附件
        </p>
      </CardContent>
    </Card>
  )
}
