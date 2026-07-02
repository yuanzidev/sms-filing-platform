import api from '../api'
import type { FilingRecord } from '../mock/data/records'

/**
 * 报备记录查询参数
 */
export interface RecordFilters {
  page?: number
  pageSize?: number
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
  pageSize: number
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
