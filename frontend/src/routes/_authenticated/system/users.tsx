import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconLock,
  IconUsers,
  IconUserCog,
  IconShieldCheck,
} from '@tabler/icons-react'
import { formatCN } from '@/lib/time'
import api from '@/lib/api'
import { getUsers, type User, createUser, updateUser, deleteUser, resetUserPassword } from '@/lib/api/users'
import { getRoles, type Role } from '@/lib/api/roles'

export const Route = createFileRoute('/_authenticated/system/users')({
  component: UserManagement,
})

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'inactive', label: '停用' },
  { value: 'suspended', label: '冻结' },
]

function UserManagement() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    email: '',
    role_id: '' as string | undefined,
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [roles, setRoles] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<{ full_name?: string; email?: string; role_id?: string; status?: string }>({})
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // 加载角色选项
  useEffect(() => {
    ;(async () => {
      try {
        const res = await getRoles({ limit: 100 })
        setRoles(res.data)
      } catch (e) {
        console.error('加载角色失败', e)
      }
    })()
  }, [])

  // 查询用户
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers({
        username: searchKeyword || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        role_id: selectedRole !== 'all' ? selectedRole : undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      setUsers(res.data)
      setTotal(res.count)
    } catch (e) {
      console.error('加载用户失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">正常</Badge>
    ) : (
      <Badge variant="secondary">禁用</Badge>
    )
  }

  const getRoleBadge = (roleName: string | undefined) => {
    switch (roleName) {
      case '超级管理员':
        return <Badge className="bg-purple-100 text-purple-800">{roleName}</Badge>
      case '操作员':
        return <Badge className="bg-blue-100 text-blue-800">{roleName}</Badge>
      case '只读用户':
        return <Badge variant="outline">{roleName}</Badge>
      default:
        return <Badge>{roleName || '未分配'}</Badge>
    }
  }

  const handleCreateUser = async () => {
    try {
      await createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name || undefined,
        role_id: newUser.role_id,
      })
      setCreateDialogOpen(false)
      setNewUser({ username: '', full_name: '', email: '', role_id: undefined, password: '' })
      fetchUsers()
    } catch (e) {
      console.error('创建用户失败', e)
    }
  }

  const openEditUser = (user: User) => {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name || '',
      email: user.email,
      role_id: user.role?.id,
      status: user.status,
    })
    setEditDialogOpen(true)
  }

  const submitEditUser = async () => {
    if (!editingUser) return
    try {
      await updateUser(editingUser.id, {
        full_name: editForm.full_name,
        email: editForm.email,
        role_id: editForm.role_id,
        status: editForm.status as any,
      })
      setEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers()
    } catch (e) {
      console.error('更新用户失败', e)
    }
  }

  const confirmDeleteUser = async (user: User) => {
    if (!window.confirm(`确认删除用户 ${user.username} ?`)) return
    try {
      await deleteUser(user.id)
      fetchUsers()
    } catch (e) {
      console.error('删除用户失败', e)
    }
  }

  const openResetPassword = (user: User) => {
    setResetUser(user)
    setNewPassword('')
    setResetPwdDialogOpen(true)
  }

  const submitResetPassword = async () => {
    if (!resetUser || !newPassword) return
    try {
      await resetUserPassword(resetUser.id, newPassword)
      setResetPwdDialogOpen(false)
      setResetUser(null)
      setNewPassword('')
    } catch (e) {
      console.error('重置密码失败', e)
    }
  }

  // 统计数据
  const stats = useMemo(() => ({
    total,
    active: users.filter(u => u.status === 'active').length,
    admin: users.filter(u => u.role?.name === '超级管理员').length,
    operator: users.filter(u => u.role?.name === '操作员').length,
  }), [total, users])

  return (
    <>
      <Header>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
            <p className="text-muted-foreground">
              管理系统用户账号和权限分配
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <IconPlus className="h-4 w-4 mr-2" />
                新建用户
              </Button>
            </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建用户</DialogTitle>
                  <DialogDescription>
                    创建一个新的系统用户账号
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input
                        id="username"
                        placeholder="请输入用户名"
                        value={newUser.username}
                        onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="full_name">真实姓名</Label>
                    <Input
                      id="full_name"
                      placeholder="请输入真实姓名"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Select
                    value={newUser.role_id || ''}
                    onValueChange={(value) => setNewUser(prev => ({ ...prev, role_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">初始密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入初始密码"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateUser} disabled={!newUser.username || !newUser.email || !newUser.password}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">用户总数</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">所有注册用户</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">正常用户</CardTitle>
              <IconShieldCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">状态正常的用户</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">管理员</CardTitle>
              <IconUserCog className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.admin}</div>
              <p className="text-xs text-muted-foreground">超级管理员数量</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">操作员</CardTitle>
              <IconUserCog className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.operator}</div>
              <p className="text-xs text-muted-foreground">操作员数量</p>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card className="mb-6">
              <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户名、姓名或邮箱..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => { setPage(1); fetchUsers() }}>
                <IconRefresh className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 用户表格 */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">用户</TableHead>
                  <TableHead className="w-[150px]">邮箱</TableHead>
                  <TableHead className="w-[100px]">角色</TableHead>
                  <TableHead className="w-[80px]">状态</TableHead>
                  <TableHead className="w-[150px]">最近登录</TableHead>
                  <TableHead className="w-[80px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(user.full_name || user.username).slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role?.name)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatCN(user.last_login)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <IconDotsVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditUser(user)}>
                            <IconEdit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetPassword(user)}>
                            <IconLock className="h-4 w-4 mr-2" />
                            重置密码
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => confirmDeleteUser(user)}>
                            <IconTrash className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                没有找到匹配的用户
              </div>
            )}

            {/* 分页 */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">共 {total} 条，每页 {pageSize} 条</div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</Button>
                <Button variant="outline" size="sm" disabled={(page * pageSize) >= total || loading} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 弹窗区域 */}
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          roles={roles}
          form={editForm}
          setForm={setEditForm as any}
          onSubmit={submitEditUser}
        />
        <ResetPasswordDialog
          open={resetPwdDialogOpen}
          onOpenChange={setResetPwdDialogOpen}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          onSubmit={submitResetPassword}
        />
      </Main>
    </>
  )
}

// 编辑用户弹窗
function EditUserDialog({ open, onOpenChange, roles, form, setForm, onSubmit }: {
  open: boolean
  onOpenChange: (val: boolean) => void
  roles: Role[]
  form: { full_name?: string; email?: string; role_id?: string; status?: string }
  setForm: (updater: any) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户基本信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name_edit">姓名</Label>
              <Input id="full_name_edit" value={form.full_name || ''} onChange={(e) => setForm((prev: any) => ({ ...prev, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_edit">邮箱</Label>
              <Input id="email_edit" type="email" value={form.email || ''} onChange={(e) => setForm((prev: any) => ({ ...prev, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role_edit">角色</Label>
            <Select value={form.role_id || ''} onValueChange={(v) => setForm((prev: any) => ({ ...prev, role_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status_edit">状态</Label>
            <Select value={form.status || 'active'} onValueChange={(v) => setForm((prev: any) => ({ ...prev, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.filter(s => s.value !== 'all').map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSubmit} disabled={!form.email}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 重置密码弹窗
function ResetPasswordDialog({ open, onOpenChange, newPassword, setNewPassword, onSubmit }: {
  open: boolean
  onOpenChange: (val: boolean) => void
  newPassword: string
  setNewPassword: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>为该用户设置一个新密码</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new_pwd">新密码</Label>
          <Input id="new_pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSubmit} disabled={!newPassword}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
