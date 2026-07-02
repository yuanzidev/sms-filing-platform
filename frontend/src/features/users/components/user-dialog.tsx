import { useEffect, useState } from 'react'
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
import { createUser, updateUser } from '@/lib/mock/store'
import { getRoles } from '@/lib/mock/store'
import type { User } from '@/lib/api/users'
import type { Role } from '@/lib/api/roles'

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
    const [loading, setLoading] = useState(false)
    const [roles, setRoles] = useState<Role[]>([])

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

    const loadRoles = () => {
        const response = getRoles()
        setRoles(response.data)
    }

    const onSubmit = (data: UserFormData) => {
        setLoading(true)

        const submitData = {
            ...data,
            role_id: data.role_id || undefined,
        }

        if (user) {
            updateUser(user.id, submitData)
            toast.success('用户更新成功')
        } else {
            if (!data.password) {
                toast.error('创建用户时必须设置密码')
                setLoading(false)
                return
            }
            createUser(submitData as Record<string, unknown>)
            toast.success('用户创建成功')
        }
        onSuccess()
        onOpenChange(false)
        form.reset()
        setLoading(false)
    }

    useEffect(() => {
        if (!open) return
        loadRoles()
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
    }, [open, user, form])

    const handleOpenChange = (newOpen: boolean) => {
        /**
         * 目的: 同步对话框开关状态
         * :param newOpen 对话框是否打开
         * :return void
         */
        onOpenChange(newOpen)
    }

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
                                disabled={loading}
                            >
                                取消
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? '处理中...' : (user ? '更新' : '创建')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
} 