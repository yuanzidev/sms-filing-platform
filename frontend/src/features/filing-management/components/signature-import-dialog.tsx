import { useState, useCallback, useMemo, useRef } from 'react'
import { Loader2, Upload, ClipboardPaste } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getQualificationsBySignatures } from '@/lib/api/qualifications'
import type { BatchSignatureResponse } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface SignatureImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (matchedIds: string[]) => void
  library: 'primary' | 'backup'
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

export function SignatureImportDialog({
  open,
  onOpenChange,
  onConfirm,
  library,
}: SignatureImportDialogProps) {
  const [activeTab, setActiveTab] = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [result, setResult] = useState<BatchSignatureResponse | null>(null)
  const [resultKey, setResultKey] = useState('')
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [timePrecision, setTimePrecision] = useState<'month' | 'day' | 'second'>('day')
  const [importStart, setImportStart] = useState('')
  const [importEnd, setImportEnd] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessAttribute, setBusinessAttribute] = useState('')

  const signatures = useMemo(
    () => parseSignaturesFromText(pasteText),
    [pasteText]
  )
  const signatureKey = useMemo(
    () => `${signatures.join('\n')}::${timePrecision}::${importStart}::${importEnd}::${library}::${businessType}::${businessAttribute}`,
    [signatures, timePrecision, importStart, importEnd, library, businessType, businessAttribute]
  )

  const querySignatures = useCallback(
    async (sigs: string[]): Promise<BatchSignatureResponse | null> => {
      if (sigs.length === 0) {
        setResult(null)
        setResultKey('')
        return null
      }
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError(null)
      try {
        if ((importStart && !importEnd) || (!importStart && importEnd)) {
          setError('请同时选择开始和结束时间')
          return null
        }
        if (timePrecision === 'second' && importStart && importEnd &&
          (![importStart, importEnd].every((value) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)))) {
          setError('请按 YYYY-MM-DD HH:mm:ss 格式填写开始和结束时间')
          return null
        }
        const res = await getQualificationsBySignatures(sigs,
          importStart && importEnd
            ? { import_start: timePrecision === 'second' ? importStart.replace(' ', 'T') : importStart,
                import_end: timePrecision === 'second' ? importEnd.replace(' ', 'T') : importEnd,
                import_precision: timePrecision }
            : undefined,
          library,
          { business_type: businessType.trim() || undefined, business_attribute: businessAttribute.trim() || undefined }
        )
        if (requestId === requestIdRef.current) {
          setResult(res)
          setResultKey(`${sigs.join('\n')}::${timePrecision}::${importStart}::${importEnd}::${library}::${businessType}::${businessAttribute}`)
        }
        return res
      } catch {
        if (requestId === requestIdRef.current) setError('查询失败，请稍后重试')
        return null
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [timePrecision, importStart, importEnd, library, businessType, businessAttribute]
  )

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
            .map((row: string[]) =>
              row && row.length > 0 ? String(row[0] ?? '').trim() : ''
            )
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
    [querySignatures]
  )

  const handlePasteBlur = useCallback(() => {
    if (signatures.length > 0) {
      querySignatures(signatures)
    }
  }, [signatures, querySignatures])

  const handleConfirm = useCallback(async () => {
    if (signatures.length === 0) {
      setError('请先输入或导入签名')
      return
    }
    const currentResult =
      result && resultKey === signatureKey
        ? result
        : await querySignatures(signatures)
    if (!currentResult) return
    const ids = currentResult.matched_qualifications.map((q) => q.id)
    onConfirm(ids)
    onOpenChange(false)
    // Reset
    setPasteText('')
    setImportStart('')
    setImportEnd('')
    setBusinessType('')
    setBusinessAttribute('')
    setResult(null)
    setResultKey('')
    setError(null)
  }, [
    result,
    resultKey,
    signatureKey,
    signatures,
    querySignatures,
    onConfirm,
    onOpenChange,
  ])

  const currentResult = resultKey === signatureKey ? result : null
  const matchedCount = currentResult?.matched_qualifications.length ?? 0
  const unmatchedCount = currentResult?.unmatched_signatures.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[88vh] max-w-lg flex-col overflow-hidden'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>批量导入签名</DialogTitle>
          <DialogDescription>
            通过粘贴板或 Excel 表格导入签名列表，系统自动匹配对应资质
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
          <div className='flex gap-2'>
            <Input aria-label='业务类型筛选' placeholder='业务类型（选填）' value={businessType} onChange={(e) => { setBusinessType(e.target.value); setResult(null) }} />
            <Input aria-label='业务属性筛选' placeholder='业务属性（选填）' value={businessAttribute} onChange={(e) => { setBusinessAttribute(e.target.value); setResult(null) }} />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>资质导入时间范围（选填）</label>
            <div className='flex flex-wrap gap-2'>
              <select
                aria-label='时间精度'
                className='border-input bg-background rounded-md border px-3 text-sm'
                value={timePrecision}
                onChange={(e) => {
                  setTimePrecision(e.target.value as 'month' | 'day' | 'second')
                  setImportStart('')
                  setImportEnd('')
                  setResult(null)
                }}
              >
                <option value='month'>年月</option>
                <option value='day'>年月日</option>
                <option value='second'>年月日时分秒</option>
              </select>
              <Input
                aria-label='开始时间'
                type={timePrecision === 'month' ? 'month' : timePrecision === 'day' ? 'date' : 'text'}
                placeholder={timePrecision === 'second' ? 'YYYY-MM-DD HH:mm:ss' : undefined}
                value={importStart}
                onChange={(e) => {
                  setImportStart(e.target.value)
                  setResult(null)
                  setResultKey('')
                }}
                className={timePrecision === 'second' ? 'w-56' : 'w-48'}
              />
              <span className='self-center text-sm'>至</span>
              <Input
                aria-label='结束时间'
                type={timePrecision === 'month' ? 'month' : timePrecision === 'day' ? 'date' : 'text'}
                placeholder={timePrecision === 'second' ? 'YYYY-MM-DD HH:mm:ss' : undefined}
                value={importEnd}
                onChange={(e) => {
                  setImportEnd(e.target.value)
                  setResult(null)
                  setResultKey('')
                }}
                className={timePrecision === 'second' ? 'w-56' : 'w-48'}
              />
              {(importStart || importEnd) && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setImportStart('')
                    setImportEnd('')
                    setResult(null)
                    setResultKey('')
                  }}
                >
                  清除
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='paste'>
                <ClipboardPaste className='mr-2 h-4 w-4' />
                粘贴板导入
              </TabsTrigger>
              <TabsTrigger value='file'>
                <Upload className='mr-2 h-4 w-4' />
                表格导入
              </TabsTrigger>
            </TabsList>
            <TabsContent value='paste' className='mt-3 space-y-2'>
              <Textarea
                placeholder={`每行一个签名，例如：\nDX-湖北武汉电信\nDX-甘肃兰州电信三枢纽-出省5%\nLT-重庆联通`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                onBlur={handlePasteBlur}
                rows={8}
                className='max-h-64 font-mono text-sm'
              />
              <p className='text-muted-foreground text-xs'>
                已输入 {signatures.length} 条签名
              </p>
            </TabsContent>
            <TabsContent value='file' className='mt-3'>
              <div className='rounded-lg border-2 border-dashed p-6 text-center'>
                <Upload className='text-muted-foreground mx-auto h-8 w-8' />
                <p className='text-muted-foreground mt-2 text-sm'>
                  选择 Excel 文件（.xlsx / .xls），自动读取第一列
                </p>
                <div className='mt-3'>
                  <Input
                    type='file'
                    accept='.xlsx,.xls'
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Loading */}
          {loading && (
            <div className='text-muted-foreground flex items-center justify-center py-4'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              查询中...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className='bg-destructive/10 text-destructive rounded-md p-3 text-sm'>
              {error}
            </div>
          )}

          {/* Result */}
          {currentResult && !loading && (
            <div className='space-y-2 rounded-lg border p-3'>
              <p className='text-sm font-medium'>匹配结果</p>
              <div className='flex gap-4 text-sm'>
                <span className='text-green-600'>
                  匹配成功：{matchedCount} 条资质
                </span>
                <span className='text-red-500'>
                  无匹配：{unmatchedCount} 条
                </span>
              </div>
              {unmatchedCount > 0 && (
                <details className='text-sm'>
                  <summary className='cursor-pointer text-red-500'>
                    查看无匹配签名
                  </summary>
                  <ul className='text-muted-foreground mt-1 max-h-40 list-disc overflow-y-auto pl-5'>
                    {currentResult.unmatched_signatures.map((s, index) => (
                      <li key={`${index}-${s}`}>{s}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter className='shrink-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={signatures.length === 0 || loading}
          >
            {matchedCount > 0 ? '确认并勾选匹配资质' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
