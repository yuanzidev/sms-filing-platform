import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Edit, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getRoles, deleteRole, type Role } from '@/lib/api/roles'
import { RoleDialog } from './components/role-dialog'
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

/**
 * 角色管理主页面
 * 提供角色列表展示、创建、编辑、删除等功能
 */
export function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRole, setSelectedRole] = useState<Role | undefined>()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [roleToDelete, setRoleToDelete] = useState<Role | undefined>()

    /**
     * 加载角色列表
     */
    const loadRoles = async () => {
        setLoading(true)
        try {
            const response = await getRoles()
            setRoles(response.data)
        } catch (error: any) {
            toast.error('加载角色列表失败')
            console.error('加载角色失败:', error)
        } finally {
            setLoading(false)
        }
    }

    /**
     * 删除角色
     */
    const handleDeleteRole = async (role: Role) => {
        try {
            await deleteRole(role.id)
            toast.success('角色删除成功')
            loadRoles()
            setDeleteDialogOpen(false)
            setRoleToDelete(undefined)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || '删除角色失败')
        }
    }

    /**
     * 打开创建角色对话框
     */
    const handleCreateRole = () => {
        setSelectedRole(undefined)
        setDialogOpen(true)
    }

    /**
     * 打开编辑角色对话框
     */
    const handleEditRole = (role: Role) => {
        setSelectedRole(role)
        setDialogOpen(true)
    }

    /**
     * 打开删除角色确认对话框
     */
    const handleOpenDeleteRole = (role: Role) => {
        setRoleToDelete(role)
        setDeleteDialogOpen(true)
    }

    /**
     * 对话框成功回调
     */
    const handleDialogSuccess = () => {
        loadRoles()
    }

    // 初始加载
    useEffect(() => {
        loadRoles()
    }, [])

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
                        <h2 className='text-2xl font-bold tracking-tight'>角色管理</h2>
                        <p className='text-muted-foreground'>
                            管理系统角色、权限分配和功能控制
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" onClick={loadRoles} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                        <Button onClick={handleCreateRole}>
                            <Plus className="mr-2 h-4 w-4" />
                            新建角色
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <Card key={role.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{role.name}</CardTitle>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditRole(role)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenDeleteRole(role)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>{role.description || '暂无描述'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            关联用户: 0人
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">功能权限:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {role.permissions && role.permissions.length > 0 ? (
                                                role.permissions.map((permission) => (
                                                    <Badge key={permission} variant="secondary" className="text-xs">
                                                        {permission}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">无权限</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">主机权限:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {role.host_permissions && role.host_permissions.length > 0 ? (
                                                role.host_permissions.map((permission) => (
                                                    <Badge key={permission} variant="outline" className="text-xs">
                                                        {permission}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">无权限</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {roles.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">暂无角色数据</p>
                    </div>
                )}
            </Main>

            {/* 角色创建/编辑对话框 */}
            <RoleDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                role={selectedRole}
                onSuccess={handleDialogSuccess}
            />

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除角色 "{roleToDelete?.name}" 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => roleToDelete && handleDeleteRole(roleToDelete)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default RolesPage 