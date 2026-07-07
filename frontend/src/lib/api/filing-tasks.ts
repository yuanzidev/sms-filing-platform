import api from '../api'
import type { FilingTask, FilingTasksResponse, CreateFilingTaskRequest } from './types'

/**
 * 报备任务查询参数
 */
export interface FilingTaskFilters {
  page?: number
  page_size?: number
  start_date?: string
  end_date?: string
  keyword?: string
}

/**
 * 获取报备任务列表
 */
export const getFilingTasks = async (params?: FilingTaskFilters): Promise<FilingTasksResponse> => {
  const response = await api.get('/api/v1/filing-tasks', { params })
  return response.data
}

/**
 * 获取单个报备任务详情
 */
export const getFilingTask = async (id: string): Promise<FilingTask> => {
  const response = await api.get(`/api/v1/filing-tasks/${id}`)
  return response.data
}

/**
 * 创建报备任务
 */
export const createFilingTask = async (data: CreateFilingTaskRequest): Promise<FilingTask> => {
  const response = await api.post('/api/v1/filing-tasks', data)
  return response.data
}

/**
 * 删除报备任务
 */
export const deleteFilingTask = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/filing-tasks/${id}`)
  return response.data
}

/**
 * 下载报备任务文件（blob，后端代理 MinIO）
 */
export const downloadFilingTaskFile = async (id: string, filename: string): Promise<void> => {
  const response = await api.get(`/api/v1/filing-tasks/${id}/download`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
