import api from '../api'
import type { PortInfo, PortInfoListResponse } from './types'

export const getPortInfos = async (params?: {
  page?: number
  page_size?: number
  carrier?: string
  province?: string
  business_type?: string
}): Promise<PortInfoListResponse> => {
  const response = await api.get('/api/v1/port-info', { params })
  return response.data
}

export const getPortInfo = async (id: string): Promise<PortInfo> => {
  const response = await api.get(`/api/v1/port-info/${id}`)
  return response.data
}

export const createPortInfo = async (data: Partial<PortInfo>): Promise<PortInfo> => {
  const response = await api.post('/api/v1/port-info', data)
  return response.data
}

export const updatePortInfo = async (id: string, data: Partial<PortInfo>): Promise<PortInfo> => {
  const response = await api.patch(`/api/v1/port-info/${id}`, data)
  return response.data
}

export const deletePortInfo = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/port-info/${id}`)
  return response.data
}
