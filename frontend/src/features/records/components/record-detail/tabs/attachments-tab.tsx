import type { FilingRecord } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadGroup } from '@/components/shared/file-upload-group'

interface Props { record: FilingRecord; onAttachmentsChange: () => void }

export function AttachmentsTab({ record, onAttachmentsChange }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>附件</CardTitle></CardHeader>
      <CardContent>
        <FileUploadGroup
          files={record.attachments ?? []}
          entityType="filing_record"
          entityId={record.id}
          onUploaded={() => onAttachmentsChange()}
          onRemoved={() => onAttachmentsChange()}
        />
      </CardContent>
    </Card>
  )
}
