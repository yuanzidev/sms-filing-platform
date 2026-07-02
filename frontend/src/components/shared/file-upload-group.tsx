import type { AttachmentItem } from '@/lib/mock/data/records'
import { Button } from '@/components/ui/button'
import { StatusTag } from '@/components/shared/status-tag'
import { Upload, X } from 'lucide-react'

interface FileUploadGroupProps {
  items: AttachmentItem[]
  onUpload: (type: string) => void
  onRemove: (type: string) => void
}

const typeLabels: Record<string, string> = {
  business_license: '营业执照',
  sms_permit: '短信资质',
  port_auth: '端口授权书',
  contract: '合同',
}

export function FileUploadGroup({ items, onUpload, onRemove }: FileUploadGroupProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无附件</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.type}
          className="flex items-center justify-between rounded-md border px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {typeLabels[item.type] ?? item.type}
            </span>
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <StatusTag status={item.status} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpload(item.type)}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.type)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
