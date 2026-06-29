import api from '../api'

/**
 * 角色管理API服务
 * 提供角色相关的API接口
 */

export interface Role {
    id: string
    name: string
    description?: string
    permissions: string[]
    host_permissions: string[]
    user_count: number
    created_at: string
    updated_at: string
}

export interface CreateRoleRequest {
    name: string
    description?: string
    permissions?: string[]
    host_permissions?: string[]
}

export interface UpdateRoleRequest {
    name?: string
    description?: string
    permissions?: string[]
    host_permissions?: string[]
}

export interface RolesResponse {
    data: Role[]
    count: number
}

/**
 * 获取角色列表
 * @param params 查询参数
 * @returns 角色列表和总数
 */
export const getRoles = async (params?: {
    skip?: number
    limit?: number
}): Promise<RolesResponse> => {
    const response = await api.get('/api/v1/roles', { params })
    return response.data
}

/**
 * 获取单个角色
 * @param id 角色ID
 * @returns 角色信息
 */
export const getRole = async (id: string): Promise<Role> => {
    const response = await api.get(`/api/v1/roles/${id}`)
    return response.data
}

/**
 * 创建角色
 * @param roleData 角色数据
 * @returns 创建的角色信息
 */
export const createRole = async (roleData: CreateRoleRequest): Promise<Role> => {
    const response = await api.post('/api/v1/roles', roleData)
    return response.data
}

/**
 * 更新角色
 * @param id 角色ID
 * @param roleData 更新数据
 * @returns 更新后的角色信息
 */
export const updateRole = async (id: string, roleData: UpdateRoleRequest): Promise<Role> => {
    const response = await api.patch(`/api/v1/roles/${id}`, roleData)
    return response.data
}

/**
 * 删除角色
 * @param id 角色ID
 * @returns 删除结果
 */
export const deleteRole = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/roles/${id}`)
    return response.data
} 
