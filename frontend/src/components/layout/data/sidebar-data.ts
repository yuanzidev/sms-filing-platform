import {
  IconLayoutDashboard,
  IconFileDescription,
  IconPlugConnected,
  IconNetwork,
  IconApi,
  IconSettings,
  IconUserCog,
  IconUsers,
  IconMessageReport,
  IconList,
} from '@tabler/icons-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@sms-filing-platform.local',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'SMS Filing',
      logo: IconMessageReport,
      plan: '报备管理平台',
    },
  ],
  navGroups: [
    {
      title: '主要功能',
      items: [
        {
          title: '工作台',
          url: '/',
          icon: IconLayoutDashboard,
        },
        {
          title: '报备管理',
          url: '/filing-management',
          icon: IconFileDescription,
          permissions: ['filing:read'],
        },
        {
          title: '资质管理',
          url: '/qualifications',
          icon: IconFileDescription,
          permissions: ['qualification:read'],
        },
        {
          title: '端口管理',
          url: '/port-info',
          icon: IconPlugConnected,
          permissions: ['port:read'],
        },
        {
          title: '子端口库',
          url: '/sub-ports',
          icon: IconNetwork,
          permissions: ['sub_port:read'],
        },
        {
          title: '导出字段组',
          url: '/export-groups',
          icon: IconFileDescription,
          permissions: ['export_group:read'],
        },
        {
          title: 'API 接入管理',
          url: '/api-data',
          icon: IconApi,
          permissions: ['api_access:read'],
        },
      ],
    },
    {
      title: '系统管理',
      items: [
        {
          title: '用户管理',
          url: '/users',
          icon: IconUsers,
          permissions: ['user:read'],
        },
        {
          title: '角色管理',
          url: '/users/roles',
          icon: IconUserCog,
          permissions: ['role:read'],
        },
        {
          title: '登录日志',
          url: '/users/logs',
          icon: IconList,
          permissions: ['log:read'],
        },
        {
          title: '操作日志',
          url: '/users/operation-logs',
          icon: IconList,
          permissions: ['log:read'],
        },
        {
          title: '个人设置',
          url: '/settings',
          icon: IconSettings,
        },
      ],
    },
  ],
}
