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
  unrecognized_headers?: string[]
}

export interface ImportPreviewResult {
  headers: string[]
  rows: Record<string, string | null>[]
  unrecognized_headers: string[]
  total_data_rows: number
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onDownloadTemplate: () => void
  onImport: (file: File) => Promise<ImportResult>
  onPreview?: (file: File) => Promise<ImportPreviewResult>
  onSuccess: () => void
  onDownloadErrorReport?: (errors: ImportErrorItem[]) => Promise<void>
}

type ImportRequestError = {
  response?: {
    status?: number
    data?: {
      detail?: unknown
    }
  }
}

function asImportRequestError(err: unknown): ImportRequestError {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    return err as ImportRequestError
  }
  return {}
}

function getMessageFromDetail(detail: unknown) {
  if (typeof detail === 'object' && detail !== null) {
    const record = detail as Record<string, unknown>
    const message = record.msg ?? record.message
    if (typeof message === 'string') return message
  }
  return null
}

function getImportErrorDetail(err: unknown, fallback: string) {
  const response = asImportRequestError(err).response
  if (response?.status === 413) {
    return '上传文件过大或被代理/网关限制，请压缩 Excel 内图片后重试，或联系管理员调整上传大小限制。'
  }

  const detail = response?.data?.detail
  if (!detail) {
    return fallback
  }
  if (Array.isArray(detail)) {
    return detail.map((d) => getMessageFromDetail(d) || JSON.stringify(d)).join('；')
  }
  const message = getMessageFromDetail(detail)
  if (message) {
    return message
  }
  return String(detail)
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  onDownloadTemplate,
  onImport,
  onPreview,
  onSuccess,
  onDownloadErrorReport,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<ImportErrorItem[]>([])
  const [unrecognizedHeaders, setUnrecognizedHeaders] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setError(null)
      setImportErrors([])
      setUnrecognizedHeaders([])
      setPreviewData(null)
      setPreviewError(null)
    }
  }, [open])

  const handlePreview = async () => {
    if (!file || !onPreview) return
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewData(null)
    try {
      const result = await onPreview(file)
      setPreviewData(result)
      setUnrecognizedHeaders(result.unrecognized_headers ?? [])
    } catch (err) {
      setPreviewError(getImportErrorDetail(err, '预览失败，请检查文件格式'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setImportErrors([])
    setUnrecognizedHeaders([])
    try {
      const result = await onImport(file)
      setUnrecognizedHeaders(result.unrecognized_headers ?? [])
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors)
        toast.error(`导入完成：成功 ${result.success_count} 条，失败 ${result.error_count} 条`)
      } else {
        toast.success(result.message || '导入成功')
        onOpenChange(false)
        setFile(null)
        onSuccess()
      }
    } catch (err) {
      setError(getImportErrorDetail(err, '导入失败，请检查文件格式和数据'))
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
      setUnrecognizedHeaders([])
      setPreviewData(null)
      setPreviewError(null)
    }
  }

  // 预览行按表头顺序排列：后端返回 rows 的字段顺序与文件列顺序一致，
  // 取未识别表头之外的列标题与行值一一对应
  const previewColumns = previewData
    ? (previewData.headers ?? []).filter(
        (h) => h && !(previewData.unrecognized_headers ?? []).includes(h),
      )
    : []
  const previewRowValues = previewData
    ? (previewData.rows ?? []).map((row) => Object.values(row))
    : []

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

          {previewError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {previewError}
            </div>
          )}

          {unrecognizedHeaders.length > 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              以下表头未被识别，导入时将被忽略：
              <span className="font-medium"> {unrecognizedHeaders.join('、')}</span>
            </div>
          )}

          {previewData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  数据预览（共 {previewData.total_data_rows} 行，显示前{' '}
                  {previewRowValues.length} 行）
                </h4>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setPreviewData(null)
                    setPreviewError(null)
                  }}
                >
                  收起预览
                </Button>
              </div>
              <div className='max-h-48 overflow-auto rounded border'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='bg-muted'>
                      {previewColumns.map((h, i) => (
                        <th key={i} className='whitespace-nowrap p-1 text-left'>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRowValues.map((values, rowIdx) => (
                      <tr key={rowIdx} className='border-t'>
                        {previewColumns.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className='max-w-[140px] truncate p-1'
                            title={values[colIdx] ?? ''}
                          >
                            {values[colIdx] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          {onPreview && (
            <Button variant="outline" onClick={handlePreview} disabled={!file || loading}>
              {previewLoading ? '预览中...' : '预览数据'}
            </Button>
          )}
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? '导入中...' : '确认导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
