import api from '../api'

/**
 * 权限API服务
 * 提供当前用户权限点与权限目录查询
 */

export interface PermissionItem {
    code: string
    label: string
}

export interface PermissionGroup {
    module: string
    label: string
    permissions: PermissionItem[]
}

export interface MyPermissions {
    permissions: string[]
    is_superuser: boolean
}

/**
 * 获取当前用户的权限点列表
 * @returns 权限点列表与超级用户标识
 */
export const getMyPermissions = async (): Promise<MyPermissions> => {
    const response = await api.get('/api/v1/users/me/permissions')
    return response.data
}

/**
 * 获取权限点目录（全部分组与中文标签）
 * @returns 权限分组列表
 */
export const getPermissionCatalog = async (): Promise<PermissionGroup[]> => {
    const response = await api.get('/api/v1/roles/permissions/catalog')
    return response.data
}
