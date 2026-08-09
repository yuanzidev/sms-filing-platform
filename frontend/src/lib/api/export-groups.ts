import api from '../api'
import type { ExportGroupsResponse, ExportGroup } from './types'

export const getExportGroups = async (): Promise<ExportGroupsResponse> => {
  const response = await api.get('/api/v1/export-groups')
  return response.data
}

export const createExportGroup = async (data: {
  name: string
  description?: string
  fields: { field_name: string; field_label: string; sort_order: number }[]
}): Promise<ExportGroup> => {
  const response = await api.post('/api/v1/export-groups', data)
  return response.data
}

export const updateExportGroup = async (id: string, data: {
  name?: string
  description?: string
  fields?: { field_name: string; field_label: string; sort_order: number }[]
}): Promise<ExportGroup> => {
  const response = await api.patch(`/api/v1/export-groups/${id}`, data)
  return response.data
}

export const deleteExportGroup = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/export-groups/${id}`)
  return response.data
}

export const exportExportGroup = async (id: string): Promise<void> => {
  const response = await api.get(`/api/v1/export-groups/${id}/export`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `字段组_${id}.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export interface ExportGroupImportError {
  row: number
  field: string
  value: string
  reason: string
  suggestion: string
}

export interface ExportGroupImportResult {
  success_count: number
  error_count: number
  group_name?: string
  field_count?: number
  errors?: ExportGroupImportError[]
}

export const importExportGroup = async (
  file: File
): Promise<ExportGroupImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/api/v1/export-groups/import', formData)
  return data
}

export const downloadRegistryTemplate = async (): Promise<void> => {
  const response = await api.get('/api/v1/export-groups/registry/template', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '字段编码对照表.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
}
