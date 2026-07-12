import axios from 'axios'

// Recursively walk response data and normalize naive UTC datetime strings by appending 'Z'.
function normalizeUtcDateStrings(value: any): any {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(normalizeUtcDateStrings)
  if (typeof value === 'object') {
    for (const k of Object.keys(value)) {
      value[k] = normalizeUtcDateStrings(value[k])
    }
    return value
  }
  if (typeof value === 'string') {
    // Match: YYYY-MM-DDTHH:mm[:ss][.fraction] without timezone (no Z or +hh:mm/-hh:mm)
    // Also accept space between date and time
    const s = value.trim()
    const hasTZ = /[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)
    const dateTimeLike = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,6})?)$/.test(s)
    if (!hasTZ && dateTimeLike) {
      // Keep original format, just standardize separator and append Z
      return s.replace(' ', 'T') + 'Z'
    }
  }
  return value
}

/**
 * API客户端配置
 * 提供统一的API请求接口
 */
function serializeParams(params: Record<string, unknown> = {}): string {
  const searchParams = new URLSearchParams()
  const appendValue = (key: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (value instanceof Date) {
      searchParams.append(key, value.toISOString())
      return
    }
    searchParams.append(key, String(value))
  }

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => appendValue(key, item))
      return
    }
    appendValue(key, value)
  })

  return searchParams.toString()
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 10000,
    paramsSerializer: (params: Record<string, unknown>) => serializeParams(params),
})

// 请求拦截器 - 仅添加认证token（不再做 URL 尾斜杠规范化，避免 307 重定向导致跨源丢失 Authorization）
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
    (response) => {
        try {
            if (response && response.data && typeof response.data === 'object') {
                response.data = normalizeUtcDateStrings(response.data)
            }
        } catch (_) {
            // noop on normalization errors
        }
        return response
    },
    (error) => {
        // 401 错误统一由 QueryCache 处理，这里只传递错误
        return Promise.reject(error)
    }
)

export default api 
