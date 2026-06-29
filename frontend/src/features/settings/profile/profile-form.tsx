import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UsersService, type UpdateMeRequest } from '@/lib/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: '姓名至少需要2个字符。' })
    .max(30, { message: '姓名不能超过30个字符。' }),
  email: z.string().email({ message: '请输入有效的邮箱地址。' }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// 初始值从后端加载
const defaultValues: Partial<ProfileFormValues> = {}

export default function ProfileForm() {
  const queryClient = useQueryClient()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  // 加载当前用户信息填充表单
  useEffect(() => {
    UsersService.readUserMe()
      .then((me) => {
        form.reset({
          username: me.full_name || '',
          email: me.email,
        })
      })
      .catch(() => {/* 忽略 */})
  }, [])

  const onSubmit = async (data: ProfileFormValues) => {
    const payload: UpdateMeRequest = {
      full_name: data.username,
      email: data.email,
    }
    try {
      await UsersService.updateUserMe(payload)
      toast.success('个人资料已更新')
      // 刷新当前用户信息缓存
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    } catch (e: any) {
      toast.error(`更新失败: ${e?.message || '未知错误'}`)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder='shadcn' {...field} />
              </FormControl>
              <FormDescription>
                这是您的公开显示名称。可以是您的真实姓名或昵称。您只能每30天更改一次。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type='email' placeholder='your@email.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>更新个人资料</Button>
      </form>
    </Form>
  )
}
