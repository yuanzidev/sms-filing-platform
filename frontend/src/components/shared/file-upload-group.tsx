import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, FileText, Download } from 'lucide-react'
import { uploadFile, deleteFile, getFileUrl } from '@/lib/api/files'
import type { FileAttachmentPublic } from '@/lib/api/types'

interface FileUploadGroupProps {
  files: FileAttachmentPublic[]
  entityType: string
  entityId: string
  onUploaded: (file: FileAttachmentPublic) => void
  onRemoved: (id: string) => void
}

export function FileUploadGroup({
  files,
  entityType,
  entityId,
  onUploaded,
  onRemoved,
}: FileUploadGroupProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImage = (mime: string) => mime.startsWith('image/')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadFile(file, entityType, entityId)
      onUploaded(result)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (item: FileAttachmentPublic) => {
    try {
      await deleteFile(item.id)
      onRemoved(item.id)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '删除失败')
    }
  }

  const handleDownload = (item: FileAttachmentPublic) => {
    getFileUrl(item.id).then((url) => window.open(url, '_blank'))
  }

  if (files.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">暂无附件</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          上传附件
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {files.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border px-4 py-3"
          >
            {isImage(item.mime_type) ? (
              <FileThumbnail file={item} />
            ) : (
              <FileText className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.original_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(item.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(item)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(item)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        上传附件
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function FileThumbnail({ file }: { file: FileAttachmentPublic }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getFileUrl(file.id).then(setUrl).catch(() => setFailed(true))
  }, [file.id])

  if (failed || !url) {
    return <div className="h-14 w-14 rounded bg-muted animate-pulse" />
  }

  return (
    <img
      src={url}
      alt={file.original_name}
      className="h-14 w-14 rounded object-cover"
      onError={() => setFailed(true)}
    />
  )
}
