import api from '../api'
import type {
  SubPortGenerationRule,
  SubPortGenerationRulesResponse,
} from './types'

export const getSubPortRules = async (): Promise<SubPortGenerationRule[]> => {
  const response = await api.get<SubPortGenerationRulesResponse>('/api/v1/sub-port-generation-rules')
  return response.data.data
}

export const createSubPortRule = async (data: {
  name: string
  mode: string
  config: Record<string, unknown>
  carrier?: string
}): Promise<SubPortGenerationRule> => {
  const response = await api.post('/api/v1/sub-port-generation-rules', data)
  return response.data
}

export const deleteSubPortRule = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/sub-port-generation-rules/${id}`)
}
