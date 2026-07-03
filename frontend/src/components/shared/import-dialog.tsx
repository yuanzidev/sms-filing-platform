import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, Download } from 'lucide-react'
import { toast } from 'sonner'

interface ImportResult {
  count: number
  message: string
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onDownloadTemplate: () => void
  onImport: (file: File) => Promise<ImportResult>
  onSuccess: () => void
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  onDownloadTemplate,
  onImport,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setError(null)
    }
  }, [open])

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await onImport(file)
      toast.success(result.message)
      onOpenChange(false)
      setFile(null)
      onSuccess()
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '导入失败，请检查文件格式和数据'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导入{title}</DialogTitle>
          <DialogDescription>
            还没有模板？{' '}
            <button
              type="button"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={onDownloadTemplate}
            >
              <Download className="mr-1 inline-block h-3 w-3" />
              下载模板
            </button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              选择 Excel 文件（.xlsx 或 .xls）
            </p>
            <div className="mt-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                选择文件
              </Button>
            </div>
            {file && (
              <p className="mt-2 text-sm text-primary">{file.name}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? '导入中...' : '确认导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
