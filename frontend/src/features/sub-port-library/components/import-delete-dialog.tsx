import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseDeleteList, deleteByList } from '@/lib/api/sub-port-library'
import type { ParseDeleteResult } from '@/lib/api/sub-port-library'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function extractErrorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail
  if (typeof detail === 'string') return detail
  return '解析失败，请检查文件格式'
}

export function ImportDeleteDialog({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [preview, setPreview] = useState<ParseDeleteResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setPreview(null)
      setParsing(false)
      setDeleting(false)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPreview(null)
    }
  }

  const handleParse = async () => {
    if (!file) return
    setParsing(true)
    setPreview(null)
    try {
      const result = await parseDeleteList(file)
      setPreview(result)
    } catch (err) {
      toast.error(extractErrorDetail(err))
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!file) return
    setDeleting(true)
    try {
      const result = await deleteByList(file)
      const unmatchedCount = result.unmatched.length
      toast.success(
        `删除完成：已删除 ${result.deleted_count} 条${unmatchedCount > 0 ? `，未匹配 ${unmatchedCount} 条` : ''}`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(extractErrorDetail(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>导入删除清单</DialogTitle>
          <DialogDescription>
            上传包含「主端口号、子端口号」两列的 Excel 文件，系统将匹配并删除对应记录
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='rounded-lg border-2 border-dashed p-6 text-center'>
            <p className='text-sm text-muted-foreground'>
              选择 Excel 文件（.xlsx 或 .xls）
            </p>
            <div className='mt-3'>
              <Input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xls'
                onChange={handleFileChange}
                className='hidden'
                id='import-delete-file-input'
              />
              <Button
                variant='outline'
                size='sm'
                onClick={() => fileInputRef.current?.click()}
              >
                选择文件
              </Button>
            </div>
            {file && <p className='mt-2 text-sm text-primary'>{file.name}</p>}
          </div>

          {preview && (
            <div className='space-y-2'>
              <p className='text-sm'>
                共解析 <span className='font-medium'>{preview.total}</span> 条，
                匹配到 <span className='font-medium text-red-600'>{preview.matched_count}</span> 条将被删除
                {preview.unmatched.length > 0 && (
                  <>，<span className='font-medium text-amber-600'>{preview.unmatched.length}</span> 条未匹配</>
                )}
              </p>
              {preview.unmatched.length > 0 && (
                <div className='max-h-40 overflow-auto rounded border'>
                  <table className='w-full text-xs'>
                    <thead>
                      <tr className='bg-muted'>
                        <th className='p-1 text-left'>主端口号</th>
                        <th className='p-1 text-left'>子端口号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.unmatched.map((t, i) => (
                        <tr key={i} className='border-t'>
                          <td className='p-1'>{t.main_port_number}</td>
                          <td className='p-1'>{t.sub_port_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={deleting}>
            取消
          </Button>
          {!preview ? (
            <Button onClick={handleParse} disabled={!file || parsing}>
              {parsing ? '解析中...' : '解析文件'}
            </Button>
          ) : (
            <Button
              variant='destructive'
              onClick={handleConfirmDelete}
              disabled={deleting || preview.matched_count === 0}
            >
              {deleting ? '删除中...' : `确认删除 ${preview.matched_count} 条`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
