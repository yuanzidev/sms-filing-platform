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
