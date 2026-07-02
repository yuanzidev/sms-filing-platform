import type { Role } from '@/lib/api/roles'

export const mockRoles: Role[] = [
  {
    id: 'role-0001',
    name: '超级管理员',
    description: '系统最高权限，可管理所有功能和用户',
    permissions: ['用户管理', '角色管理', '报备管理', '端口管理', '日志查看', '系统设置'],
    host_permissions: ['所有主机'],
    user_count: 1,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
  {
    id: 'role-0002',
    name: '报备管理员',
    description: '管理报备工单的创建、编辑和审批',
    permissions: ['报备管理', '端口管理', '日志查看'],
    host_permissions: ['移动', '联通', '电信'],
    user_count: 3,
    created_at: '2025-02-01T00:00:00',
    updated_at: '2025-06-01T00:00:00',
  },
  {
    id: 'role-0003',
    name: '普通用户',
    description: '查看权限，可查看报备和端口信息',
    permissions: ['日志查看'],
    host_permissions: ['移动'],
    user_count: 5,
    created_at: '2025-03-01T00:00:00',
    updated_at: '2025-03-01T00:00:00',
  },
  {
    id: 'role-0004',
    name: '审核员',
    description: '负责报备工单的审核工作',
    permissions: ['报备管理', '日志查看'],
    host_permissions: ['联通', '电信'],
    user_count: 2,
    created_at: '2025-04-01T00:00:00',
    updated_at: '2025-04-15T00:00:00',
  },
]
