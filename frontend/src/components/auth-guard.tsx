import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isLoggedIn } from '@/hooks/use-auth'

interface AuthGuardProps {
    children: React.ReactNode
}

/**
 * 认证保护组件
 * 检查用户是否已登录，未登录则重定向到登录页
 * @param children 子组件
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoggedIn()) {
            navigate({ to: '/sign-in' })
        }
    }, [navigate])

    if (!isLoggedIn()) {
        return null
    }

    return <>{children}</>
} 