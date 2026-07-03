# Data Import for Qualifications and Port Info — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel template download and template-based import for QualificationInfo and PortInfo.

**Architecture:** Backend generates templates and parses imports via openpyxl inside existing route files. Frontend uses a shared ImportDialog component wired into both list pages. No new models, no new dependencies.

**Tech Stack:** Python/FastAPI + openpyxl (already installed), React/TypeScript + ShadcnUI Dialog

## Global Constraints

- openpyxl is already a project dependency, do not add new Python packages
- No new npm packages — use existing ShadcnUI components only
- Follow existing code patterns: backend route → CRUD, frontend API module → feature page
- All endpoints require superuser auth (consistent with existing routes)
- Import behavior: create only, no dedup/upsert
- Error handling: first error stops everything, transaction rollback
- Template includes ALL fields (not just required ones)

---

## File Structure

- **Modify:** `backend/app/api/routes/qualifications.py` — add `/template` GET and `/import` POST
- **Modify:** `backend/app/api/routes/port_info.py` — add `/template` GET and `/import` POST
- **Modify:** `frontend/src/lib/api/qualifications.ts` — add `downloadQualificationTemplate()` and `importQualifications(file)`
- **Modify:** `frontend/src/lib/api/port-info.ts` — add `downloadPortInfoTemplate()` and `importPortInfos(file)`
- **Create:** `frontend/src/components/shared/import-dialog.tsx` — reusable file-upload import dialog
- **Modify:** `frontend/src/features/qualifications/index.tsx` — add import/template buttons + dialog
- **Modify:** `frontend/src/features/port-info/index.tsx` — add import/template buttons + dialog

---

### Task 1: Qualification Template Download Endpoint

**Files:**
- Modify: `backend/app/api/routes/qualifications.py`

**Interfaces:**
- Produces: `GET /api/v1/qualifications/template` → StreamingResponse (.xlsx)

- [ ] **Step 1: Add imports and template endpoint**

Add to `backend/app/api/routes/qualifications.py`:

```python
import io
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

# After the router definition, before read_qualifications:

_QUALIFICATION_HEADERS = [
    "企业名称",
    "提交单位",
    "运营商企业ID",
    "单位证件类型",
    "单位证件号码",
    "APP/平台名称",
    "集团编码",
    "责任人姓名",
    "责任人证件类型",
    "责任人证件号码",
    "责任人手机号",
    "经办人姓名",
    "经办人证件类型",
    "经办人证件号码",
    "经办人手机号",
]


@router.get("/template")
def download_qualification_template() -> Any:
    wb = Workbook()
    ws = wb.active
    ws.title = "资质导入模板"
    for col_idx, header in enumerate(_QUALIFICATION_HEADERS, 1):
        ws.cell(row=1, column=col_idx, value=header)
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=资质导入模板.xlsx"},
    )
```

- [ ] **Step 2: Test template download**

