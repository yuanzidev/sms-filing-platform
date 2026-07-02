import api from './api'

/**
 * 用户信息接口
 */
export interface UserPublic {
    id: string
    email: string
    username: string
    is_active: boolean
    is_superuser: boolean
    full_name?: string
    status: string
    last_login?: string
    role?: {
        id: string
        name: string
        description?: string
    } | null
    created_at: string
    updated_at: string
}

/**
 * 登录请求数据接口
 */
export interface LoginAccessTokenData {
    username: string
    password: string
}

/**
 * 登录响应数据接口
 */
export interface LoginAccessTokenResponse {
    access_token: string
    token_type: string
}

/**
 * 注册请求数据接口
 */
export interface UserRegister {
    email: string
    password: string
    full_name?: string
}

// 更新个人资料
export interface UpdateMeRequest {
    full_name?: string
    email?: string
}

// 更新密码
export interface UpdatePasswordRequest {
    current_password: string
    new_password: string
}

/**
 * API错误接口
 */
export interface ApiError {
    detail: string
    status: number
}

/**
 * 登录服务类
 * 处理用户登录相关API调用
 */
export class LoginService {
    /**
     * 用户登录获取访问令牌
     * @param data 登录表单数据
     * @returns 登录响应数据
     */
    static async loginAccessToken(
        data: LoginAccessTokenData
    ): Promise<LoginAccessTokenResponse> {
        const formData = new FormData()
        formData.append('username', data.username)
        formData.append('password', data.password)

        const response = await api.post('/api/v1/login/access-token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })
        return response.data
    }

    /**
     * 测试访问令牌有效性
     * @returns 当前用户信息
     */
    static async testToken(): Promise<UserPublic> {
        const response = await api.post('/api/v1/login/test-token')
        return response.data
    }
}

/**
 * 用户服务类
 * 处理用户相关API调用
 */
export class UsersService {
    /**
     * 获取当前用户信息
     * @returns 当前用户信息
     */
    static async readUserMe(): Promise<UserPublic> {
        const response = await api.get('/api/v1/users/me')
        return response.data
    }

    /**
     * 更新当前用户资料
     */
    static async updateUserMe(data: UpdateMeRequest): Promise<UserPublic> {
        const response = await api.patch('/api/v1/users/me', data)
        return response.data
    }

    /**
     * 更新当前用户密码
     */
    static async updatePasswordMe(data: UpdatePasswordRequest): Promise<{ message: string }> {
        const response = await api.patch('/api/v1/users/me/password', data)
        return response.data
    }

    /**
     * 用户注册
     * @param data 注册数据
     * @returns 注册成功的用户信息
     */
    static async registerUser(data: UserRegister): Promise<UserPublic> {
        const response = await api.post('/api/v1/users/signup', data)
        return response.data
    }
} 
