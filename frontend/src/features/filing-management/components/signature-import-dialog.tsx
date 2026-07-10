import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getQualificationsBySignatures } from '@/lib/api/qualifications'
import type { BatchSignatureResponse } from '@/lib/api/types'
import { Loader2, Upload, ClipboardPaste } from 'lucide-react'
import * as XLSX from 'xlsx'

interface SignatureImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (matchedIds: string[]) => void
}

function parseSignaturesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function looksLikeSignature(val: string): boolean {
  const headerKeywords = ['签名', 'signature', '签名列表']
  return !headerKeywords.includes(val.trim()) && val.trim().length > 0
}

export function SignatureImportDialog({ open, onOpenChange, onConfirm }: SignatureImportDialogProps) {
  const [activeTab, setActiveTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [result, setResult] = useState<BatchSignatureResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signatures = useMemo(() => parseSignaturesFromText(pasteText), [pasteText])
  const uniqueCount = useMemo(() => new Set(signatures).size, [signatures])

  const querySignatures = useCallback(async (sigs: string[]) => {
    const unique = [...new Set(sigs)]
    if (unique.length === 0) {
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await getQualificationsBySignatures(unique)
      setResult(res)
    } catch {
      setError('查询失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setError(null)
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
          // 取第一列，跳过可能的表头行
          const firstCol = data
            .map((row: string[]) => (row && row.length > 0 ? String(row[0] ?? '').trim() : ''))
            .filter((v: string) => looksLikeSignature(v))
          if (firstCol.length === 0) {
            setError('未识别到签名数据，请确认表格第一列为签名')
            return
          }
          const text = firstCol.join('\n')
          setPasteText(text)
          setActiveTab('paste')
          querySignatures(firstCol)
        } catch {
          setError('无法解析文件，请确认上传的是 .xlsx 或 .xls 文件')
        }
      }
      reader.readAsBinaryString(file)
    },
    [querySignatures],
  )

  const handlePasteBlur = useCallback(() => {
    if (signatures.length > 0) {
      querySignatures(signatures)
    }
  }, [signatures, querySignatures])

  const handleConfirm = useCallback(() => {
    if (!result) return
    const ids = result.matched_qualifications.map((q) => q.id)
    onConfirm(ids)
    onOpenChange(false)
    // Reset
    setPasteText('')
    setResult(null)
    setError(null)
  }, [result, onConfirm, onOpenChange])

  const matchedCount = result?.matched_qualifications.length ?? 0
  const unmatchedCount = result?.unmatched_signatures.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>批量导入签名</DialogTitle>
          <DialogDescription>
            通过粘贴板或 Excel 表格导入签名列表，系统自动匹配对应资质
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">
                <ClipboardPaste className="mr-2 h-4 w-4" />
                粘贴板导入
              </TabsTrigger>
              <TabsTrigger value="file">
                <Upload className="mr-2 h-4 w-4" />
                表格导入
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-3 space-y-2">
              <Textarea
                placeholder={`每行一个签名，例如：\nDX-湖北武汉电信\nDX-甘肃兰州电信三枢纽-出省5%\nLT-重庆联通`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                onBlur={handlePasteBlur}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                已输入 {signatures.length} 条签名（去重后 {uniqueCount} 条）
              </p>
            </TabsContent>
            <TabsContent value="file" className="mt-3">
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  选择 Excel 文件（.xlsx / .xls），自动读取第一列
                </p>
                <div className="mt-3">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              查询中...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">匹配结果</p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  匹配成功：{matchedCount} 条资质
                </span>
                <span className="text-red-500">
                  无匹配：{unmatchedCount} 条
                </span>
              </div>
              {unmatchedCount > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-500">
                    查看无匹配签名
                  </summary>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {result.unmatched_signatures.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!result || loading}>
            {matchedCount > 0 ? `确认并勾选 ${matchedCount} 个资质` : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