```bash
cd backend && curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/qualifications/template
```
Expected: 200

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/qualifications.py
git commit -m "feat: add qualification import template download endpoint"
```

---

### Task 2: Qualification Import Endpoint

**Files:**
- Modify: `backend/app/api/routes/qualifications.py`

**Interfaces:**
- Produces: `POST /api/v1/qualifications/import` (multipart file) → `{"count": int, "message": str}`
- Consumes: `_QUALIFICATION_HEADERS` from Task 1

- [ ] **Step 1: Add import endpoint**

Add imports at top of `backend/app/api/routes/qualifications.py`:

```python
from fastapi import UploadFile, File
from openpyxl import load_workbook
from app.models import QualificationInfo
```

Add endpoint after the template endpoint:

```python
@router.post("/import")
def import_qualifications(
    *, session: SessionDep, file: UploadFile = File(...)
) -> Any:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")

    try:
        wb = load_workbook(io.BytesIO(file.file.read()), read_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件，请检查文件格式")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 1:
        raise HTTPException(status_code=400, detail="文件为空，请导入有效的 Excel 文件")

    # Map model field names to column index by matching Chinese headers
    header_to_field = {
        "企业名称": "enterprise_name",
        "提交单位": "submit_unit",
        "运营商企业ID": "carrier_enterprise_id",
        "单位证件类型": "cert_type",
        "单位证件号码": "cert_number",
        "APP/平台名称": "app_platform_name",
        "集团编码": "group_code",
        "责任人姓名": "responsible_name",
        "责任人证件类型": "responsible_cert_type",
        "责任人证件号码": "responsible_cert_number",
        "责任人手机号": "responsible_phone",
        "经办人姓名": "handler_name",
        "经办人证件类型": "handler_cert_type",
        "经办人证件号码": "handler_cert_number",
        "经办人手机号": "handler_phone",
    }

    header_row = [str(c) if c else "" for c in rows[0]]
    col_map: dict[str, int] = {}
    for col_idx, h in enumerate(header_row):
        if h in header_to_field:
            col_map[header_to_field[h]] = col_idx

    objects: list[QualificationInfo] = []
    for row_idx, row in enumerate(rows[1:], start=2):
        # Skip completely empty rows
        if all(c is None or str(c).strip() == "" for c in row):
            continue

        def cell(col_name: str) -> str | None:
            if col_name not in col_map:
                return None
            idx = col_map[col_name]
            if idx >= len(row):
                return None
            v = row[idx]
            if v is None or str(v).strip() == "":
                return None
            return str(v).strip()

        enterprise_name = cell("enterprise_name")
        if not enterprise_name:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 企业名称不能为空")

        objects.append(QualificationInfo(
            enterprise_name=enterprise_name,
            submit_unit=cell("submit_unit"),
            carrier_enterprise_id=cell("carrier_enterprise_id"),
            cert_type=cell("cert_type"),
            cert_number=cell("cert_number"),
            app_platform_name=cell("app_platform_name"),
            group_code=cell("group_code"),
            responsible_name=cell("responsible_name"),
            responsible_cert_type=cell("responsible_cert_type"),
            responsible_cert_number=cell("responsible_cert_number"),
            responsible_phone=cell("responsible_phone"),
            handler_name=cell("handler_name"),
            handler_cert_type=cell("handler_cert_type"),
            handler_cert_number=cell("handler_cert_number"),
            handler_phone=cell("handler_phone"),
        ))

    if not objects:
        raise HTTPException(status_code=400, detail="文件中没有有效数据")

    session.add_all(objects)
    session.commit()
    return {"count": len(objects), "message": f"成功导入 {len(objects)} 条资质信息"}
```

- [ ] **Step 2: Verify the endpoint appears in API docs**

```bash
curl -s http://localhost:8000/api/v1/openapi.json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(p) for p in d['paths'] if 'qualification' in p]"
```
Expected: shows `/api/v1/qualifications/template` and `/api/v1/qualifications/import`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/qualifications.py
git commit -m "feat: add qualification Excel import endpoint"
```

---

### Task 3: Port Info Template Download Endpoint

**Files:**
- Modify: `backend/app/api/routes/port_info.py`

**Interfaces:**
- Produces: `GET /api/v1/port-info/template` → StreamingResponse (.xlsx)

- [ ] **Step 1: Add imports and template endpoint**

Add to `backend/app/api/routes/port_info.py`:

```python
import io
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

# After the router definition, before read_port_infos:

_PORT_INFO_HEADERS = [
    "运营商",
    "操作类型",
    "主端口号",
    "子端口号",
    "码号使用范围",
    "接入省",
    "接入地市",
    "端口类型",
    "端口入网时间",
    "是否允许自行扩展",
    "业务属性",
    "业务类型",
    "业务细类",
    "具体用途",
    "短信签名",
    "是否网关签名",
    "运营商接入机房及设备",
    "企业接入机房及设备",
    "是否具有授权书",
    "授权开始日期",
    "授权结束日期",
    "短信模板内容",
]


@router.get("/template")
def download_port_info_template() -> Any:
    wb = Workbook()
    ws = wb.active
    ws.title = "端口信息导入模板"
    for col_idx, header in enumerate(_PORT_INFO_HEADERS, 1):
        ws.cell(row=1, column=col_idx, value=header)
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=端口信息导入模板.xlsx"},
    )
```

- [ ] **Step 2: Test template download**

```bash
cd backend && curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/port-info/template
```
Expected: 200

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/port_info.py
git commit -m "feat: add port-info import template download endpoint"
```

---

### Task 4: Port Info Import Endpoint

**Files:**
- Modify: `backend/app/api/routes/port_info.py`

**Interfaces:**
- Produces: `POST /api/v1/port-info/import` (multipart file) → `{"count": int, "message": str}`
- Consumes: `_PORT_INFO_HEADERS` from Task 3

- [ ] **Step 1: Add import endpoint**

Add imports at top of `backend/app/api/routes/port_info.py`:

```python
from fastapi import UploadFile, File
from openpyxl import load_workbook
from app.models import PortInfo
```

Add endpoint after the template endpoint:

```python
@router.post("/import")
def import_port_infos(
    *, session: SessionDep, file: UploadFile = File(...)
) -> Any:
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 文件")

    try:
        wb = load_workbook(io.BytesIO(file.file.read()), read_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析 Excel 文件，请检查文件格式")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 1:
        raise HTTPException(status_code=400, detail="文件为空，请导入有效的 Excel 文件")

    header_to_field = {
        "运营商": "carrier",
        "操作类型": "operation_type",
        "主端口号": "main_port_number",
        "子端口号": "sub_port_number",
        "码号使用范围": "port_range",
        "接入省": "province",
        "接入地市": "city",
        "端口类型": "port_type",
        "端口入网时间": "port_activation_date",
        "是否允许自行扩展": "allow_self_extension",
        "业务属性": "business_attribute",
        "业务类型": "business_type",
        "业务细类": "business_subtype",
        "具体用途": "specific_usage",
        "短信签名": "sms_signature",
        "是否网关签名": "is_gateway_signature",
        "运营商接入机房及设备": "carrier_room",
        "企业接入机房及设备": "enterprise_room",
        "是否具有授权书": "has_authorization",
        "授权开始日期": "auth_start_date",
        "授权结束日期": "auth_end_date",
        "短信模板内容": "sms_template_content",
    }

    header_row = [str(c) if c else "" for c in rows[0]]
    col_map: dict[str, int] = {}
    for col_idx, h in enumerate(header_row):
        if h in header_to_field:
            col_map[header_to_field[h]] = col_idx

    objects: list[PortInfo] = []
    for row_idx, row in enumerate(rows[1:], start=2):
        if all(c is None or str(c).strip() == "" for c in row):
            continue

        def cell(col_name: str) -> str | None:
            if col_name not in col_map:
                return None
            idx = col_map[col_name]
            if idx >= len(row):
                return None
            v = row[idx]
            if v is None or str(v).strip() == "":
                return None
            return str(v).strip()

        def parse_bool(col_name: str) -> bool | None:
            v = cell(col_name)
            if v is None:
                return None
            return v in ("是", "true", "True", "1", "TRUE")
        
        def parse_date(col_name: str):
            if col_name not in col_map:
                return None
            idx = col_map[col_name]
            if idx >= len(row):
                return None
            v = row[idx]
            if v is None:
                return None
            from datetime import date, datetime
            if isinstance(v, datetime):
                return v.date()
            if isinstance(v, date):
                return v
            s = str(v).strip()
            if not s:
                return None
            return date.fromisoformat(s)

        carrier = cell("carrier")
        if not carrier:
            raise HTTPException(status_code=400, detail=f"第{row_idx}行: 运营商不能为空")

        objects.append(PortInfo(
            carrier=carrier,
            operation_type=cell("operation_type"),
            main_port_number=cell("main_port_number"),
            sub_port_number=cell("sub_port_number"),
            port_range=cell("port_range"),
            province=cell("province"),
            city=cell("city"),
            port_type=cell("port_type"),
            port_activation_date=parse_date("port_activation_date"),
            allow_self_extension=parse_bool("allow_self_extension"),
            business_attribute=cell("business_attribute"),
            business_type=cell("business_type"),
            business_subtype=cell("business_subtype"),
            specific_usage=cell("specific_usage"),
            sms_signature=cell("sms_signature"),
            is_gateway_signature=parse_bool("is_gateway_signature"),
            carrier_room=cell("carrier_room"),
            enterprise_room=cell("enterprise_room"),
            has_authorization=parse_bool("has_authorization"),
            auth_start_date=parse_date("auth_start_date"),
            auth_end_date=parse_date("auth_end_date"),
            sms_template_content=cell("sms_template_content"),
        ))

    if not objects:
        raise HTTPException(status_code=400, detail="文件中没有有效数据")

    session.add_all(objects)
    session.commit()
    return {"count": len(objects), "message": f"成功导入 {len(objects)} 条端口信息"}
```

- [ ] **Step 2: Verify the endpoint appears in API docs**

```bash
curl -s http://localhost:8000/api/v1/openapi.json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(p) for p in d['paths'] if 'port-info' in p]"
```
Expected: shows `/api/v1/port-info/template` and `/api/v1/port-info/import`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/port_info.py
git commit -m "feat: add port-info Excel import endpoint"
```

---

### Task 5: Frontend API Client

**Files:**
- Modify: `frontend/src/lib/api/qualifications.ts`
- Modify: `frontend/src/lib/api/port-info.ts`

**Interfaces:**
- Produces:
  - `downloadQualificationTemplate(): Promise<void>` — triggers browser download
  - `importQualifications(file: File): Promise<{count: number; message: string}>`
  - `downloadPortInfoTemplate(): Promise<void>` — triggers browser download
  - `importPortInfos(file: File): Promise<{count: number; message: string}>`

- [ ] **Step 1: Add import/template functions to qualifications.ts**

Add to end of `frontend/src/lib/api/qualifications.ts`:

```typescript
export const downloadQualificationTemplate = async (): Promise<void> => {
  const response = await api.get('/api/v1/qualifications/template', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '资质导入模板.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const importQualifications = async (file: File): Promise<{ count: number; message: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/qualifications/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
```

- [ ] **Step 2: Add import/template functions to port-info.ts**

Add to end of `frontend/src/lib/api/port-info.ts`:

```typescript
export const downloadPortInfoTemplate = async (): Promise<void> => {
  const response = await api.get('/api/v1/port-info/template', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '端口信息导入模板.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const importPortInfos = async (file: File): Promise<{ count: number; message: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/port-info/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit src/lib/api/qualifications.ts src/lib/api/port-info.ts
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/qualifications.ts frontend/src/lib/api/port-info.ts
git commit -m "feat: add import/template API client functions for qualifications and port-info"
```

---

### Task 6: Shared Import Dialog Component

**Files:**
- Create: `frontend/src/components/shared/import-dialog.tsx`

**Interfaces:**
- Produces: `<ImportDialog>` — accepts `open`, `onOpenChange`, `title`, `onDownloadTemplate`, `onImport`, `onSuccess` props

- [ ] **Step 1: Create the import dialog component**

Create `frontend/src/components/shared/import-dialog.tsx`:

```tsx
import { useState, useRef } from 'react'
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit src/components/shared/import-dialog.tsx
```
Expected: no errors (may need to check Label component existence)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/import-dialog.tsx
git commit -m "feat: add shared import dialog component"
```

---

### Task 7: Wire Import into Qualification Page

**Files:**
- Modify: `frontend/src/features/qualifications/index.tsx`

**Interfaces:**
- Consumes: `ImportDialog` from Task 6, `downloadQualificationTemplate` and `importQualifications` from Task 5

- [ ] **Step 1: Add import dialog state and buttons to qualification page**

In `frontend/src/features/qualifications/index.tsx`:

Add import at top:

```tsx
import { Download, Upload } from 'lucide-react'
import { downloadQualificationTemplate, importQualifications } from '@/lib/api/qualifications'
import { ImportDialog } from '@/components/shared/import-dialog'
```

Add state after existing dialog states:

```tsx
const [importDialogOpen, setImportDialogOpen] = useState(false)
```

Add buttons in the button group, between "新建资质" and the existing refresh button:

```tsx
<Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
  <Plus className="mr-2 h-4 w-4" />
  新建资质
</Button>
<Button variant="outline" onClick={() => setImportDialogOpen(true)}>
  <Upload className="mr-2 h-4 w-4" />
  导入数据
</Button>
<Button variant="outline" onClick={() => downloadQualificationTemplate()}>
  <Download className="mr-2 h-4 w-4" />
  下载模板
</Button>
```

Add the ImportDialog before the closing `</>` (after `QualificationDialog`):

```tsx
<ImportDialog
  open={importDialogOpen}
  onOpenChange={setImportDialogOpen}
  title="资质信息"
  onDownloadTemplate={downloadQualificationTemplate}
  onImport={importQualifications}
  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['qualifications'] })}
