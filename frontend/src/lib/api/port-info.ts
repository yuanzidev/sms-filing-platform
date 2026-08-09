import api from '../api'
import type { PortInfo, PortInfoListResponse } from './types'

export const getPortInfos = async (params?: {
  page?: number
  page_size?: number
  carrier?: string
  province?: string
  keyword?: string
  city?: string
  port_type?: string
  main_port_number?: string
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

export const downloadPortInfoTemplate = async (): Promise<void> => {
  const response = await api.get('/api/v1/port-info/template', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '端口信息导入模板.xlsx')
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
}

export const importPortInfos = async (file: File): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/v1/port-info/import', formData)
  return response.data
}

export const downloadPortInfoImportErrorReport = async (errors: ImportErrorItem[]): Promise<void> => {
  const response = await api.post('/api/v1/port-info/import/error-report', { errors }, {
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
