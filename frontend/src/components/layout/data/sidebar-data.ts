import {
  IconLayoutDashboard,
  IconFileDescription,
  IconPlugConnected,
  IconApi,
  IconSettings,
  IconUserCog,
  IconUsers,
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
      logo: IconList,
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
          url: '/records',
          icon: IconFileDescription,
        },
        {
          title: 'API 接入管理',
          url: '/api-data',
          icon: IconApi,
        },
        {
          title: '资质管理',
          url: '/qualifications',
          icon: IconFileDescription,
        },
        {
          title: '端口信息管理',
          url: '/port-info',
          icon: IconPlugConnected,
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
        },
        {
          title: '角色管理',
          url: '/users/roles',
          icon: IconUserCog,
        },
        {
          title: '登录日志',
          url: '/users/logs',
          icon: IconList,
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