/>
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/qualifications/index.tsx
git commit -m "feat: add import/template buttons and dialog to qualification page"
```

---

### Task 8: Wire Import into Port Info Page

**Files:**
- Modify: `frontend/src/features/port-info/index.tsx`

**Interfaces:**
- Consumes: `ImportDialog` from Task 6, `downloadPortInfoTemplate` and `importPortInfos` from Task 5

- [ ] **Step 1: Add import dialog state and buttons to port info page**

In `frontend/src/features/port-info/index.tsx`:

Add import at top:

```tsx
import { Download, Upload } from 'lucide-react'
import { downloadPortInfoTemplate, importPortInfos } from '@/lib/api/port-info'
import { ImportDialog } from '@/components/shared/import-dialog'
```

Add state after existing dialog states:

```tsx
const [importDialogOpen, setImportDialogOpen] = useState(false)
```

Add buttons in the button group:

```tsx
<Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
  <Plus className="mr-2 h-4 w-4" />
  新建端口信息
</Button>
<Button variant="outline" onClick={() => setImportDialogOpen(true)}>
  <Upload className="mr-2 h-4 w-4" />
  导入数据
</Button>
<Button variant="outline" onClick={() => downloadPortInfoTemplate()}>
  <Download className="mr-2 h-4 w-4" />
  下载模板
