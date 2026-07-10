# 批量签名导入创建报备任务 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 报备任务创建 Step 1 支持通过粘贴板或 Excel 批量导入签名列表来筛选并勾选资质，同时资质管理页签名搜索框移到首位。

**Architecture:** 后端新增 `POST /qualifications/batch-by-signatures` 端点用 `IN` 精确匹配签名；前端新增 `SignatureImportDialog` 弹窗组件，支持粘贴板文本和 xlsx 文件两种输入，实时查询匹配结果并叠加勾选到表格。

**Tech Stack:** FastAPI + SQLModel (后端), React + TypeScript + TanStack Query + ShadcnUI + SheetJS (前端)

## Global Constraints

- 签名精确匹配（非模糊 LIKE），用 SQL `IN` 子句
- 资质管理页签名搜索仅调整渲染顺序，不改搜索逻辑
- 弹窗确认后叠加勾选（不清除已有选中）

---

### Task 1: Backend — 新增批量签名查询 Schema 和 CRUD

**Files:**
- Modify: `backend/app/models/qualification_info.py` (追加 Schema 类)
- Modify: `backend/app/models/__init__.py` (导出新 Schema)
- Modify: `backend/app/crud/qualification.py` (追加 CRUD 函数)

**Interfaces:**
- Produces: `BatchSignatureRequest(signatures: list[str])`, `BatchSignatureResponse(matched_qualifications: list[QualificationInfoPublic], unmatched_signatures: list[str])`
- Produces: `get_qualifications_by_signatures(session, signatures: list[str]) -> tuple[list[QualificationInfo], list[str]]`

- [ ] **Step 1: 在 `qualification_info.py` 末尾追加请求/响应 Schema**

```python
class BatchSignatureRequest(SQLModel):
    signatures: list[str]


class BatchSignatureResponse(SQLModel):
    matched_qualifications: list[QualificationInfoPublic]
    unmatched_signatures: list[str]
```

- [ ] **Step 2: 在 `crud/qualification.py` 末尾追加批量查询函数**

```python
def get_qualifications_by_signatures(
    *, session: Session, signatures: list[str]
) -> tuple[list[QualificationInfo], list[str]]:
    unique_sigs = list(dict.fromkeys(signatures))  # 去重保序
    results = session.exec(
        select(QualificationInfo).where(QualificationInfo.signature.in_(unique_sigs))
    ).all()
    matched_sigs = {r.signature for r in results}
    unmatched = [s for s in unique_sigs if s not in matched_sigs]
    return list(results), unmatched
```

- [ ] **Step 3: 在 `models/__init__.py` 导入并导出新 Schema**

在 qualification_info 的 import 块追加：
```python
from .qualification_info import (
    ...
    BatchSignatureRequest,
    BatchSignatureResponse,
)
```

在 `__all__` 列表追加 `"BatchSignatureRequest"`, `"BatchSignatureResponse"`

- [ ] **Step 4: 运行后端测试验证导入无报错**

```bash
cd backend && uv run python -c "from app.models import BatchSignatureRequest, BatchSignatureResponse; print('OK')"
```

Expected: 控制台输出 "OK"

- [ ] **Step 5: 提交**

```bash
git add backend/app/models/qualification_info.py backend/app/models/__init__.py backend/app/crud/qualification.py
git commit -m "feat(qualifications): 新增批量签名查询 Schema 和 CRUD"
```

---

### Task 2: Backend — 新增 `POST /qualifications/batch-by-signatures` 端点

**Files:**
- Modify: `backend/app/api/routes/qualifications.py` (追加路由)

**Interfaces:**
- Consumes: `BatchSignatureRequest`, `BatchSignatureResponse` from Task 1 models
- Consumes: `get_qualifications_by_signatures` from Task 1 CRUD
- Produces: `POST /api/v1/qualifications/batch-by-signatures`

- [ ] **Step 1: 在路由文件末尾追加端点（放在 `read_qualifications` 之前）**

