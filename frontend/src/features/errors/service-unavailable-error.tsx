import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceUnavailableErrorProps {
    className?: string
    minimal?: boolean
}

/**
 * 服务不可用错误组件
 * 当后端服务不可用时显示此组件
 * @param className 自定义样式类
 * @param minimal 是否为最小化显示
 * @returns JSX.Element 服务不可用错误组件
 */
export default function ServiceUnavailableError({
    className,
    minimal = false,
}: ServiceUnavailableErrorProps) {
    const navigate = useNavigate()

    const handleRetry = () => {
        window.location.reload()
    }

    const handleGoToLogin = () => {
        navigate({ to: '/sign-in' })
    }

    return (
        <div className={cn('h-svh w-full flex items-center justify-center', className)}>
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
                <div className="flex justify-center">
                    {minimal ? (
                        <WifiOff className="h-8 w-8 text-red-500" />
                    ) : (
                        <AlertCircle className="h-16 w-16 text-red-500" />
                    )}
                </div>
                {!minimal && (
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        服务不可用
                    </h1>
                )}
                <p className="text-gray-600 dark:text-gray-400">
                    无法连接到后端服务，请检查服务状态或稍后重试。
                </p>
                {!minimal && (
                    <div className="flex gap-3 justify-center">
                        <Button onClick={handleRetry} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            重试
                        </Button>
                        <Button onClick={handleGoToLogin}>
                            返回登录页
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
} 