import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw } from 'lucide-react'
import { getOperationLogs } from '@/lib/api/operation-logs'
import { formatCN } from '@/lib/time'

const MODULE_LABELS: Record<string, string> = {
  users: '用户管理',
  roles: '角色管理',
  login: '登录认证',
  ports: '端口管理',
  qualifications: '资质管理',
  filing_tasks: '报备任务',
  api_access: 'API接入',
  dashboard: '工作台',
}

export function OperationLogsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['operation-logs'],
    queryFn: () => getOperationLogs({ limit: 200 }),
  })

  const logs = data?.data ?? []

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>操作日志</h2>
            <p className='text-muted-foreground'>
              查看系统操作记录和审计信息
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['operation-logs'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-muted-foreground">加载失败，请稍后重试</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">暂无操作日志</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">{log.username}</CardTitle>
                      <Badge variant={log.result === 'success' ? 'default' : 'destructive'}>
                        {log.result === 'success' ? '成功' : '失败'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCN(log.created_at, { withSeconds: true })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">模块: </span>
                      <span>{MODULE_LABELS[log.module] || log.module}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">操作: </span>
                      <span>{log.action}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">目标: </span>
                      <span>{log.target}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP: </span>
                      <span className="font-mono">{log.user_ip}</span>
                    </div>
                  </div>
                  {log.detail && (
                    <p className="mt-2 text-sm text-muted-foreground">{log.detail}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}

export default OperationLogsPage
