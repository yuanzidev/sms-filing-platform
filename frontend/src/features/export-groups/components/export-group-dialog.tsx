import { useState, useEffect, useMemo } from 'react'
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
import { ChevronUp, ChevronDown, X, Search as SearchIcon } from 'lucide-react'
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

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    setSelectedFields((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (idx: number) => {
    setSelectedFields((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
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
                          className="flex items-center gap-1 text-sm rounded px-2 py-1.5 hover:bg-muted/50"
                        >
                          <span className="text-muted-foreground w-5 text-xs">{idx + 1}.</span>
                          <span className="flex-1 truncate">{registryMap.get(key) || key}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === 0}
                            onClick={() => moveUp(idx)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === selectedFields.length - 1}
                            onClick={() => moveDown(idx)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeField(key)}
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
