import api from '../api'
import type {
  BatchSignatureResponse,
  QualificationInfo,
  QualificationListResponse,
  FileAttachmentPublic,
} from './types'

export const getQualifications = async (params?: {
  page?: number
  page_size?: number
  enterprise_name?: string
  cert_number?: string
  identity_cert_number?: string
  sms_signature?: string
  sms_signature_mode?: 'contains' | 'exact'
  diversion_info?: string
  library?: 'primary' | 'backup'
  signature_series?: string
  qualification_level?: 'P0' | 'P1' | 'P2'
  business_type?: string
  business_attribute?: string
}): Promise<QualificationListResponse> => {
  const response = await api.get('/api/v1/qualifications', { params })
  return response.data
}

export const getQualification = async (
  id: string
): Promise<QualificationInfo> => {
  const response = await api.get(`/api/v1/qualifications/${id}`)
  return response.data
}

export const getQualificationAttachments = async (
  id: string
): Promise<FileAttachmentPublic[]> => {
  const response = await api.get('/api/v1/files', {
    params: { entity_type: 'qualification_info', entity_id: id },
  })
  return response.data
}

export const uploadQualificationImage = async (
  entityId: string,
  file: File,
  fieldName: string
): Promise<FileAttachmentPublic> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity_type', 'qualification_info')
  formData.append('entity_id', entityId)
  formData.append('field_name', fieldName)
  const response = await api.post('/api/v1/files/upload', formData)
  return response.data
}

export const createQualification = async (
  data: Partial<QualificationInfo>
): Promise<QualificationInfo> => {
  const response = await api.post('/api/v1/qualifications', data)
  return response.data
}

export const updateQualification = async (
  id: string,
  data: Partial<QualificationInfo>
): Promise<QualificationInfo> => {
  const response = await api.patch(`/api/v1/qualifications/${id}`, data)
  return response.data
}

export const deleteQualification = async (
  id: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/qualifications/${id}`)
  return response.data
}

export const batchDeleteQualifications = async (
  ids: string[]
): Promise<{ deleted_count: number }> => {
  const response = await api.post('/api/v1/qualifications/batch-delete', {
    ids,
  })
  return response.data
}

export const batchSetQualificationLevels = async (
  ids: string[], levels: ('P0' | 'P1' | 'P2')[]
): Promise<{ updated_count: number }> => {
  const response = await api.patch('/api/v1/qualifications/batch-levels', { ids, levels })
  return response.data
}

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
  updated_count?: number
  error_count: number
  errors: ImportErrorItem[]
  skipped_count?: number
  skipped_rows?: number[]
  warnings?: string[]
  unrecognized_headers?: string[]
}

export interface ImportPreviewResult {
  headers: string[]
  rows: Record<string, string | null>[]
  unrecognized_headers: string[]
  total_data_rows: number
}

// 导入/预览需上传完整 Excel（可能含大量图片，几十 MB），10 秒全局超时不够，单独放宽
const IMPORT_TIMEOUT = 5 * 60 * 1000

export const importQualifications = async (
  file: File,
  library: 'primary' | 'backup' = 'primary'
): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('library', library)
  const response = await api.post('/api/v1/qualifications/import', formData, {
    timeout: IMPORT_TIMEOUT,
  })
  return response.data
}

export const previewQualificationsImport = async (
  file: File
): Promise<ImportPreviewResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(
    '/api/v1/qualifications/import/preview',
    formData,
    {
      timeout: IMPORT_TIMEOUT,
    }
  )
  return response.data
}

export const downloadQualificationImportErrorReport = async (
  errors: ImportErrorItem[]
): Promise<void> => {
  const response = await api.post(
    '/api/v1/qualifications/import/error-report',
    { errors },
    {
      responseType: 'blob',
    }
  )
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '导入错误报告.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const getQualificationsBySignatures = async (
  signatures: string[],
  timeFilter?: { import_start: string; import_end: string; import_precision: 'month' | 'day' | 'second' },
  library: 'primary' | 'backup' = 'primary',
  businessFilters?: { business_type?: string; business_attribute?: string }
): Promise<BatchSignatureResponse> => {
  const response = await api.post(
    '/api/v1/qualifications/batch-by-signatures',
    { signatures, ...timeFilter, library, ...businessFilters }
  )
  return response.data
}

export interface SignatureSeriesRule {
  id: string
  pattern: string
  series_name: string
}

export const getSignatureSeriesRules = async (): Promise<SignatureSeriesRule[]> =>
  (await api.get('/api/v1/qualifications/series-rules')).data

export const saveSignatureSeriesRule = async (data: { pattern: string; series_name: string }, id?: string): Promise<SignatureSeriesRule> =>
  (await (id
    ? api.patch(`/api/v1/qualifications/series-rules/${id}`, data)
    : api.post('/api/v1/qualifications/series-rules', data))).data

export const saveSignatureSeriesRulesBatch = async (data: { patterns: string[]; series_name: string }): Promise<SignatureSeriesRule[]> =>
  (await api.post('/api/v1/qualifications/series-rules/batch', data)).data

export const deleteSignatureSeriesRule = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/qualifications/series-rules/${id}`)
}

export const classifySignatures = async (
  signatures: string[], library: 'primary' | 'backup', seriesName?: string
): Promise<{ updated_count: number; unmatched_signatures: string[] }> =>
  (await api.post('/api/v1/qualifications/series-rules/classify-signatures', { signatures, library, series_name: seriesName })).data

export const cleanupBackupQualifications = async (filters: { before?: string; reported?: boolean; dry_run?: boolean; ids?: string[] }): Promise<{ count: number; ids: string[]; dry_run: boolean }> =>
  (await api.post('/api/v1/qualifications/backup-cleanup', filters)).data

export const promoteEligibleBackupQualifications = async (body: { dry_run: boolean; ids?: string[] }): Promise<{ count: number; ids: string[]; dry_run: boolean }> =>
  (await api.post('/api/v1/qualifications/backup-promote', body)).data

export const promoteBackupQualificationsManually = async (ids: string[]): Promise<{ count: number; ids: string[] }> =>
  (await api.post('/api/v1/qualifications/backup-promote/manual', { ids })).data
