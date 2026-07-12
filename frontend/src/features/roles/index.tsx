import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getRoles, deleteRole, type Role } from '@/lib/api/roles'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { EmptyState } from '@/components/shared/empty-state'
import { ThemeSwitch } from '@/components/theme-switch'
import { RoleDialog } from './components/role-dialog'

export function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | undefined>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success('角色删除成功')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDeleteDialogOpen(false)
      setRoleToDelete(undefined)
    },
    onError: () => toast.error('角色删除失败'),
  })

  const roles = data?.data ?? []

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
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['roles'] })
              }
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
            <Button
              onClick={() => {
                setSelectedRole(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新建角色
            </Button>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>{role.name}</CardTitle>
                  <div className='flex space-x-1'>
                    <ActionIconButton
                      label='编辑'
                      icon='edit'
                      tone='edit'
                      onClick={() => {
                        setSelectedRole(role)
                        setDialogOpen(true)
                      }}
                    />
                    <ActionIconButton
                      label='删除'
                      icon='delete'
                      tone='delete'
                      onClick={() => {
                        setRoleToDelete(role)
                        setDeleteDialogOpen(true)
                      }}
                    />
                  </div>
                </div>
                <CardDescription>
                  {role.description || '暂无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='flex items-center space-x-2'>
                    <Users className='text-muted-foreground h-4 w-4' />
                    <span className='text-muted-foreground text-sm'>
                      关联用户: {role.user_count ?? 0}人
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium'>功能权限:</div>
                    <div className='flex flex-wrap gap-1'>
                      {role.permissions && role.permissions.length > 0 ? (
                        role.permissions.map((p) => (
                          <Badge
                            key={p}
                            variant='secondary'
                            className='text-xs'
                          >
                            {p}
                          </Badge>
                        ))
                      ) : (
                        <span className='text-muted-foreground text-xs'>
                          无权限
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {roles.length === 0 && !isLoading && (
          <EmptyState
            title='暂无角色数据'
            description='创建角色后，可以为不同岗位配置功能权限。'
            action={
              <Button
                onClick={() => {
                  setSelectedRole(undefined)
                  setDialogOpen(true)
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                新建角色
              </Button>
            }
          />
        )}
      </Main>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={selectedRole}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['roles'] })}
      />

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
              onClick={() =>
                roleToDelete && deleteMutation.mutate(roleToDelete.id)
              }
              className='bg-red-600 hover:bg-red-700'
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
