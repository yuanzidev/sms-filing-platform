import api from '../api'
import type { ApiDataItem } from '../mock/data/api-data'

/**
 * API数据查询参数
 */
export interface ApiDataFilters {
  page?: number
  pageSize?: number
  api_name?: string
  data_type?: string
  enterprise_name?: string
  status?: string
  carrier?: string
}

/**
 * API数据分页响应
 */
export interface ApiDataResponse {
  data: ApiDataItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 更新API数据状态请求
 */
export interface UpdateApiDataRequest {
  status: string
  error_reason?: string
}

/**
 * 获取API数据列表
 * @param params 查询参数
 * @returns API数据列表和总数
 */
export const getApiData = async (params?: ApiDataFilters): Promise<ApiDataResponse> => {
  const response = await api.get('/api/v1/api-data', { params })
  return response.data
}

/**
 * 更新API数据状态
 * @param id 数据ID
 * @param data 更新数据
 * @returns 更新后的API数据
 */
export const updateApiData = async (id: string, data: UpdateApiDataRequest): Promise<ApiDataItem> => {
  const response = await api.patch(`/api/v1/api-data/${id}`, data)
  return response.data
}
