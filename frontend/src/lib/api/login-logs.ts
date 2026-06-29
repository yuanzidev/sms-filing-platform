import api from '../api'

/**
 * 登录日志API服务
 * 提供登录日志相关的API接口
 */

export interface LoginLog {
    id: string
    username: string
    status: 'success' | 'failed'
    ip_address: string
    user_agent?: string
    login_time: string
}

export interface LoginLogsResponse {
    data: LoginLog[]
    count: number
}

/**
 * 获取登录日志列表
 * @param params 查询参数
 * @returns 登录日志列表和总数
 */
export const getLoginLogs = async (params?: {
    skip?: number
    limit?: number
    username?: string
    status?: string
    start_date?: string
    end_date?: string
}): Promise<LoginLogsResponse> => {
    const response = await api.get('/api/v1/login-logs', { params })
    return response.data
}

/**
 * 获取单个登录日志
 * @param id 日志ID
 * @returns 登录日志信息
 */
export const getLoginLog = async (id: string): Promise<LoginLog> => {
    const response = await api.get(`/api/v1/login-logs/${id}`)
    return response.data
}

/**
 * 删除登录日志
 * @param id 日志ID
 * @returns 删除结果
 */
export const deleteLoginLog = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/login-logs/${id}`)
    return response.data
}

/**
 * 清理登录日志
 * @param beforeDate 清理指定日期之前的日志
 * @returns 清理结果
 */
export const clearLoginLogs = async (beforeDate?: string): Promise<{ message: string }> => {
    const response = await api.delete('/api/v1/login-logs', {
        params: beforeDate ? { before_date: beforeDate } : {}
    })
    return response.data
} 