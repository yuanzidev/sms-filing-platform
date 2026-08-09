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

export interface ImportErrorItem {
  row: number
  field: string
  value: string
  reason: string
  suggestion: string
}

export interface ImportResult {
  total: number
  success_count: number
  error_count: number
  errors: ImportErrorItem[]
  message?: string
  warnings?: string[]
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onDownloadTemplate: () => void
  onImport: (file: File) => Promise<ImportResult>
  onSuccess: () => void
  onDownloadErrorReport?: (errors: ImportErrorItem[]) => Promise<void>
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  onDownloadTemplate,
  onImport,
  onSuccess,
  onDownloadErrorReport,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<ImportErrorItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setError(null)
      setImportErrors([])
    }
  }, [open])

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setImportErrors([])
    try {
      const result = await onImport(file)
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors)
        toast.error(`导入完成：成功 ${result.success_count} 条，失败 ${result.error_count} 条`)
      } else {
        toast.success(result.message || '导入成功')
        onOpenChange(false)
        setFile(null)
        onSuccess()
      }
    } catch (err: any) {
      let detail = err?.response?.data?.detail
      if (!detail) {
        detail = '导入失败，请检查文件格式和数据'
      } else if (Array.isArray(detail)) {
        // FastAPI 422 validation errors: [{msg, loc}, ...]
        detail = detail.map((d: any) => d.msg || JSON.stringify(d)).join('；')
      } else if (typeof detail === 'object') {
        detail = detail.msg || detail.message || JSON.stringify(detail)
      }
      setError(String(detail))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setError(null)
      setImportErrors([])
    }
  }

  const handleDownloadErrorReport = async () => {
    if (!onDownloadErrorReport || importErrors.length === 0) return
    try {
      await onDownloadErrorReport(importErrors)
    } catch {
      toast.error('错误报告下载失败')
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

          {importErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">导入错误详情</h4>
                {onDownloadErrorReport && (
                  <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                    下载错误报告
                  </Button>
                )}
              </div>
              <div className="max-h-48 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-1 text-left">行号</th>
                      <th className="p-1 text-left">字段</th>
                      <th className="p-1 text-left">值</th>
                      <th className="p-1 text-left">原因</th>
                      <th className="p-1 text-left">建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importErrors.map((err, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1">{err.row}</td>
                        <td className="p-1">{err.field}</td>
                        <td className="max-w-[100px] truncate p-1">{err.value}</td>
                        <td className="p-1 text-red-600">{err.reason}</td>
                        <td className="p-1">{err.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
