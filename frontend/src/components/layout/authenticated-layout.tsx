import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'
import { isLoggedInSync } from '@/hooks/use-auth'
import useAuth from '@/hooks/use-auth'
import ServiceUnavailableError from '@/features/errors/service-unavailable-error'
import { FullScreenLoading } from '@/components/loading'

interface Props {
  children?: React.ReactNode
}

/**
 * 认证布局组件
 * 检查用户是否已登录，未登录则重定向到登录页
 * 检查后端服务是否可用，不可用时显示错误页面
 * @param children 子组件
 */
export function AuthenticatedLayout({ children }: Props) {
  const navigate = useNavigate()
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'
  const { isBackendAvailable, userLoading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 检查是否已登录
    if (!isLoggedInSync()) {
      navigate({ to: '/sign-in' })
      return
    }

    // 如果后端状态已确定，停止检查
    if (isBackendAvailable !== null) {
      setIsChecking(false)
    }
  }, [navigate, isBackendAvailable])

  // 如果正在检查或加载用户信息，显示加载状态
  if (isChecking || userLoading) {
    return <FullScreenLoading text="正在检查服务状态..." />
  }

  // 如果后端服务不可用，显示错误页面
  if (isBackendAvailable === false) {
    return <ServiceUnavailableError />
  }

  // 如果未登录，不渲染内容
  if (!isLoggedInSync()) {
    return null
  }

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'ml-auto w-full max-w-full',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
          )}
        >
          {children ? children : <Outlet />}
        </div>
      </SidebarProvider>
    </SearchProvider>
  )
}
