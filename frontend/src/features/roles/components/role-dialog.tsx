import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createRole, updateRole, type Role } from '@/lib/api/roles'

/**
 * 角色表单验证模式
 */
const roleFormSchema = z.object({
    name: z.string().min(2, '角色名称至少2个字符'),
    description: z.string().optional(),
    permissions: z.array(z.string()),
    host_permissions: z.array(z.string()),
})

type RoleFormData = z.infer<typeof roleFormSchema>

interface RoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    role?: Role
    onSuccess: () => void
}

/**
 * 角色创建/编辑对话框
 * 提供角色信息的创建和编辑功能
 */
export function RoleDialog({ open, onOpenChange, role, onSuccess }: RoleDialogProps) {
    const [loading, setLoading] = useState(false)

    const form = useForm<RoleFormData>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: role ? {
            name: role.name,
            description: role.description || '',
            permissions: role.permissions || [],
            host_permissions: role.host_permissions || [],
        } : {
            name: '',
            description: '',
            permissions: [],
            host_permissions: [],
        },
    })

    // 预定义的权限选项
    const permissionOptions = [
        { id: 'user:read', label: '查看用户' },
        { id: 'user:write', label: '管理用户' },
        { id: 'role:read', label: '查看角色' },
        { id: 'role:write', label: '管理角色' },
        { id: 'log:read', label: '查看日志' },
        { id: 'system:admin', label: '系统管理' },
    ]

    const hostPermissionOptions = [
        { id: 'host:read', label: '查看主机' },
        { id: 'host:write', label: '管理主机' },
        { id: 'host:execute', label: '执行命令' },
        { id: 'host:backup', label: '备份恢复' },
    ]

    // 表单提交处理
    const onSubmit = async (data: RoleFormData) => {
        setLoading(true)
        try {
            if (role) {
                // 编辑角色
                await updateRole(role.id, data)
                toast.success('角色更新成功')
            } else {
                // 创建角色
                await createRole(data)
                toast.success('角色创建成功')
            }
            onSuccess()
            onOpenChange(false)
            form.reset()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || '操作失败')
        } finally {
            setLoading(false)
        }
    }

    // 对话框打开时重置表单
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            // 重置表单为当前角色数据或空数据
            if (role) {
                form.reset({
                    name: role.name,
                    description: role.description || '',
                    permissions: role.permissions || [],
                    host_permissions: role.host_permissions || [],
                })
            } else {
                form.reset({
                    name: '',
                    description: '',
                    permissions: [],
                    host_permissions: [],
                })
            }
        }
        onOpenChange(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {role ? '编辑角色' : '创建角色'}
                    </DialogTitle>
                    <DialogDescription>
                        {role ? '修改角色信息和权限' : '创建新角色并设置权限'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>角色名称</FormLabel>
                                    <FormControl>
                                        <Input placeholder="管理员" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>描述</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="角色描述信息"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="permissions"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>功能权限</FormLabel>
                                        <div className="space-y-2">
                                            {permissionOptions.map((permission) => (
                                                <FormField
                                                    key={permission.id}
                                                    control={form.control}
                                                    name="permissions"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={permission.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(permission.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, permission.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== permission.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-sm font-normal">
                                                                    {permission.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="host_permissions"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>主机权限</FormLabel>
                                        <div className="space-y-2">
                                            {hostPermissionOptions.map((permission) => (
                                                <FormField
                                                    key={permission.id}
                                                    control={form.control}
                                                    name="host_permissions"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={permission.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(permission.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, permission.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== permission.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-sm font-normal">
                                                                    {permission.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={loading}
                            >
                                取消
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? '处理中...' : (role ? '更新' : '创建')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
} 