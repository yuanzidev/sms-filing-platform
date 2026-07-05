import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getExportGroups, createExportGroup, updateExportGroup, deleteExportGroup,
} from '@/lib/api/export-groups'
import type { ExportGroup } from '@/lib/api/types'
import { ExportGroupDialog } from './components/export-group-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ExportGroupsPage() {
  const [selected, setSelected] = useState<ExportGroup | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ExportGroup | undefined>()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['export-groups'],
    queryFn: getExportGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExportGroup(id),
    onSuccess: () => {
      toast.success('字段组删除成功')
      queryClient.invalidateQueries({ queryKey: ['export-groups'] })
      setToDelete(undefined)
    },
    onError: () => toast.error('字段组删除失败'),
  })

  const groups = data?.data ?? []

  const handleCreate = async (values: {
    name: string; description: string;
    fields: { field_name: string; field_label: string; sort_order: number }[];
  }) => {
    await createExportGroup(values)
    toast.success('字段组创建成功')
    queryClient.invalidateQueries({ queryKey: ['export-groups'] })
  }

  const handleUpdate = async (values: {
    name: string; description: string;
    fields: { field_name: string; field_label: string; sort_order: number }[];
  }) => {
    if (!selected) return
    await updateExportGroup(selected.id, values)
    toast.success('字段组更新成功')
    queryClient.invalidateQueries({ queryKey: ['export-groups'] })
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-2 flex flex-wrap items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">导出字段组</h2>
            <p className="text-muted-foreground">管理报备导出时使用的字段组合模板</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />新建字段组
            </Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['export-groups'] })} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />刷新
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-muted-foreground">加载失败</div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">暂无一键导出字段组</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />创建第一个字段组
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(group); setDialogOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setToDelete(group)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="mb-3 text-sm text-muted-foreground">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {group.fields.slice(0, 8).map((f) => (
                      <Badge key={f.id} variant="secondary" className="text-xs">{f.field_label}</Badge>
                    ))}
                    {group.fields.length > 8 && (
                      <Badge variant="outline" className="text-xs">+{group.fields.length - 8} 更多</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>

      <ExportGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selected}
        onSubmit={selected ? handleUpdate : handleCreate}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除字段组 "{toDelete?.name}" 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ExportGroupsPage
