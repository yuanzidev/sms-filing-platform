import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createUser, updateUser } from '@/lib/api/users'
import { getRoles } from '@/lib/api/roles'
import type { User } from '@/lib/api/users'

/**
 * 用户表单验证模式
 */
const userFormSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    username: z.string().min(3, '用户名至少3个字符'),
    password: z.string().min(8, '密码至少8个字符').optional(),
    full_name: z.string().optional(),
    role_id: z.string().optional(),
    status: z.enum(['active', 'inactive', 'suspended']),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: User
    onSuccess: () => void
}

/**
 * 用户创建/编辑对话框
 * 提供用户信息的创建和编辑功能
 */
export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
    const queryClient = useQueryClient()

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => getRoles({ limit: 100 }),
        enabled: open,
    })
    const roles = rolesData?.data ?? []

    const createMutation = useMutation({
        mutationFn: (data: UserFormData) => createUser({
            email: data.email,
            username: data.username,
            password: data.password!,
            full_name: data.full_name,
            role_id: data.role_id || undefined,
        }),
        onSuccess: () => {
            toast.success('用户创建成功')
            queryClient.invalidateQueries({ queryKey: ['users'] })
            onSuccess()
            onOpenChange(false)
        },
        onError: () => toast.error('用户创建失败'),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UserFormData }) => updateUser(id, {
            email: data.email,
            username: data.username,
            password: data.password || undefined,
            full_name: data.full_name,
            role_id: data.role_id || undefined,
            status: data.status,
        }),
        onSuccess: () => {
            toast.success('用户更新成功')
            queryClient.invalidateQueries({ queryKey: ['users'] })
            onSuccess()
            onOpenChange(false)
        },
        onError: () => toast.error('用户更新失败'),
    })

    const form = useForm<UserFormData>({
        resolver: zodResolver(userFormSchema),
        defaultValues: user ? {
            email: user.email,
            username: user.username,
            password: '',
            full_name: user.full_name || '',
            role_id: user.role?.id || '',
            status: user.status,
        } : {
            email: '',
            username: '',
            password: '',
            full_name: '',
            role_id: '',
            status: 'active',
        },
    })

    const onSubmit = (data: UserFormData) => {
        if (user) {
            updateMutation.mutate({ id: user.id, data })
        } else {
            if (!data.password) {
                toast.error('创建用户时必须设置密码')
                return
            }
            createMutation.mutate(data)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            if (user) {
                form.reset({
                    email: user.email,
                    username: user.username,
                    password: '',
                    full_name: user.full_name || '',
                    role_id: user.role?.id || '',
                    status: user.status,
                })
            } else {
                form.reset({
                    email: '',
                    username: '',
                    password: '',
                    full_name: '',
                    role_id: '',
                    status: 'active',
                })
            }
        }
        onOpenChange(newOpen)
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {user ? '编辑用户' : '创建用户'}
                    </DialogTitle>
                    <DialogDescription>
                        {user ? '修改用户信息' : '创建新用户账户'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>邮箱</FormLabel>
                                    <FormControl>
                                        <Input placeholder="user@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>用户名</FormLabel>
                                    <FormControl>
                                        <Input placeholder="username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>密码 {user && '(留空则不修改)'}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>姓名</FormLabel>
                                    <FormControl>
                                        <Input placeholder="张三" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="role_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>角色</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择角色" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>状态</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                <Badge variant="default">启用</Badge>
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                <Badge variant="secondary">禁用</Badge>
                                            </SelectItem>
                                            <SelectItem value="suspended">
                                                <Badge variant="destructive">暂停</Badge>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isPending}
                            >
                                取消
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? '处理中...' : (user ? '更新' : '创建')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
