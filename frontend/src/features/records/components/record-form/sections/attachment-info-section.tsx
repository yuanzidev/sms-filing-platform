import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadGroup } from '@/components/shared/file-upload-group'

export function AttachmentInfoSection() {
  const { watch } = useFormContext()
  const attachments = watch('attachments') ?? []

  return (
    <Card>
      <CardHeader><CardTitle>附件信息</CardTitle></CardHeader>
      <CardContent>
        <FileUploadGroup
          items={attachments}
          onUpload={(_type) => {
            // Phase 1: UI only
          }}
          onRemove={(_type) => {
            // Phase 1: UI only
          }}
        />
      </CardContent>
    </Card>
  )
}
