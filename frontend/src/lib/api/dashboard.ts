import api from '../api'
import type {
  DashboardStats,
  TrendDataPoint,
  CarrierDistribution,
  StatusDistribution,
  FilingTask,
} from './types'

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/api/v1/dashboard/stats')
  return response.data
}

export const getDashboardTrends = async (days?: number): Promise<TrendDataPoint[]> => {
  const response = await api.get('/api/v1/dashboard/trends', { params: { days } })
  return response.data
}

export const getCarrierDistribution = async (): Promise<CarrierDistribution[]> => {
  const response = await api.get('/api/v1/dashboard/carrier-dist')
  return response.data
}

export const getStatusDistribution = async (): Promise<StatusDistribution[]> => {
  const response = await api.get('/api/v1/dashboard/status-dist')
  return response.data
}

export const getRecentChanges = async (limit?: number): Promise<FilingTask[]> => {
  const response = await api.get('/api/v1/dashboard/recent-changes', { params: { limit } })
  return response.data
}

export interface ExpiringAuth {
  id: string
  carrier: string
  main_port_number: string | null
  sub_port_number: string | null
  province: string | null
  enterprise_name: string
  auth_end_date: string | null
}

export const getExpiringAuths = async (days?: number): Promise<ExpiringAuth[]> => {
  const response = await api.get('/api/v1/dashboard/expiring-auths', { params: { days } })
  return response.data
}

export type { DashboardStats, TrendDataPoint, CarrierDistribution, StatusDistribution }
