import api from '../api'

export interface OperationLog {
    id: string
    username: string
    user_ip: string
    module: string
    action: string
    target: string
    result: 'success' | 'failed'
    detail?: string
    created_at: string
}

export interface OperationLogsResponse {
    data: OperationLog[]
    count: number
}

export const getOperationLogs = async (params?: {
    skip?: number
    limit?: number
    username?: string
    module?: string
    result?: string
    start_date?: string
    end_date?: string
}): Promise<OperationLogsResponse> => {
    const response = await api.get('/api/v1/operation-logs', { params })
    return response.data
}

export const getOperationLog = async (id: string): Promise<OperationLog> => {
    const response = await api.get(`/api/v1/operation-logs/${id}`)
    return response.data
}

