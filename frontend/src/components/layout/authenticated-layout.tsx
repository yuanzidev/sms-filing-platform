import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'
import { isLoggedInSync } from '@/hooks/use-auth'
import { FullScreenLoading } from '@/components/loading'

interface Props {
  children?: React.ReactNode
}

const DEMO_TOKEN = 'demo-static-token-for-display'

export function AuthenticatedLayout({ children }: Props) {
  const navigate = useNavigate()
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoggedInSync()) {
      localStorage.setItem('access_token', DEMO_TOKEN)
    }

    // Short delay to let the token take effect and router stabilize
    const timer = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(timer)
  }, [navigate])

  if (!ready) {
    return <FullScreenLoading text="加载中..." />
  }

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
