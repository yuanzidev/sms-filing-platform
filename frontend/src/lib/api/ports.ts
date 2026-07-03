import api from '../api'
import type { MainPort, SubPort, MainPortListResponse, SubPortListResponse } from './types'

/**
 * 主端口列表查询参数
 */
export interface MainPortFilters {
  page?: number
  page_size?: number
  carrier?: string
  status?: string
  province?: string
}

/**
 * 主端口分页响应
 */
export interface MainPortsResponse {
  data: MainPort[]
  total: number
  page: number
  page_size: number
}

/**
 * 子端口列表查询参数
 */
export interface SubPortFilters {
  page?: number
  page_size?: number
  main_port_id?: string
  carrier?: string
  status?: string
  enterprise_name?: string
}

/**
 * 子端口分页响应
 */
export interface SubPortsResponse {
  data: SubPort[]
  total: number
  page: number
  page_size: number
}

/**
 * 获取主端口列表
 * @param params 查询参数
 * @returns 主端口列表和总数
 */
export const getMainPorts = async (params?: MainPortFilters): Promise<MainPortListResponse> => {
  const response = await api.get('/api/v1/ports/main', { params })
  return response.data
}

/**
 * 获取单个主端口
 * @param id 主端口ID
 * @returns 主端口信息
 */
export const getMainPort = async (id: string): Promise<MainPort> => {
  const response = await api.get(`/api/v1/ports/main/${id}`)
  return response.data
}

/**
 * 获取子端口列表
 * @param params 查询参数
 * @returns 子端口列表和总数
 */
export const getSubPorts = async (params?: SubPortFilters): Promise<SubPortListResponse> => {
  const response = await api.get('/api/v1/ports/sub', { params })
  return response.data
}

/**
 * 获取单个子端口
 * @param id 子端口ID
 * @returns 子端口信息
 */
export const getSubPort = async (id: string): Promise<SubPort> => {
  const response = await api.get(`/api/v1/ports/sub/${id}`)
  return response.data
}

/**
 * 创建主端口
 */
export const createMainPort = async (data: Partial<MainPort>): Promise<MainPort> => {
  const response = await api.post('/api/v1/ports/main', data)
  return response.data
}

/**
 * 更新主端口
 */
export const updateMainPort = async (id: string, data: Partial<MainPort>): Promise<MainPort> => {
  const response = await api.patch(`/api/v1/ports/main/${id}`, data)
  return response.data
}

/**
 * 删除主端口
 */
export const deleteMainPort = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/ports/main/${id}`)
  return response.data
}

/**
 * 创建子端口
 */
export const createSubPort = async (data: Partial<SubPort>): Promise<SubPort> => {
  const response = await api.post('/api/v1/ports/sub', data)
  return response.data
}

/**
 * 更新子端口
 */
export const updateSubPort = async (id: string, data: Partial<SubPort>): Promise<SubPort> => {
  const response = await api.patch(`/api/v1/ports/sub/${id}`, data)
  return response.data
}

/**
 * 删除子端口
 */
export const deleteSubPort = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/ports/sub/${id}`)
  return response.data
}
