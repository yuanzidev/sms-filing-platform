import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createSubPortRecord,
  updateSubPortRecord,
  SUB_PORT_STATUSES,
} from '@/lib/api/sub-port-library'
import type { ExportGroup } from '@/lib/api/types'
import type { SubPortRecord } from '@/lib/api/sub-port-library'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SubPortRecord
  group: ExportGroup
  onSuccess: () => void
}

function extractErrorDetail(err: unknown): string | undefined {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail
  if (typeof detail === 'string') return detail
  return undefined
}

export function SubPortDialog({ open, onOpenChange, record, group, onSuccess }: Props) {
  const [mainPort, setMainPort] = useState('')
  const [subPort, setSubPort] = useState('')
  const [status, setStatus] = useState<string>(SUB_PORT_STATUSES[0])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const sortedFields = [...group.fields].sort((a, b) => a.sort_order - b.sort_order)

  useEffect(() => {
    if (open) {
      setMainPort(record?.main_port_number || '')
      setSubPort(record?.sub_port_number || '')
      setStatus(record?.status || SUB_PORT_STATUSES[0])
      setFieldValues(record?.field_values ? { ...record.field_values } : {})
    }
  }, [open, record])

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        main_port_number: mainPort.trim(),
        sub_port_number: subPort.trim(),
        status,
        field_values: fieldValues,
      }
      return record
        ? updateSubPortRecord(record.id, data)
        : createSubPortRecord(data)
    },
    onSuccess: () => {
      toast.success(record ? '子端口记录更新成功' : '子端口记录创建成功')
      onSuccess()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(extractErrorDetail(err) || '保存失败，请检查填写内容')
    },
  })

  const handleSubmit = () => {
    if (!mainPort.trim()) {
      toast.error('主端口号不能为空')
      return
    }
    if (!subPort.trim()) {
      toast.error('子端口号不能为空')
      return
    }
    mutation.mutate()
  }

  const isPending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>{record ? '编辑子端口' : '新增子端口'}</DialogTitle>
          <DialogDescription>
            字段组：{group.name}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>
                主端口号 <span className='text-red-500'>*</span>
              </label>
              <Input
                value={mainPort}
                onChange={(e) => setMainPort(e.target.value)}
                placeholder='主端口号'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>
                子端口号 <span className='text-red-500'>*</span>
              </label>
              <Input
                value={subPort}
                onChange={(e) => setSubPort(e.target.value)}
                placeholder='子端口号'
              />
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            <label className='text-sm font-medium'>状态</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className='w-40'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUB_PORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sortedFields.length > 0 && (
            <div className='grid grid-cols-2 gap-4 border-t pt-4'>
              {sortedFields.map((field) => (
                <div key={field.field_name} className='flex flex-col gap-2'>
                  <label className='text-sm font-medium'>{field.field_label}</label>
                  <Input
                    value={fieldValues[field.field_name] ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [field.field_name]: e.target.value,
                      }))
                    }
                    placeholder={field.field_label}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '保存中...' : record ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
