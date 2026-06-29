import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

/**
 * 错误边界组件
 * 捕获子组件中的JavaScript错误，记录错误信息，并显示降级UI
 * @param children 子组件
 * @param fallback 自定义错误显示组件
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // 更新state，下次渲染时显示降级UI
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 可以在这里记录错误信息
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            // 如果有自定义错误组件，使用自定义组件
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback
                return <FallbackComponent error={this.state.error} resetError={this.resetError} />
            }

            // 默认错误UI
            return (
                <div className="h-svh w-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md mx-auto p-6">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-16 w-16 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            应用出现错误
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            抱歉，应用遇到了一个意外错误。请尝试刷新页面。
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.resetError} variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                重试
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                刷新页面
                            </Button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500">
                                    错误详情（开发模式）
                                </summary>
                                <pre className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto">
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary 