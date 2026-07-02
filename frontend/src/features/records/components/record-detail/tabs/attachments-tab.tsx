import type { FilingRecord } from '@/lib/mock/data/records'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadGroup } from '@/components/shared/file-upload-group'

interface Props { record: FilingRecord }

export function AttachmentsTab({ record }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>附件</CardTitle></CardHeader>
      <CardContent>
        <FileUploadGroup
          items={record.attachments}
          onUpload={() => {}}
          onRemove={() => {}}
        />
      </CardContent>
    </Card>
  )
}
