import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
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
import { IconPlus, IconDotsVertical, IconEdit, IconTrash, IconShieldCheck, IconUsers, IconEye } from '@tabler/icons-react'
import { getRoles, createRole, updateRole, deleteRole, type Role } from '@/lib/api/roles'
import { formatCN } from '@/lib/time'

export const Route = createFileRoute('/_authenticated/system/roles')({
  component: RoleManagement,
})

function toRoleCard(r: Role) {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    permissions: r.permissions || [],
    userCount: r.user_count ?? 0,
    isSystem: false,
    createdAt: r.created_at,
  }
}

// 权限定义
const permissionGroups = [
  {
    name: '流量监控',
    permissions: [
      { code: 'traffic:view', label: '查看流量数据' },
      { code: 'traffic:export', label: '导出流量数据' },
    ],
  },
  {
    name: '调度管理',
    permissions: [
      { code: 'scheduling:view', label: '查看调度信息' },
      { code: 'scheduling:manage', label: '执行调度操作' },
      { code: 'scheduling:config', label: '配置调度策略' },
    ],
  },
  {
    name: '设备管理',
    permissions: [
      { code: 'devices:view', label: '查看设备信息' },
      { code: 'devices:manage', label: '管理设备' },
      { code: 'devices:config', label: '配置设备参数' },
    ],
  },
  {
    name: '日志中心',
    permissions: [
      { code: 'logs:view', label: '查看日志' },
      { code: 'operation_logs:view', label: '查看操作日志' },
      { code: 'logs:export', label: '导出日志' },
    ],
  },
  {
    name: '系统管理',
    permissions: [
      { code: 'system:users', label: '用户管理' },
      { code: 'system:roles', label: '角色管理' },
      { code: 'system:params', label: '系统参数' },
    ],
  },
]

function RoleManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ReturnType<typeof toRoleCard> | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; description?: string; permissions: string[] }>({ name: '', description: '', permissions: [] })

  const loadRoles = async () => {
    try {
      const res = await getRoles({ limit: 100 })
      setRoles(res.data)
    } catch (e) {
      console.error('加载角色失败', e)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const handleViewDetail = (role: ReturnType<typeof toRoleCard>) => {
    setSelectedRole(role)
    setDetailDialogOpen(true)
  }

  const handlePermissionChange = (permCode: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permCode)
        ? prev.permissions.filter(p => p !== permCode)
        : [...prev.permissions, permCode]
    }))
  }

  const handleCreateRole = async () => {
    try {
      await createRole({
        name: newRole.name,
        description: newRole.description || undefined,
        permissions: newRole.permissions,
        host_permissions: [],
      })
      setCreateDialogOpen(false)
      setNewRole({ name: '', description: '', permissions: [] })
      loadRoles()
    } catch (e) {
      console.error('创建角色失败', e)
    }
  }

  const openEditRole = (r: Role) => {
    setEditingRole(r)
    setEditForm({ name: r.name, description: r.description || '', permissions: r.permissions || [] })
    setEditDialogOpen(true)
  }

  const submitEditRole = async () => {
    if (!editingRole) return
    try {
      await updateRole(editingRole.id, {
        name: editForm.name,
        description: editForm.description,
        permissions: editForm.permissions,
      })
      setEditDialogOpen(false)
      setEditingRole(null)
      loadRoles()
    } catch (e) {
      console.error('更新角色失败', e)
    }
  }

  const confirmDeleteRole = async (r: Role) => {
    if (!window.confirm(`确认删除角色 ${r.name} ?`)) return
    try {
      await deleteRole(r.id)
      loadRoles()
    } catch (e) {
      console.error('删除角色失败', e)
    }
  }

  const getPermissionLabel = (code: string) => {
    for (const group of permissionGroups) {
      const perm = group.permissions.find(p => p.code === code)
      if (perm) return perm.label
    }
    return code
  }

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
            <h1 className="text-2xl font-bold tracking-tight">角色管理</h1>
            <p className="text-muted-foreground">
              管理系统角色和权限配置
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <IconPlus className="h-4 w-4 mr-2" />
                新建角色
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新建角色</DialogTitle>
                <DialogDescription>
                  创建一个新的系统角色并分配权限
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">角色名称</Label>
                    <Input
                      id="name"
                      placeholder="请输入角色名称"
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="请输入角色描述"
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>权限配置</Label>
                  <div className="border rounded-md p-4 space-y-4">
                    {permissionGroups.map(group => (
                      <div key={group.name}>
                        <p className="text-sm font-medium mb-2">{group.name}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {group.permissions.map(perm => (
                            <label
                              key={perm.code}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={newRole.permissions.includes(perm.code)}
                                onCheckedChange={() => handlePermissionChange(perm.code)}
                              />
                              <span className="text-sm">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateRole} disabled={!newRole.name}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 角色卡片列表 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => {
            const role = toRoleCard(r)
            return (
            <Card key={role.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconShieldCheck className="h-5 w-5 text-primary" />
                      {role.name}
                    </CardTitle>
                    <CardDescription className="mt-1">角色</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetail(role)}>
                        <IconEye className="h-4 w-4 mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={role.isSystem} onClick={() => openEditRole(r)}>
                        <IconEdit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" disabled={role.isSystem} onClick={() => confirmDeleteRole(r)}>
                        <IconTrash className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {role.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <IconUsers className="h-4 w-4" />
                    <span>{role.userCount} 个用户</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {role.isSystem && (
                      <Badge variant="outline" className="text-xs">系统角色</Badge>
                    )}
                    <Badge className="bg-green-100 text-green-800 text-xs">启用</Badge>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">权限数量</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions[0] === 'all' ? (
                      <Badge variant="secondary" className="text-xs">全部权限</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {role.permissions.length} 项权限
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>

        {/* 详情弹窗 */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>角色详情</DialogTitle>
              <DialogDescription>
                查看角色的详细信息和权限配置
              </DialogDescription>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">角色名称</p>
                    <p className="font-medium">{selectedRole.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">用户数量</p>
                    <p className="font-medium">{selectedRole.userCount} 个</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="font-medium">{formatCN(selectedRole.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">描述</p>
                  <p className="text-sm">{selectedRole.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">权限列表</p>
                  <div className="bg-muted rounded-md p-3">
                    {selectedRole.permissions[0] === 'all' ? (
                      <Badge>全部权限</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedRole.permissions.map(perm => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {getPermissionLabel(perm)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {selectedRole.isSystem && (
                    <Badge variant="outline">系统角色</Badge>
                  )}
                  <Badge className="bg-green-100 text-green-800">启用</Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* 编辑角色弹窗 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑角色</DialogTitle>
              <DialogDescription>修改角色信息与权限</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">角色名称</Label>
                  <Input id="edit_name" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_description">描述</Label>
                  <Textarea id="edit_description" value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>权限配置</Label>
                <div className="border rounded-md p-4 space-y-4">
                  {permissionGroups.map(group => (
                    <div key={group.name}>
                      <p className="text-sm font-medium mb-2">{group.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.permissions.map(perm => (
                          <label key={perm.code} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={editForm.permissions.includes(perm.code)}
                              onCheckedChange={() => setEditForm(prev => ({
                                ...prev,
                                permissions: prev.permissions.includes(perm.code)
                                  ? prev.permissions.filter(p => p !== perm.code)
                                  : [...prev.permissions, perm.code],
                              }))}
                            />
                            <span className="text-sm">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
              <Button onClick={submitEditRole} disabled={!editForm.name}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
