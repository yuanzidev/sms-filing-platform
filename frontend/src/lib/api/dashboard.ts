import api from '../api'
import type { Carrier, FilingRecord } from '../mock/data/records'

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  total_records: number
  new_this_month: number
  updated_this_month: number
  incomplete: number
  expiring_soon: number
  main_port_count: number
  sub_port_count: number
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  date: string
  count: number
}

/**
 * 运营商分布数据
 */
export interface CarrierDistribution {
  carrier: Carrier
  count: number
}

/**
 * 状态分布数据
 */
export interface StatusDistribution {
  status: string
  count: number
}

/**
 * 获取仪表盘统计概览
 * @returns 统计数据
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/api/v1/dashboard/stats')
  return response.data
}

/**
 * 获取报备趋势数据
 * @param days 天数
 * @returns 趋势数据
 */
export const getDashboardTrends = async (days?: number): Promise<TrendDataPoint[]> => {
  const response = await api.get('/api/v1/dashboard/trends', { params: { days } })
  return response.data
}

/**
 * 获取运营商分布数据
 * @returns 运营商分布
 */
export const getCarrierDistribution = async (): Promise<CarrierDistribution[]> => {
  const response = await api.get('/api/v1/dashboard/carrier-dist')
  return response.data
}

/**
 * 获取状态分布数据
 */
export const getStatusDistribution = async (): Promise<StatusDistribution[]> => {
  const response = await api.get('/api/v1/dashboard/status-dist')
  return response.data
}

/**
 * 获取最近变更记录
 * @param limit 返回数量
 */
export const getRecentChanges = async (limit?: number): Promise<FilingRecord[]> => {
  const response = await api.get('/api/v1/dashboard/recent-changes', { params: { limit } })
  return response.data
}
