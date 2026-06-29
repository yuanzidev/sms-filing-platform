import { toast } from 'sonner'
import type { ApiError } from '@/lib/auth'

/**
 * 处理API错误
 * @param error API错误对象
 */
export function handleError(error: ApiError | unknown) {
    let message = '操作失败，请稍后重试'

    if (error && typeof error === 'object' && 'detail' in error) {
        const apiError = error as ApiError
        message = apiError.detail || message
    } else if (error instanceof Error) {
        message = error.message
    }

    toast.error(message)
} 