在 `backend/app/api/routes/qualifications.py` 的 import 块追加导入：
```python
from app.models import (
    ...
    BatchSignatureRequest,
    BatchSignatureResponse,
)
```

在 import 之后、`read_qualifications` 之前插入新端点：
```python
@router.post("/batch-by-signatures", response_model=BatchSignatureResponse)
def batch_by_signatures(
    *, session: SessionDep, body: BatchSignatureRequest
) -> Any:
    qualified, unmatched = get_qualifications_by_signatures(
        session=session, signatures=body.signatures
    )
    return BatchSignatureResponse(
        matched_qualifications=qualified,
        unmatched_signatures=unmatched,
    )
```

注意：`get_qualifications_by_signatures` 需要在文件顶部 import 块加入。

- [ ] **Step 2: 启动后端验证端点**

```bash
cd backend && fastapi dev app/main.py &
sleep 3
curl -s -X POST http://localhost:8000/api/v1/qualifications/batch-by-signatures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin@sms-filing.example.com&password=changethis" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")" \
  -d '{"signatures":["DX-湖北武汉电信","NONEXISTENT-SIG"]}' | python3 -m json.tool
```

Expected: 返回 JSON 含 `matched_qualifications` 和 `unmatched_signatures`，无匹配签名出现在 `unmatched_signatures` 中。

- [ ] **Step 3: 提交**

```bash
git add backend/app/api/routes/qualifications.py
git commit -m "feat(qualifications): 新增 POST /qualifications/batch-by-signatures 端点"
```

---

### Task 3: Frontend — 安装 SheetJS 依赖并添加类型

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/lib/api/types.ts` (追加响应类型)

**Interfaces:**
- Produces: `BatchSignatureResponse` TypeScript 接口

- [ ] **Step 1: 安装 xlsx 包**

```bash
cd frontend && pnpm add xlsx
```

- [ ] **Step 2: 在 `frontend/src/lib/api/types.ts` 的 QualificationInfo 区块追加类型**

```typescript
export interface BatchSignatureRequest {
  signatures: string[]
}

