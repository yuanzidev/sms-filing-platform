import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  getApiAccessConfigs,
  deleteApiAccessConfig,
  getApiAccessData,
} from '@/lib/api/api-data'
import type { ApiAccessConfig } from '@/lib/api/types'
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
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusTag } from '@/components/shared/status-tag'
import { ThemeSwitch } from '@/components/theme-switch'
import { ApiAccessDialog } from './components/api-access-dialog'

export function ApiAccessPage() {
  const [selectedConfig, setSelectedConfig] = useState<
    ApiAccessConfig | undefined
  >()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<
    ApiAccessConfig | undefined
  >()
  const [dataConfigId, setDataConfigId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['api-access'],
    queryFn: () => getApiAccessConfigs(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiAccessConfig(id),
    onSuccess: () => {
      toast.success('配置删除成功')
      queryClient.invalidateQueries({ queryKey: ['api-access'] })
      setDeleteDialogOpen(false)
      setConfigToDelete(undefined)
    },
    onError: () => toast.error('配置删除失败'),
  })

  const configs = data?.data ?? []

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
            <h2 className='text-2xl font-bold tracking-tight'>API 接入配置</h2>
            <p className='text-muted-foreground'>
              管理第三方 API 数据接入配置与数据展示
            </p>
          </div>
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['api-access'] })
              }
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
            <Button
              onClick={() => {
                setSelectedConfig(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新建配置
            </Button>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>{config.name}</CardTitle>
                  <div className='flex space-x-1'>
                    <ActionIconButton
                      label='编辑'
                      icon='edit'
                      tone='edit'
                      onClick={() => {
                        setSelectedConfig(config)
                        setDialogOpen(true)
                      }}
                    />
                    <ActionIconButton
                      label='删除'
                      icon='delete'
                      tone='delete'
                      onClick={() => {
                        setConfigToDelete(config)
                        setDeleteDialogOpen(true)
                      }}
                    />
                  </div>
                </div>
                <CardDescription>
                  {config.endpoint || '未配置端点'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>类型:</span>
                    <span>{config.source_type || '-'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>状态:</span>
                    <StatusTag status={config.is_active ? '启用' : '停用'} />
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-2 w-full'
                    onClick={() =>
                      setDataConfigId(
                        dataConfigId === config.id ? null : config.id
                      )
                    }
                  >
                    {dataConfigId === config.id ? (
                      <EyeOff className='mr-1 h-3 w-3' />
                    ) : (
                      <Eye className='mr-1 h-3 w-3' />
                    )}
                    {dataConfigId === config.id ? '隐藏数据' : '查看数据'}
                  </Button>
                  {dataConfigId === config.id && (
                    <ApiAccessDataView configId={config.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {configs.length === 0 && !isLoading && (
          <EmptyState
            title='暂无 API 接入配置'
            description='创建配置后，可以在这里查看接入状态和最近同步数据。'
            action={
              <Button
                onClick={() => {
                  setSelectedConfig(undefined)
                  setDialogOpen(true)
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                新建配置
              </Button>
            }
          />
        )}
      </Main>

      <ApiAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={selectedConfig}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['api-access'] })
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除配置 "{configToDelete?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                configToDelete && deleteMutation.mutate(configToDelete.id)
              }
              className='bg-red-600 hover:bg-red-700'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ApiAccessDataView({ configId }: { configId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['api-access', configId, 'data'],
    queryFn: () => getApiAccessData(configId),
  })

  if (isLoading) {
    return <div className='text-muted-foreground py-2 text-sm'>加载中...</div>
  }

  const records = data?.data ?? []

  if (records.length === 0) {
    return <div className='text-muted-foreground py-2 text-sm'>暂无数据</div>
  }

  const columns = Object.keys(records[0] || {}).slice(0, 5)

  return (
    <div className='mt-2 overflow-auto rounded border'>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className='text-xs'>
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.slice(0, 10).map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className='text-xs'>
                  {String(row[col] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default ApiAccessPage
