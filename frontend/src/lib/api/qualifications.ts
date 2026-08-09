import api from '../api'
import type { BatchSignatureResponse, QualificationInfo, QualificationListResponse, FileAttachmentPublic } from './types'

export const getQualifications = async (params?: {
  page?: number
  page_size?: number
  enterprise_name?: string
  cert_number?: string
  sms_signature?: string
}): Promise<QualificationListResponse> => {
  const response = await api.get('/api/v1/qualifications', { params })
  return response.data
}

export const getQualification = async (id: string): Promise<QualificationInfo> => {
  const response = await api.get(`/api/v1/qualifications/${id}`)
  return response.data
}

export const getQualificationAttachments = async (id: string): Promise<FileAttachmentPublic[]> => {
  const response = await api.get('/api/v1/files', { params: { entity_type: 'qualification_info', entity_id: id } })
  return response.data
}

export const uploadQualificationImage = async (
  entityId: string,
  file: File,
  fieldName: string,
): Promise<FileAttachmentPublic> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity_type', 'qualification_info')
  formData.append('entity_id', entityId)
  formData.append('field_name', fieldName)
  const response = await api.post('/api/v1/files/upload', formData)
  return response.data
}

export const createQualification = async (data: Partial<QualificationInfo>): Promise<QualificationInfo> => {
  const response = await api.post('/api/v1/qualifications', data)
  return response.data
}

export const updateQualification = async (id: string, data: Partial<QualificationInfo>): Promise<QualificationInfo> => {
  const response = await api.patch(`/api/v1/qualifications/${id}`, data)
  return response.data
}

export const deleteQualification = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/qualifications/${id}`)
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
  error_count: number
  errors: ImportErrorItem[]
  warnings?: string[]
  unrecognized_headers?: string[]
}

export interface ImportPreviewResult {
  headers: string[]
  rows: Record<string, string | null>[]
  unrecognized_headers: string[]
  total_data_rows: number
}

export const importQualifications = async (file: File): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/qualifications/import', formData)
  return response.data
}

export const previewQualificationsImport = async (file: File): Promise<ImportPreviewResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/qualifications/import/preview', formData)
  return response.data
}

export const downloadQualificationImportErrorReport = async (errors: ImportErrorItem[]): Promise<void> => {
  const response = await api.post('/api/v1/qualifications/import/error-report', { errors }, {
    responseType: 'blob',
  })
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
): Promise<BatchSignatureResponse> => {
  const response = await api.post('/api/v1/qualifications/batch-by-signatures', { signatures })
  return response.data
}
