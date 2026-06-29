import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/_authenticated/system/params')({
  component: SystemParams,
})

function SystemParams() {
  return (
    <>
      <Header>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">系统参数</h1>
          <p className="text-muted-foreground">
            系统参数配置页面待开发。可在此添加 SMS 报备业务相关的全局参数。
          </p>
        </div>
      </Main>
    </>
  )
}