export interface BatchSignatureResponse {
  matched_qualifications: QualificationInfo[]
  unmatched_signatures: string[]
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无新增 lint 错误

- [ ] **Step 4: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/lib/api/types.ts
git commit -m "chore(frontend): 安装 xlsx 依赖并添加 BatchSignatureResponse 类型"
```

---

### Task 4: Frontend — 新增 API 函数 `getQualificationsBySignatures`

**Files:**
- Modify: `frontend/src/lib/api/qualifications.ts`

**Interfaces:**
- Consumes: `BatchSignatureResponse` from Task 3 types
- Produces: `getQualificationsBySignatures(signatures: string[])` 导出函数

- [ ] **Step 1: 在 `qualifications.ts` 末尾追加函数**

```typescript
import type { BatchSignatureResponse } from './types'

export const getQualificationsBySignatures = async (
  signatures: string[],
): Promise<BatchSignatureResponse> => {
  const response = await api.post('/api/v1/qualifications/batch-by-signatures', { signatures })
  return response.data
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无 lint 错误

- [ ] **Step 3: 提交**

```bash
git add frontend/src/lib/api/qualifications.ts
git commit -m "feat(frontend): 新增 getQualificationsBySignatures API 函数"
```

---

### Task 5: Frontend — 构建 `SignatureImportDialog` 弹窗组件

**Files:**
- Create: `frontend/src/features/filing-management/components/signature-import-dialog.tsx`

**Interfaces:**
- Consumes: `getQualificationsBySignatures` from Task 4
- Consumes: `BatchSignatureResponse` from Task 3
- Produces: `SignatureImportDialog` 组件，Props: `{ open, onOpenChange, onConfirm }`

- [ ] **Step 1: 创建组件文件**

```tsx
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
import { toast } from 'sonner'
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无 lint 错误。如果 `lucide-react` 缺少 `ClipboardPaste` 图标，改用 `Clipboard`。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/filing-management/components/signature-import-dialog.tsx
git commit -m "feat(frontend): 新增 SignatureImportDialog 批量签名导入弹窗"
```

---

### Task 6: Frontend — Step 1 页面集成批量导入

**Files:**
- Modify: `frontend/src/features/filing-management/create.tsx`

**Interfaces:**
- Consumes: `SignatureImportDialog` from Task 5

- [ ] **Step 1: 导入弹窗组件并添加状态**

在文件顶部 import 区域追加：
```tsx
import { SignatureImportDialog } from './components/signature-import-dialog'
import { Upload } from 'lucide-react'
```

如果 `Upload` 图标已从 `lucide-react` 导入则不需要重复。

在组件内、`selectedIds` 的 `useMemo` 之后添加状态：
```tsx
const [signatureImportOpen, setSignatureImportOpen] = useState(false)
```

- [ ] **Step 2: 在搜索栏旁添加按钮**

在 Step 1 CardContent 的搜索 Input 后面添加按钮。找到 `<span className="text-sm text-muted-foreground">已选 {selectedIds.length} 个资质</span>` 这行，在它之后、`</div>` 之前插入：

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setSignatureImportOpen(true)}
>
  <Upload className="mr-2 h-4 w-4" />
  批量导入签名
</Button>
```

- [ ] **Step 3: 添加确认回调，合并 rowSelection**

在 `handleCreate` 函数之前添加回调：
```tsx
const handleSignatureImport = (matchedIds: string[]) => {
  setSelectedRows((prev) => {
    const next = { ...prev }
    matchedIds.forEach((id) => {
      const idx = qualifications.findIndex((q) => q.id === id)
      if (idx !== -1) {
        next[idx] = true
      }
    })
    return next
  })
}
```

注意：`handleSignatureImport` 引用了 `qualifications`，需要确保 `qualifications` 变量在函数定义前已可用（它来自 `qualData`，在组件顶部定义，所以没问题）。

- [ ] **Step 4: 在 return JSX 末尾插入弹窗**

在 `</Main>` 之前插入：
```tsx
<SignatureImportDialog
  open={signatureImportOpen}
  onOpenChange={setSignatureImportOpen}
  onConfirm={handleSignatureImport}
/>
```

- [ ] **Step 5: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无 lint 错误

- [ ] **Step 6: 提交**

```bash
git add frontend/src/features/filing-management/create.tsx
git commit -m "feat(frontend): Step 1 集成批量签名导入弹窗"
```

---

### Task 7: Frontend — 资质管理页签名搜索框移到最前

**Files:**
- Modify: `frontend/src/features/qualifications/index.tsx`

- [ ] **Step 1: 交换搜索输入框的 DOM 顺序**

找到 Filter 区域的三个 `<div className="flex flex-col gap-1">` 块（搜索输入框），调整顺序为：签名 → 企业名称 → 证件号码。

即把签名搜索框的 `<div>` 块（第 223-235 行附近，内容是 `searchInputs.signature`）移到企业名称搜索块（第 197-208 行附近）之前。

- [ ] **Step 2: 验证编译**

```bash
cd frontend && pnpm run lint -- --max-warnings 0
```

Expected: 无 lint 错误

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/qualifications/index.tsx
git commit -m "refactor(frontend): 资质管理页签名搜索框移到首位"
```

---

### Task 8: 端到端验证

- [ ] **Step 1: 启动后端和前端**

```bash
cd backend && fastapi dev app/main.py &
cd frontend && pnpm run dev &
```

- [ ] **Step 2: 手动测试**

1. 打开浏览器访问报备管理 → 新建报备
2. 在 Step 1 点击「批量导入签名」按钮
3. 验证弹窗出现，有粘贴板和表格导入两个 Tab
4. 在粘贴板输入测试签名，失焦后验证出现匹配/无匹配结果
5. 点击确认，验证 Step 1 表格自动勾选对应资质
6. 返回资质管理页，验证签名搜索框在第一位

- [ ] **Step 3: 验证完成**
