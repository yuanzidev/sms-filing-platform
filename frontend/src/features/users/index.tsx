import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, deleteUser, enableUser, disableUser, resetUserPassword } from '@/lib/mock/store'
import type { User } from '@/lib/api/users'
import { UserDialog } from './components/user-dialog'
import { columns } from './components/users-columns'
import { UsersTable } from './components/users-table'

/**
 * 用户管理主页面
 * 提供用户列表展示、搜索、筛选、增删改查等功能
 */
export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  /**
   * 加载用户列表
   */
  const loadUsers = () => {
    setLoading(true)
    const response = getUsers()
    setUsers(response.data)
    setLoading(false)
  }

  /**
   * 删除用户
   */
  const handleDeleteUser = (userId: string) => {
    deleteUser(userId)
    toast.success('用户删除成功')
    loadUsers()
  }

  /**
   * 启用用户
   */
  const handleEnableUser = (userId: string) => {
    enableUser(userId)
    toast.success('用户已启用')
    loadUsers()
  }

  /**
   * 禁用用户
   */
  const handleDisableUser = (userId: string) => {
    disableUser(userId)
    toast.success('用户已禁用')
    loadUsers()
  }

  /**
   * 重置用户密码
   */
  const handleResetPassword = (userId: string) => {
    if (!newPassword) {
      toast.error('请输入新密码')
      return
    }
    resetUserPassword(userId, newPassword)
    toast.success('密码重置成功')
    setPasswordDialogOpen(false)
    setNewPassword('')
  }

  /**
   * 打开创建用户对话框
   */
  const handleCreateUser = () => {
    setSelectedUser(undefined)
    setDialogOpen(true)
  }

  /**
   * 打开编辑用户对话框
   */
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  /**
   * 打开重置密码对话框
   */
  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user)
    setPasswordDialogOpen(true)
  }

  /**
   * 对话框成功回调
   */
  const handleDialogSuccess = () => {
    loadUsers()
  }

  // 初始加载
  useEffect(() => {
    loadUsers()
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
            <h2 className='text-2xl font-bold tracking-tight'>用户管理</h2>
            <p className='text-muted-foreground'>
              管理系统用户、角色分配和权限控制
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={handleCreateUser}>
              <Plus className="mr-2 h-4 w-4" />
              新建用户
            </Button>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <UsersTable
            data={users}
            columns={columns({
              onEdit: handleEditUser,
              onDelete: handleDeleteUser,
              onEnable: handleEnableUser,
              onDisable: handleDisableUser,
              onResetPassword: handleOpenResetPassword,
            })}
          />
        </div>
      </Main>

      {/* 用户创建/编辑对话框 */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSuccess={handleDialogSuccess}
      />

      {/* 重置密码对话框 */}
      {passwordDialogOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">重置密码</h3>
            <p className="text-sm text-muted-foreground mb-4">
              为用户 <strong>{selectedUser.username}</strong> 设置新密码
            </p>
            <input
              type="password"
              placeholder="输入新密码"
              className="w-full p-2 border rounded mb-4"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false)
                  setNewPassword('')
                }}
              >
                取消
              </Button>
              <Button onClick={() => handleResetPassword(selectedUser.id)}>
                确认重置
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default UsersPage
