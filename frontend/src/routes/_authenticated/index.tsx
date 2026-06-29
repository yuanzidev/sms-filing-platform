import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'

function Welcome() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          欢迎使用 SMS 报备管理平台
        </h1>
        <p className="mt-3 text-muted-foreground">
          SMS Filing Management Platform · 脚手架已就绪
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          这里是首页占位。可在此添加报备工单、客户管理、统计概览等业务模块入口。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/system/users' })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            进入用户管理
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/settings' })}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            个人设置
          </button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/')({
  component: Welcome,
})
