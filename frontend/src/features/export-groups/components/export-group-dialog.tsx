import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowDownToLine, ArrowUpToLine, ChevronUp, ChevronDown, X, Search as SearchIcon } from 'lucide-react'
import type { ExportGroup } from '@/lib/api/types'
import { getExportFieldRegistry, type ExportField } from '@/lib/api/export-fields'

const formSchema = z.object({
  name: z.string().min(1, '请输入字段组名称'),
  description: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: ExportGroup
  onSubmit: (data: {
    name: string; description: string;
    fields: { field_name: string; field_label: string; sort_order: number }[];
  }) => Promise<void>
}

export function ExportGroupDialog({ open, onOpenChange, group, onSubmit }: Props) {
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [fieldSearch, setFieldSearch] = useState('')
  const stopHoldRef = useRef<() => void>(() => {})
  const repeatedRef = useRef(false)

  useEffect(() => () => stopHoldRef.current(), [])
  useEffect(() => { if (!open) stopHoldRef.current() }, [open])

  const { data: registry = [], isLoading } = useQuery({
    queryKey: ['export-field-registry'],
    queryFn: getExportFieldRegistry,
  })

  const registryMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of registry) m.set(f.name, f.label)
    return m
  }, [registry])

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase()
    if (!q) return registry
    return registry.filter(
      (f) => f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    )
  }, [registry, fieldSearch])

  const groupedFields = useMemo(() => {
    const map = new Map<string, ExportField[]>()
    for (const f of filteredFields) {
      if (!map.has(f.group)) map.set(f.group, [])
      map.get(f.group)!.push(f)
    }
    return Array.from(map.entries())
  }, [filteredFields])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (group?.fields?.length) {
      setSelectedFields(
        [...group.fields]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((f) => f.field_name)
      )
    } else {
      setSelectedFields([])
    }
    form.reset({
      name: group?.name ?? '',
      description: group?.description ?? '',
    })
  }, [open])

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const idx = prev.indexOf(key)
      if (idx >= 0) return prev.filter((k) => k !== key)
      return [...prev, key]
    })
  }

  const moveField = (key: string, direction: -1 | 1) => {
    setSelectedFields((prev) => {
      const idx = prev.indexOf(key)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const startHold = (key: string, direction: -1 | 1) => {
    stopHoldRef.current()
    repeatedRef.current = false
    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      repeatedRef.current = true
      moveField(key, direction)
      interval = window.setInterval(() => moveField(key, direction), 100)
    }, 350)
    const stop = () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('blur', stop)
    }
    stopHoldRef.current = stop
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('blur', stop)
  }

  const clickMove = (key: string, direction: -1 | 1) => {
    if (repeatedRef.current) {
      repeatedRef.current = false
      return
    }
    moveField(key, direction)
  }

  const moveToEdge = (idx: number, edge: 'top' | 'bottom') => {
    setSelectedFields((prev) => {
      const next = [...prev]
      const [field] = next.splice(idx, 1)
      next.splice(edge === 'top' ? 0 : next.length, 0, field)
      return next
    })
  }

  const removeField = (key: string) => {
    setSelectedFields((prev) => prev.filter((k) => k !== key))
  }

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const fields = selectedFields.map((key, idx) => ({
      field_name: key,
      field_label: registryMap.get(key) || key,
      sort_order: idx,
    }))
    await onSubmit({ name: data.name, description: data.description ?? '', fields })
    onOpenChange(false)
    form.reset()
    setSelectedFields([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? '编辑字段组' : '新建字段组'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl><Input placeholder="如: 完整导出字段组" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="字段组的用途说明" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel className="mb-2 block">选择字段（已选 {selectedFields.length} 项）</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                {/* 左栏：可选字段 */}
                <div className="space-y-2">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索字段"
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <ScrollArea className="h-[280px] rounded-md border p-2">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-8">加载中...</p>
                    ) : (
                      <div className="space-y-3">
                        {groupedFields.map(([group, fields]) => (
                          <div key={group}>
                            <div className="text-xs font-medium text-muted-foreground px-2 py-1">{group}</div>
                            {fields.map((f) => (
                              <label
                                key={f.name}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                              >
                                <Checkbox
                                  checked={selectedFields.includes(f.name)}
                                  onCheckedChange={() => toggleField(f.name)}
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* 右栏：已选字段排序 */}
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  {selectedFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      请在左侧勾选字段
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {selectedFields.map((key, idx) => (
                        <div
                          key={key}
                          className="flex min-w-0 items-center gap-0.5 rounded px-1 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <span className="text-muted-foreground w-5 shrink-0 text-xs">{idx + 1}.</span>
                          <span className="min-w-0 flex-1 truncate" title={registryMap.get(key) || key}>{registryMap.get(key) || key}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={idx === 0} onClick={() => moveToEdge(idx, 'top')} aria-label={`将${registryMap.get(key) || key}置顶`} title="置顶"><ArrowUpToLine className="h-3.5 w-3.5" /></Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 touch-none"
                            disabled={idx === 0}
                            onPointerDown={(event) => { if (event.button === 0) startHold(key, -1) }}
                            onKeyDown={() => { repeatedRef.current = false }}
                            onClick={() => clickMove(key, -1)}
                            aria-label={`将${registryMap.get(key) || key}上移，长按连续移动`}
                            title="上移，长按连续移动"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 touch-none"
                            disabled={idx === selectedFields.length - 1}
                            onPointerDown={(event) => { if (event.button === 0) startHold(key, 1) }}
                            onKeyDown={() => { repeatedRef.current = false }}
                            onClick={() => clickMove(key, 1)}
                            aria-label={`将${registryMap.get(key) || key}下移，长按连续移动`}
                            title="下移，长按连续移动"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={idx === selectedFields.length - 1} onClick={() => moveToEdge(idx, 'bottom')} aria-label={`将${registryMap.get(key) || key}置底`} title="置底"><ArrowDownToLine className="h-3.5 w-3.5" /></Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeField(key)}
                            aria-label={`移除${registryMap.get(key) || key}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit">{group ? '保存' : '创建'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
