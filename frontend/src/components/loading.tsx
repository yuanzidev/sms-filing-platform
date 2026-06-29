import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
    className?: string
    text?: string
    size?: 'sm' | 'md' | 'lg'
}

/**
 * 加载组件
 * 显示加载状态和可选的加载文本
 * @param className 自定义样式类
 * @param text 加载文本
 * @param size 加载图标大小
 * @returns JSX.Element 加载组件
 */
export default function Loading({
    className,
    text = '加载中...',
    size = 'md'
}: LoadingProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    }

    return (
        <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
            <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
            {text && (
                <p className="text-sm text-muted-foreground">{text}</p>
            )}
        </div>
    )
}

/**
 * 全屏加载组件
 * 在页面中央显示加载状态
 * @param text 加载文本
 * @param size 加载图标大小
 * @returns JSX.Element 全屏加载组件
 */
export function FullScreenLoading({
    text = '正在检查服务状态...',
    size = 'md'
}: Omit<LoadingProps, 'className'>) {
    return (
        <div className="h-svh w-full flex items-center justify-center">
            <Loading text={text} size={size} />
        </div>
    )
} 