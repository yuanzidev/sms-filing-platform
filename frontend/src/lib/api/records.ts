import api from '../api'
import type { FilingRecord } from '../mock/data/records'

/**
 * 报备记录查询参数
 */
export interface RecordFilters {
  page?: number
  page_size?: number
  enterprise_name?: string
  main_port?: string
  sub_port?: string
  sms_signature?: string
  carrier?: string
  status?: string
  province?: string
  city?: string
  business_type?: string
  record_number?: string
  handler_name?: string
  start_date?: string
  end_date?: string
}

/**
 * 报备记录分页响应
 */
export interface RecordsResponse {
  data: FilingRecord[]
  total: number
  page: number
  page_size: number
}

/**
 * 获取报备记录列表
 * @param params 查询参数
 * @returns 报备记录列表和总数
 */
export const getRecords = async (params?: RecordFilters): Promise<RecordsResponse> => {
  const response = await api.get('/api/v1/records', { params })
  return response.data
}

/**
 * 获取单个报备记录
 * @param id 记录ID
 * @returns 报备记录信息
 */
export const getRecord = async (id: string): Promise<FilingRecord> => {
  const response = await api.get(`/api/v1/records/${id}`)
  return response.data
}

/**
 * 创建报备记录
 * @param data 记录数据
 * @returns 创建的报备记录
 */
export const createRecord = async (data: Partial<FilingRecord>): Promise<FilingRecord> => {
  const response = await api.post('/api/v1/records', data)
  return response.data
}

/**
 * 更新报备记录
 * @param id 记录ID
 * @param data 更新数据
 * @returns 更新后的报备记录
 */
export const updateRecord = async (id: string, data: Partial<FilingRecord>): Promise<FilingRecord> => {
  const response = await api.patch(`/api/v1/records/${id}`, data)
  return response.data
}

/**
 * 删除报备记录
 * @param id 记录ID
 * @returns 删除结果
 */
export const deleteRecord = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/records/${id}`)
  return response.data
}

export interface ImportUploadResponse {
  headers: string[]
  preview_rows: Record<string, unknown>[]
  image_columns: Record<string, string>
  total_rows: number
  image_count: number
  file_token: string
}

export interface ImportConfirmRequest {
  file_token: string
  field_mapping: Record<string, string>
}

export interface ImportConfirmResponse {
  success_count: number
  error_count: number
  errors: { row: number; message: string }[]
  import_batch: string
}

export interface ExportRequest {
  export_group_id: string
  carrier?: string
  status?: string
  enterprise_name?: string
  province?: string
  business_type?: string
}

/**
 * 上传 Excel 文件进行预览解析
 */
export const uploadImport = async (file: File): Promise<ImportUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/records/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/**
 * 确认导入（传入字段映射）
 */
export const confirmImport = async (body: ImportConfirmRequest): Promise<ImportConfirmResponse> => {
  const response = await api.post('/api/v1/records/import/confirm', body)
  return response.data
}

/**
 * 按分组模板导出报备记录
 */
export const exportRecords = async (body: ExportRequest): Promise<Blob> => {
  const response = await api.post('/api/v1/records/export', body, {
    responseType: 'blob',
  })
  return response.data
}
