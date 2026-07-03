import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getPortInfos, deletePortInfo } from '@/lib/api/port-info'
import type { PortInfo } from '@/lib/api/types'
import { PortInfoDialog } from './components/port-info-dialog'
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

export function PortInfoPage() {
  const [selected, setSelected] = useState<PortInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PortInfo | undefined>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['port-info'],
    queryFn: () => getPortInfos({ page_size: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePortInfo(id),
    onSuccess: () => {
      toast.success('端口信息删除成功')
      queryClient.invalidateQueries({ queryKey: ['port-info'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('端口信息删除失败'),
  })

  const portInfos = data?.data ?? []

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>端口信息管理</h2>
            <p className='text-muted-foreground'>
              管理端口详细信息（运营商、端口号、业务类型、签名等）
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button onClick={() => { setSelected(undefined); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              新建端口信息
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portInfos.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {p.main_port_number || p.sub_port_number || '未指定端口'}
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => { setSelected(p); setDialogOpen(true) }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setToDelete(p); setDeleteDialogOpen(true) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {p.business_type || '未指定业务类型'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">运营商:</span>
                    <Badge variant="outline">{p.carrier}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">省份:</span>
                    <span>{p.province || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">城市:</span>
                    <span>{p.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">短信签名:</span>
                    <span className="truncate max-w-[160px]">{p.sms_signature || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {portInfos.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">暂无端口信息</p>
          </div>
        )}
      </Main>

      <PortInfoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        portInfo={selected}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['port-info'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除端口信息 "{toDelete?.main_port_number || toDelete?.sub_port_number || '未指定'}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default PortInfoPage