</Button>
```

Add the ImportDialog before the closing `</>`:

```tsx
<ImportDialog
  open={importDialogOpen}
  onOpenChange={setImportDialogOpen}
  title="端口信息"
  onDownloadTemplate={downloadPortInfoTemplate}
  onImport={importPortInfos}
  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
/>
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/port-info/index.tsx
git commit -m "feat: add import/template buttons and dialog to port-info page"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Start backend and verify template endpoints**

```bash
# In backend/ directory
curl -s -o /tmp/qual_template.xlsx -w "HTTP %{http_code}\n" http://localhost:8000/api/v1/qualifications/template
curl -s -o /tmp/port_template.xlsx -w "HTTP %{http_code}\n" http://localhost:8000/api/v1/port-info/template
```

Expected: both return 200, files are valid .xlsx

- [ ] **Step 2: Test import with a valid Excel file**

Create test files manually or via script:
- Fill in some rows in the downloaded template
- Upload via curl:
```bash
curl -X POST http://localhost:8000/api/v1/qualifications/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@/tmp/test_qual.xlsx"
```
Expected: `{"count": N, "message": "成功导入 N 条资质信息"}`

- [ ] **Step 3: Test import with missing required field**

```bash
curl -X POST http://localhost:8000/api/v1/qualifications/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@/tmp/test_qual_empty_name.xlsx"
```
Expected: `{"detail": "第X行: 企业名称不能为空"}`

- [ ] **Step 4: Test frontend flow**

```bash
cd frontend && pnpm run dev
```
- Open browser, navigate to `/qualifications`
- Click "下载模板" — verify browser downloads .xlsx
- Click "导入数据" — verify dialog opens
- Select a valid .xlsx file — verify import succeeds, list refreshes
- Repeat for `/port-info`

- [ ] **Step 5: Commit any fixes from verification**

```bash
git add <fixed_files>
git commit -m "fix: issues found during e2e verification"
```
