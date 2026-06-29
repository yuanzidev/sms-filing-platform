/**
 * 操作日志中英文映射工具
 */

/**
 * 模块名称映射
 */
export const moduleNameMap: Record<string, string> = {
    // 用户管理
    'user': '用户管理',
    'users': '用户管理',
    'role': '角色管理',
    'roles': '角色管理',

    // 系统管理
    'system': '系统',
    'config': '配置',
    'settings': '设置',
    'auth': '认证',
    'login': '登录',
}

/**
 * 操作类型映射
 */
export const actionNameMap: Record<string, string> = {
    // 基础操作
    'create': '创建',
    'read': '查看',
    'update': '更新',
    'delete': '删除',
    'list': '列表',

    // 状态操作
    'enable': '启用',
    'disable': '禁用',
    'activate': '激活',
    'deactivate': '停用',
    'start': '启动',
    'stop': '停止',
    'restart': '重启',
    'pause': '暂停',
    'resume': '恢复',

    // 批量操作
    'batch_create': '批量创建',
    'batch_update': '批量更新',
    'batch_delete': '批量删除',
    'batch_enable': '批量启用',
    'batch_disable': '批量禁用',

    // 通用操作
    'toggle': '切换状态',
    'toggle_all': '批量切换',
    'execute': '执行',
    'sync': '同步',

    // 测试操作
    'test': '测试',
    'test_connection': '测试连接',

    // 认证操作
    'login': '登录',
    'logout': '登出',
    'change_password': '修改密码',
    'reset_password': '重置密码',

    // 导入导出
    'import': '导入',
    'export': '导出',
    'download': '下载',
    'upload': '上传',
}

/**
 * 操作结果映射
 */
export const resultNameMap: Record<string, string> = {
    'success': '成功',
    'failed': '失败',
    'pending': '处理中',
    'timeout': '超时',
    'error': '错误',
}

/**
 * 获取模块中文名称
 */
export function getModuleName(module: string): string {
    const lowerModule = module.toLowerCase()
    return moduleNameMap[lowerModule] || module
}

/**
 * 获取操作类型中文名称
 */
export function getActionName(action: string): string {
    const lowerAction = action.toLowerCase()
    return actionNameMap[lowerAction] || action
}

/**
 * 获取操作结果中文名称
 */
export function getResultName(result: string): string {
    const lowerResult = result.toLowerCase()
    return resultNameMap[lowerResult] || result
}

/**
 * 获取操作类型对应的 Badge 样式
 */
export function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const lowerAction = action.toLowerCase()

    // 创建类操作
    if (['create', 'add', 'import', 'upload', 'start', 'enable', 'activate'].some(a => lowerAction.includes(a))) {
        return 'default'
    }

    // 删除类操作
    if (['delete', 'remove', 'disable', 'deactivate', 'stop'].some(a => lowerAction.includes(a))) {
        return 'destructive'
    }

    // 更新类操作
    if (['update', 'edit', 'modify', 'change', 'toggle', 'sync'].some(a => lowerAction.includes(a))) {
        return 'secondary'
    }

    // 其他操作
    return 'outline'
}

/**
 * 获取操作结果对应的 Badge 样式
 */
export function getResultBadgeVariant(result: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const lowerResult = result.toLowerCase()

    if (lowerResult === 'success') {
        return 'default'
    }
    if (lowerResult === 'failed' || lowerResult === 'error') {
        return 'destructive'
    }
    if (lowerResult === 'pending') {
        return 'secondary'
    }
    return 'outline'
}
