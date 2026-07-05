import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  getUsers,
  deleteUser,
  enableUser,
  disableUser,
  resetUserPassword,
  type User,
} from '@/lib/api/users'
import { UserDialog } from './components/user-dialog'
import { columns } from './components/users-columns'
import { UsersTable } from './components/users-table'

export function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success('用户删除成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const enableMutation = useMutation({
    mutationFn: (id: string) => enableUser(id),
    onSuccess: () => {
      toast.success('用户已启用')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const disableMutation = useMutation({
    mutationFn: (id: string) => disableUser(id),
    onSuccess: () => {
      toast.success('用户已禁用')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetUserPassword(id, password),
    onSuccess: () => {
      toast.success('密码重置成功')
      setPasswordDialogOpen(false)
      setNewPassword('')
    },
    onError: () => toast.error('密码重置失败'),
  })

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
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={() => { setSelectedUser(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              新建用户
            </Button>
          </div>
        </div>

        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <UsersTable
            data={data?.data ?? []}
            columns={columns({
              onEdit: (user) => { setSelectedUser(user); setDialogOpen(true) },
              onDelete: (id) => deleteMutation.mutate(id),
              onEnable: (id) => enableMutation.mutate(id),
              onDisable: (id) => disableMutation.mutate(id),
              onResetPassword: (user) => { setSelectedUser(user); setPasswordDialogOpen(true) },
            })}
          />
        </div>
      </Main>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />

      <Dialog open={passwordDialogOpen && !!selectedUser} onOpenChange={(open) => {
        if (!open) { setPasswordDialogOpen(false); setNewPassword('') }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为用户 <strong>{selectedUser?.username}</strong> 设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="password"
              placeholder="输入新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPasswordDialogOpen(false); setNewPassword('') }}
            >
              取消
            </Button>
            <Button
              onClick={() => selectedUser && resetMutation.mutate({ id: selectedUser.id, password: newPassword })}
              disabled={!newPassword || resetMutation.isPending}
            >
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UsersPage
