import api from '../api'
import type { QualificationInfo, QualificationListResponse } from './types'

export const getQualifications = async (params?: {
  page?: number
  page_size?: number
  enterprise_name?: string
  cert_number?: string
}): Promise<QualificationListResponse> => {
  const response = await api.get('/api/v1/qualifications', { params })
  return response.data
}

export const getQualification = async (id: string): Promise<QualificationInfo> => {
  const response = await api.get(`/api/v1/qualifications/${id}`)
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
