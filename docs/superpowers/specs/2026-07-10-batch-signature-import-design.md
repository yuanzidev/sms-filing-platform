# 批量签名导入创建报备任务 — 设计文档

日期：2026-07-10

## 概述

在报备任务创建流程中，支持通过粘贴板或表格批量导入签名列表来筛选资质，解决手动逐条搜索签名的效率问题。同时调整资质管理页搜索栏顺序，将签名搜索框置前。

## 需求要点

1. 报备任务创建 Step 1（选择资质）增加「批量导入签名」按钮
2. 支持粘贴板输入（每行一个签名）和 Excel 表格导入（自动识别第一列）
3. 后端精确匹配签名，返回匹配到的资质和未匹配的签名列表
4. 弹窗实时展示匹配结果，无匹配签名标红提示，允许忽略继续
5. 确认后叠加勾选匹配到的资质到表格（不影响已有勾选）
6. 资质管理页搜索框顺序：签名 → 企业名称 → 证件号

## 前端设计

### 1. 批量签名导入弹窗组件

**位置：** 新建报备 Step 1 页面搜索栏旁边

**组件：** `frontend/src/features/filing-management/components/signature-import-dialog.tsx`

**弹窗结构：**

- Tab 切换：粘贴板导入 / 表格导入
- 粘贴板模式：textarea + 签名计数（自动去重）
- 表格模式：file input（.xlsx/.xls），SheetJS 读取第一列
- 匹配结果区域（输入后实时展示）：
  - 匹配成功 N 条
  - 无匹配 M 条（红色列表展开）
- 底部：取消 / 确认按钮

**交互逻辑：**

1. 用户在粘贴板输入或选择文件
2. 解析签名列表（去重）
3. 调用 `POST /api/v1/qualifications/batch-by-signatures`
4. 展示匹配结果：成功数 + 无匹配列表
5. 用户点确认 → 调用父组件回调，传入匹配到的 qualification ID 数组
6. 父组件将新 ID 合并到 TanStack Table 的 rowSelection 中

**Props：**
```typescript
interface SignatureImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (matchedIds: string[], unmatchedSignatures: string[]) => void;
}
```

### 2. Step 1 页面改动

**文件：** `frontend/src/features/filing-management/create.tsx`

- 搜索栏旁新增「批量导入签名」按钮
- 管理 `signatureImportOpen` 状态控制弹窗
- `handleSignatureImport` 回调：将返回的 IDs 合并到 `rowSelection`
- 弹窗确认后，表格自动勾选对应行，滚动到第一个新勾选的位置

### 3. 资质管理页搜索框调整

**文件：** `frontend/src/features/qualifications/index.tsx`

搜索输入框渲染顺序改为：签名 → 企业名称 → 证件号

## 后端设计

### 新增端点

```
POST /api/v1/qualifications/batch-by-signatures
```

**文件：** `backend/app/api/routes/qualifications.py`

**请求体：**
```json
{
  "signatures": ["DX-湖北武汉电信", "LT-重庆联通"]
}
```

**响应体：**
```json
{
  "matched_qualifications": [
    {
      "id": "uuid",
      "enterprise_name": "xxx",
      "signature": "DX-湖北武汉电信",
      "cert_number": "xxx",
      "submit_unit": "xxx",
      "app_platform_name": "xxx",
      "created_at": "2026-07-10T00:00:00Z"
    }
  ],
  "unmatched_signatures": ["YD-宁夏中卫移动-腾讯TEZ-异网"]
}
```

**实现细节：**

- 对输入签名列表去重后查询
- 使用 `.in_()` 精确匹配 `signature` 字段
- 对比查询结果反推未匹配签名
- Schema 定义在 `backend/app/schemas/qualification.py` 或内联

### 路由注册

在 `backend/app/api/main.py` 中无需额外操作，端点添加到现有 qualifications router。

## 前端 API 层

**文件：** `frontend/src/lib/api/qualifications.ts`

新增函数：
```typescript
export async function getQualificationsBySignatures(signatures: string[]) {
  const response = await api.post<BatchSignatureResponse>(
    "/qualifications/batch-by-signatures",
    { signatures }
  );
  return response.data;
}
```

## 数据流

```
用户粘贴/上传签名列表
  → 前端去重解析
  → POST /api/v1/qualifications/batch-by-signatures
  → 后端精确匹配 signature 字段 (IN 查询)
  → 返回 matched + unmatched
  → 弹窗展示结果（无匹配红色标记）
  → 用户确认
  → 合并 matched IDs 到 TanStack Table rowSelection
  → Step 1 表格自动勾选对应资质
```

## 实现任务清单

1. 后端：新增 `POST /api/v1/qualifications/batch-by-signatures` 端点
2. 前端 API：新增 `getQualificationsBySignatures` 函数
3. 前端组件：`SignatureImportDialog` 弹窗组件
4. 前端页面：Step 1 集成批量导入按钮和弹窗
5. 前端页面：资质管理页搜索框顺序调整

## 边界情况

- 输入全为空或全为空白行：提示用户输入有效签名
- 所有签名都无匹配：弹窗展示全部无匹配，允许确认但提示无资质可勾选
- 重复签名：前端去重，输入 100 行相同签名只查询 1 次
- 表格文件第一行：如果看起来像签名格式（非"签名"等表头关键词）则当数据处理，否则跳过
- 大批量（500+）：API 用 POST 传 JSON，无 URL 长度限制
