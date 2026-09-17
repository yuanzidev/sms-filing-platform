import api from '../api'

export const SUB_PORT_STATUSES = ['在线', '下线', '整改'] as const

export interface SubPortRecord {
  id: string
  main_port_number: string
  sub_port_number: string
  status: string
  field_values: Record<string, string>
  created_at: string
  updated_at: string
}

export interface SubPortRecordsResponse {
  data: SubPortRecord[]
  total: number
  page: number
  page_size: number
}

export interface SubPortRecordCreatePayload {
  main_port_number: string
  sub_port_number: string
  status?: string
  field_values?: Record<string, string>
}

export interface SubPortRecordUpdatePayload {
  main_port_number?: string
  sub_port_number?: string
  status?: string
  field_values?: Record<string, string>
}

export interface DeleteListTarget {
  main_port_number: string
  sub_port_number: string
}

export interface ParseDeleteResult {
  matched_count: number
  matched: DeleteListTarget[]
  unmatched: DeleteListTarget[]
  total: number
}

export interface DeleteListResult {
  deleted_count: number
  unmatched: DeleteListTarget[]
  total: number
}

export const getSubPortRecords = async (params?: {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  main_port_number?: string
  sub_port_number?: string
}): Promise<SubPortRecordsResponse> => {
  const response = await api.get('/api/v1/sub-port-library', { params })
  return response.data
}

export const downloadSubPortRecords = async (params: {
  group_id: string
  keyword?: string
  status?: string
  main_port_number?: string
  sub_port_number?: string
  ids?: string[]
  field_names?: string[]
}): Promise<void> => {
  const response = await api.get('/api/v1/sub-port-library/export', {
    params: {
      group_id: params.group_id,
      keyword: params.keyword,
      status: params.status,
      main_port_number: params.main_port_number,
      sub_port_number: params.sub_port_number,
      ids: params.ids?.join(',') || undefined,
      field_names: params.field_names?.join(',') || undefined,
    },
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '子端口库导出.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const createSubPortRecord = async (
  data: SubPortRecordCreatePayload
): Promise<SubPortRecord> => {
  const response = await api.post('/api/v1/sub-port-library', data)
  return response.data
}

export const updateSubPortRecord = async (
  id: string,
  data: SubPortRecordUpdatePayload
): Promise<SubPortRecord> => {
  const response = await api.patch(`/api/v1/sub-port-library/${id}`, data)
  return response.data
}

export const deleteSubPortRecord = async (
  id: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/sub-port-library/${id}`)
  return response.data
}

export const batchDeleteSubPortRecords = async (
  ids: string[]
): Promise<{ deleted_count: number }> => {
  const response = await api.post('/api/v1/sub-port-library/batch-delete', {
    ids,
  })
  return response.data
}

export const downloadSubPortTemplate = async (
  groupId: string
): Promise<void> => {
  const response = await api.get('/api/v1/sub-port-library/template', {
    params: { group_id: groupId },
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '子端口数据导入模板.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export interface SubPortImportErrorItem {
  row: number
  field: string
  value: string
  reason: string
  suggestion: string
}

export interface SubPortImportResult {
  total: number
  success_count: number
  error_count: number
  errors: SubPortImportErrorItem[]
  warnings?: string[]
  message: string
}

export interface SubPortImportPreviewResult {
  headers: string[]
  rows: Record<string, string>[]
  unrecognized_headers: string[]
  total_data_rows: number
}

export const importSubPorts = async (
  file: File,
  groupId: string
): Promise<SubPortImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('group_id', groupId)
  const response = await api.post('/api/v1/sub-port-library/import', formData)
  return response.data
}

export const previewSubPortsImport = async (
  file: File,
  groupId: string
): Promise<SubPortImportPreviewResult> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('group_id', groupId)
  const response = await api.post(
    '/api/v1/sub-port-library/import/preview',
    formData
  )
  return response.data
}

export const parseDeleteList = async (
  file: File
): Promise<ParseDeleteResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(
    '/api/v1/sub-port-library/import/parse-delete',
    formData
  )
  return response.data
}

export const deleteByList = async (file: File): Promise<DeleteListResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(
    '/api/v1/sub-port-library/import/delete',
    formData
  )
  return response.data
}
