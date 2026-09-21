import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFile, getFileUrl, listFiles } from '@/lib/api/files'
import {
  createSubPortRecord,
  updateSubPortRecord,
  SUB_PORT_STATUSES,
} from '@/lib/api/sub-port-library'
import type { SubPortRecord } from '@/lib/api/sub-port-library'
import type { ExportGroup } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageLightbox } from '@/components/shared/image-lightbox'
import { getSubPortLibraryFields } from '../fields'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SubPortRecord
  group: ExportGroup
  onSuccess: () => void
}

function extractErrorDetail(err: unknown): string | undefined {
  const detail = (err as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return undefined
}

function isDispimgValue(value: string | undefined): boolean {
  return !!value && /(?:_xlfn\.)?DISPIMG\s*\(/i.test(value)
}

export function SubPortDialog({
  open,
  onOpenChange,
  record,
  group,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient()
  const [mainPort, setMainPort] = useState('')
  const [subPort, setSubPort] = useState('')
  const [status, setStatus] = useState<string>(SUB_PORT_STATUSES[0])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const sortedFields = getSubPortLibraryFields(group)

  const { data: attachments = [] } = useQuery({
    queryKey: ['sub-port-attachments', record?.id],
    queryFn: () => listFiles('sub_port_record', record!.id),
    enabled: open && !!record,
  })

  useEffect(() => {
    if (open) {
      setMainPort(record?.main_port_number || '')
      setSubPort(record?.sub_port_number || '')
      setStatus(record?.status || SUB_PORT_STATUSES[0])
      setFieldValues(record?.field_values ? { ...record.field_values } : {})
    } else {
      setLightboxSrc(null)
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

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => {
      toast.success('附件已删除')
      queryClient.invalidateQueries({
        queryKey: ['sub-port-attachments', record?.id],
      })
    },
    onError: () => toast.error('附件删除失败'),
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
  const attachmentsByField = (fieldLabel: string) =>
    attachments.filter((item) => item.field_name === fieldLabel)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[88vh] overflow-hidden sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>{record ? '编辑子端口' : '新增子端口'}</DialogTitle>
          <DialogDescription>字段组：{group.name}</DialogDescription>
        </DialogHeader>

        <div className='grid max-h-[calc(88vh-160px)] gap-4 overflow-y-auto py-2 pr-1'>
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
                  <label className='text-sm font-medium'>
                    {field.field_label}
                  </label>
                  <Input
                    value={
                      isDispimgValue(fieldValues[field.field_name])
                        ? ''
                        : (fieldValues[field.field_name] ?? '')
                    }
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [field.field_name]: e.target.value,
                      }))
                    }
                    placeholder={field.field_label}
                  />
                  {attachmentsByField(field.field_label).length > 0 && (
                    <div className='grid grid-cols-2 gap-2'>
                      {attachmentsByField(field.field_label).map((item) => (
                        <div
                          key={item.id}
                          className='relative overflow-hidden rounded border'
                        >
                          <button
                            type='button'
                            className='group relative block w-full cursor-zoom-in'
                            onClick={() => setLightboxSrc(getFileUrl(item.id))}
                            onDoubleClick={() =>
                              setLightboxSrc(getFileUrl(item.id))
                            }
                            aria-label={`放大查看 ${item.original_name}`}
                          >
                            <img
                              src={getFileUrl(item.id)}
                              alt={item.original_name}
                              className='bg-muted h-24 w-full object-contain'
                            />
                            <span className='absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30'>
                              <ZoomIn className='h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100' />
                            </span>
                          </button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='bg-background/80 hover:bg-background absolute top-1 right-1 z-10 h-6 w-6'
                            onClick={() =>
                              deleteAttachmentMutation.mutate(item.id)
                            }
                            disabled={deleteAttachmentMutation.isPending}
                          >
                            <X className='h-3 w-3' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '保存中...' : record ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </Dialog>
  )
}
