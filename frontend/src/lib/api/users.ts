import api from '../api'

/**
 * 用户管理API服务
 * 提供用户相关的API接口
 */

export interface User {
    id: string
    email: string
    username: string
    full_name?: string
    is_active: boolean
    is_superuser: boolean
    status: 'active' | 'inactive' | 'suspended'
    last_login?: string
    role?: {
        id: string
        name: string
        description?: string
    }
    created_at: string
    updated_at: string
}

export interface CreateUserRequest {
    email: string
    username: string
    password: string
    full_name?: string
    role_id?: string
}

export interface UpdateUserRequest {
    email?: string
    username?: string
    password?: string
    full_name?: string
    role_id?: string
    status?: 'active' | 'inactive' | 'suspended'
}

export interface UsersResponse {
    data: User[]
    count: number
}

/**
 * 获取用户列表
 * @param params 查询参数
 * @returns 用户列表和总数
 */
export const getUsers = async (params?: {
    skip?: number
    limit?: number
    username?: string
    status?: string
    role_id?: string
}): Promise<UsersResponse> => {
    const response = await api.get('/api/v1/users', { params })
    return response.data
}

/**
 * 获取单个用户
 * @param id 用户ID
 * @returns 用户信息
 */
export const getUser = async (id: string): Promise<User> => {
    const response = await api.get(`/api/v1/users/${id}`)
    return response.data
}

/**
 * 创建用户
 * @param userData 用户数据
 * @returns 创建的用户信息
 */
export const createUser = async (userData: CreateUserRequest): Promise<User> => {
    const response = await api.post('/api/v1/users', userData)
    return response.data
}

/**
 * 更新用户
 * @param id 用户ID
 * @param userData 更新数据
 * @returns 更新后的用户信息
 */
export const updateUser = async (id: string, userData: UpdateUserRequest): Promise<User> => {
    const response = await api.patch(`/api/v1/users/${id}`, userData)
    return response.data
}

/**
 * 删除用户
 * @param id 用户ID
 * @returns 删除结果
 */
export const deleteUser = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/users/${id}`)
    return response.data
}

/**
 * 重置用户密码
 * @param id 用户ID
 * @param newPassword 新密码
 * @returns 重置结果
 */
export const resetUserPassword = async (id: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.patch(`/api/v1/users/${id}/reset-password`, { new_password: newPassword })
    return response.data
}

/**
 * 启用用户
 * @param id 用户ID
 * @returns 操作结果
 */
export const enableUser = async (id: string): Promise<{ message: string }> => {
    const response = await api.patch(`/api/v1/users/${id}/enable`)
    return response.data
}

/**
 * 禁用用户
 * @param id 用户ID
 * @returns 操作结果
 */
export const disableUser = async (id: string): Promise<{ message: string }> => {
    const response = await api.patch(`/api/v1/users/${id}/disable`)
    return response.data
}

/**
 * 更新用户状态
 * @param id 用户ID
 * @param status 新状态
 * @returns 操作结果
 */
export const updateUserStatus = async (id: string, status: string): Promise<{ message: string }> => {
    const response = await api.patch(`/api/v1/users/${id}/status`, { status })
    return response.data
} 