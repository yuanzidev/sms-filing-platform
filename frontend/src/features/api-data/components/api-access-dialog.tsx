import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createApiAccessConfig, updateApiAccessConfig } from '@/lib/api/api-data'
import type { ApiAccessConfig } from '@/lib/api/types'

const formSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  source_type: z.string().optional(),
  endpoint: z.string().optional(),
  is_active: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: ApiAccessConfig
  onSuccess: () => void
}

export function ApiAccessDialog({ open, onOpenChange, config, onSuccess }: Props) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: FormData) => createApiAccessConfig(data),
    onSuccess: () => {
      toast.success('配置创建成功')
      queryClient.invalidateQueries({ queryKey: ['api-access'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('配置创建失败'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateApiAccessConfig(id, data),
    onSuccess: () => {
      toast.success('配置更新成功')
      queryClient.invalidateQueries({ queryKey: ['api-access'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('配置更新失败'),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: config ? {
      name: config.name,
      source_type: config.source_type || '',
      endpoint: config.endpoint || '',
      is_active: config.is_active,
    } : {
      name: '',
      source_type: '',
      endpoint: '',
      is_active: true,
    },
  })

  const onSubmit = (data: FormData) => {
    if (config) {
      updateMutation.mutate({ id: config.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset(config ? {
        name: config.name,
        source_type: config.source_type || '',
        endpoint: config.endpoint || '',
        is_active: config.is_active,
      } : {
        name: '',
        source_type: '',
        endpoint: '',
        is_active: true,
      })
    }
    onOpenChange(newOpen)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{config ? '编辑配置' : '新建配置'}</DialogTitle>
          <DialogDescription>
            {config ? '修改 API 接入配置信息' : '创建新的 API 接入配置'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>配置名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: 运营商数据接口" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>来源类型</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: REST_API" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>接口地址</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com/v1/data" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">启用</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '处理中...' : (config ? '更新' : '创建')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
