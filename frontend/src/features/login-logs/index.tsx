import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getLoginLogs, deleteLoginLog, clearLoginLogs, type LoginLog } from '@/lib/api/login-logs'
import { formatCN } from '@/lib/time'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function LoginLogsPage() {
    const [clearDialogOpen, setClearDialogOpen] = useState(false)
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['login-logs'],
        queryFn: () => getLoginLogs(),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteLoginLog(id),
        onSuccess: () => {
            toast.success('日志删除成功')
            queryClient.invalidateQueries({ queryKey: ['login-logs'] })
        },
    })

    const clearMutation = useMutation({
        mutationFn: () => clearLoginLogs(),
        onSuccess: () => {
            toast.success('日志清理成功')
            setClearDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['login-logs'] })
        },
    })

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500" />
            default:
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="default">成功</Badge>
            case 'failed':
                return <Badge variant="destructive">失败</Badge>
            default:
                return <Badge variant="secondary">未知</Badge>
        }
    }

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
                        <h2 className='text-2xl font-bold tracking-tight'>登录日志</h2>
                        <p className='text-muted-foreground'>
                            查看系统登录记录和安全信息
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['login-logs'] })}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setClearDialogOpen(true)}
                            disabled={logs.length === 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            清理日志
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {logs.map((log) => (
                        <Card key={log.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(log.status)}
                                        <CardTitle className="text-lg">{log.username}</CardTitle>
                                        {getStatusBadge(log.status)}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(log.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardDescription>
                                    登录时间: {formatCN(log.login_time, { withSeconds: true })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">IP地址:</span>
                                        <span className="font-mono">{log.ip_address}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">用户代理:</span>
                                        <span className="max-w-md truncate">{log.user_agent}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {logs.length === 0 && !isLoading && (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">暂无登录日志</p>
                    </div>
                )}
            </Main>

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认清理</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要清理所有登录日志吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                            清理
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default LoginLogsPage
