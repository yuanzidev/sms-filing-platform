import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { MainPort } from '@/lib/api/types'

const CARRIERS = ['移动', '联通', '电信']

const formSchema = z.object({
  port_number: z.string().min(1, '请输入端口号'),
  carrier: z.string().min(1, '请选择运营商'),
  port_type: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  port_range: z.string().optional(),
  status: z.string().default('空闲'),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  port?: MainPort
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>
}

export function MainPortDialog({ open, onOpenChange, port, onSubmit }: Props) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      port_number: port?.port_number ?? '',
      carrier: port?.carrier ?? '',
      port_type: port?.port_type ?? '',
      province: port?.province ?? '',
      city: port?.city ?? '',
      port_range: port?.port_range ?? '',
      status: port?.status ?? '空闲',
    },
  })

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    await onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{port ? '编辑主端口' : '新建主端口'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="port_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>端口号</FormLabel>
                  <FormControl><Input placeholder="如 10690000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>运营商</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择运营商" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CARRIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>省份</FormLabel>
                    <FormControl><Input placeholder="如 广东" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>城市</FormLabel>
                    <FormControl><Input placeholder="如 深圳" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="port_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口类型</FormLabel>
                    <FormControl><Input placeholder="如 短信端口" {...field} /></FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="空闲">空闲</SelectItem>
                        <SelectItem value="使用中">使用中</SelectItem>
                        <SelectItem value="停用">停用</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="port_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>端口范围</FormLabel>
                  <FormControl><Input placeholder="端口号段范围" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit">{port ? '保存' : '创建'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
