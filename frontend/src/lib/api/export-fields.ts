import api from '../api'

export interface ExportField {
  id: string
  name: string
  label: string
  source: string
  group: string
  description?: string
}

export async function getExportFieldRegistry(): Promise<ExportField[]> {
  const response = await api.get('/api/v1/export-groups/registry')
  return response.data
}
