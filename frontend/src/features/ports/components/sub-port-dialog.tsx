import { useQuery } from '@tanstack/react-query'
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
import { getMainPorts } from '@/lib/api/ports'
import type { SubPort } from '@/lib/api/types'

const CARRIERS = ['移动', '联通', '电信']

const formSchema = z.object({
  port_number: z.string().min(1, '请输入子端口号'),
  main_port_id: z.string().min(1, '请选择所属主端口'),
  carrier: z.string().min(1, '请选择运营商'),
  status: z.string().default('空闲'),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  port?: SubPort
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>
}

export function SubPortDialog({ open, onOpenChange, port, onSubmit }: Props) {
  const { data: mainPorts } = useQuery({
    queryKey: ['main-ports', { page: 1, page_size: 200 }],
    queryFn: () => getMainPorts({ page: 1, page_size: 200 }),
    enabled: open,
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      port_number: port?.port_number ?? '',
      main_port_id: port?.main_port_id ?? '',
      carrier: port?.carrier ?? '',
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
          <DialogTitle>{port ? '编辑子端口' : '新建子端口'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="port_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>子端口号</FormLabel>
                  <FormControl><Input placeholder="如 106900001234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="main_port_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>所属主端口</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择主端口" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(mainPorts?.data ?? []).map((mp) => (
                        <SelectItem key={mp.id} value={mp.id}>{mp.port_number} ({mp.carrier})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="已分配">已分配</SelectItem>
                        <SelectItem value="已报备">已报备</SelectItem>
                        <SelectItem value="停用">停用</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
