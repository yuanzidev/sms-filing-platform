import api from '../api'
import type { ExportGroupsResponse } from './types'

/**
 * 获取所有导出字段组
 */
export const getExportGroups = async (): Promise<ExportGroupsResponse> => {
  const response = await api.get('/api/v1/export-groups')
  return response.data
}
