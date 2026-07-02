import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { LoginService, UsersService, type LoginAccessTokenData, type UserRegister, type UserPublic, type ApiError } from '@/lib/auth'
import { handleError } from '@/utils/handle-error'
import api from '@/lib/api'

const DEMO_TOKEN = 'demo-static-token-for-display'

const isDemoMode = (): boolean => {
    return localStorage.getItem('access_token') === DEMO_TOKEN
}

const demoUser: UserPublic = {
    id: 'demo-0001',
    email: 'demo@sms-filing.example.com',
    username: 'demo',
    full_name: '演示用户',
    is_active: true,
    is_superuser: true,
    status: 'active',
    role: { id: 'role-0001', name: '超级管理员', description: '演示模式默认角色' },
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
}

/**
 * 检查后端服务是否可用
 */
const checkBackendHealth = async (): Promise<boolean> => {
    if (isDemoMode()) return true
    try {
        const response = await api.get('/api/v1/utils/health-check/', { timeout: 5000 })
        return response.status === 200
    } catch (error) {
        console.error('Backend health check failed:', error)
        return false
    }
}

/**
 * 验证token是否有效
 */
const validateToken = async (): Promise<boolean> => {
    if (isDemoMode()) return true
    const token = localStorage.getItem('access_token')
    if (!token) return false

    try {
        await UsersService.readUserMe()
        return true
    } catch (error) {
        console.error('Token validation failed:', error)
        localStorage.removeItem('access_token')
        return false
    }
}

/**
 * 检查用户是否已登录（包含后端验证）
 */
const isLoggedIn = async (): Promise<boolean> => {
    if (isDemoMode()) return true
    const isBackendHealthy = await checkBackendHealth()
    if (!isBackendHealthy) {
        toast.error('后端服务不可用，请检查服务状态')
        return false
    }
    return await validateToken()
}

/**
 * 同步版本的登录检查（用于组件渲染）
 */
const isLoggedInSync = (): boolean => {
    return localStorage.getItem('access_token') !== null
}

const useAuth = () => {
    const [error, setError] = useState<string | null>(null)
    const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { auth } = useAuthStore()
    const demo = useMemo(() => isDemoMode(), [])

    // 检查后端服务状态（demo模式跳过）
    const { data: backendHealth, error: backendError } = useQuery({
        queryKey: ['backendHealth'],
        queryFn: checkBackendHealth,
        retry: false,
        staleTime: 30000,
        enabled: !demo,
    })

    // 处理后端健康检查结果
    useEffect(() => {
        if (demo) {
            setIsBackendAvailable(true)
            return
        }
        if (backendHealth !== undefined) {
            setIsBackendAvailable(backendHealth)
            if (!backendHealth) {
                toast.error('后端服务不可用，请检查服务状态')
            }
        }
    }, [backendHealth, demo])

    // 处理后端连接错误
    useEffect(() => {
        if (backendError) {
            setIsBackendAvailable(false)
            toast.error('无法连接到后端服务')
        }
    }, [backendError])

    // 获取当前用户信息（demo模式返回静态数据）
    const userQuery = useQuery<UserPublic | null, Error>({
        queryKey: ['currentUser'],
        queryFn: UsersService.readUserMe,
        enabled: !demo && isLoggedInSync() && isBackendAvailable === true,
        retry: false,
    })

    const user = demo ? demoUser : userQuery.data
    const userLoading = demo ? false : userQuery.isLoading
    const userError = demo ? null : userQuery.error

    // 记录用户信息获取错误
    useEffect(() => {
        if (userError) {
            console.error('Failed to fetch user:', userError)
        }
    }, [userError])

    // 注册mutation
    const signUpMutation = useMutation({
        mutationFn: (data: UserRegister) =>
            UsersService.registerUser(data),
        onSuccess: () => {
            toast.success('注册成功，请登录')
            navigate({ to: '/sign-in' })
        },
        onError: (err: ApiError) => {
            handleError(err)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    // 登录函数
    const login = async (data: LoginAccessTokenData) => {
        const response = await LoginService.loginAccessToken(data)
        localStorage.setItem('access_token', response.access_token)
        return response
    }

    // 登录mutation
    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: (response) => {
            auth.setAccessToken(response.access_token)
            toast.success('登录成功')
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
            navigate({ to: '/' })
        },
        onError: (err: ApiError) => {
            handleError(err)
        },
    })

    // 登出函数
    const logout = () => {
        localStorage.removeItem('access_token')
        auth.reset()
        queryClient.clear()
        toast.success('已退出登录')
        navigate({ to: '/sign-in', replace: true })
    }

    return {
        signUpMutation,
        loginMutation,
        logout,
        user,
        userLoading,
        isBackendAvailable,
        error,
        resetError: () => setError(null),
    }
}

export { isLoggedIn, isLoggedInSync }
export default useAuth 