import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getMyPermissions } from '@/lib/api/permissions'
import { isLoggedInSync, isDemoMode } from '@/hooks/use-auth'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import type { NavGroup } from '@/components/layout/types'

/**
 * 当前用户权限点 Hook
 * 前端门控仅用于隐藏无权操作入口；接口层仍由后端 require_permission 最终裁决。
 */
export function usePermissions() {
  const demo = isDemoMode()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['myPermissions'],
    queryFn: getMyPermissions,
    enabled: !demo && isLoggedInSync(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return useMemo(() => {
    // demo 模式视为超级用户；权限接口异常时前端放行，避免瞬时故障锁死界面
    const allAllowed = demo || !!data?.is_superuser || (!isLoading && isError)
    const granted = new Set(data?.permissions ?? [])
    return {
      isLoading: demo ? false : isLoading,
      isSuperuser: demo || !!data?.is_superuser,
      has: (code: string) => allAllowed || granted.has(code),
      hasAny: (codes: string[]) => allAllowed || codes.some((c) => granted.has(c)),
    }
  }, [demo, data, isLoading, isError])
}

/**
 * 按权限过滤后的侧边栏导航组（工作台、个人设置等无权限要求的菜单始终可见）
 */
export function useNavGroups(): NavGroup[] {
  const { hasAny } = usePermissions()
  return useMemo(
    () =>
      sidebarData.navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => !item.permissions || hasAny(item.permissions)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [hasAny]
  )
}
