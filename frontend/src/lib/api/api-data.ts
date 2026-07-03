import api from '../api'
import type { ApiAccessConfig, ApiAccessConfigListResponse, ApiAccessDataResponse } from './types'

export const getApiAccessConfigs = async (): Promise<ApiAccessConfigListResponse> => {
  const response = await api.get('/api/v1/api-access')
  return response.data
}

export const getApiAccessConfig = async (id: string): Promise<ApiAccessConfig> => {
  const response = await api.get(`/api/v1/api-access/${id}`)
  return response.data
}

export const createApiAccessConfig = async (data: Partial<ApiAccessConfig>): Promise<ApiAccessConfig> => {
  const response = await api.post('/api/v1/api-access', data)
  return response.data
}

export const updateApiAccessConfig = async (id: string, data: Partial<ApiAccessConfig>): Promise<ApiAccessConfig> => {
  const response = await api.patch(`/api/v1/api-access/${id}`, data)
  return response.data
}

export const deleteApiAccessConfig = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/api-access/${id}`)
  return response.data
}

export const getApiAccessData = async (id: string, page = 1, page_size = 20): Promise<ApiAccessDataResponse> => {
  const response = await api.get(`/api/v1/api-access/${id}/data`, { params: { page, page_size } })
  return response.data
}
