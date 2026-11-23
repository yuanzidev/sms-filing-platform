import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  Download,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  batchDeleteQualifications,
  deleteQualification,
  downloadQualificationImportErrorReport,
  downloadQualificationTemplate,
  getQualifications,
  importQualifications,
  previewQualificationsImport,
  getSignatureSeriesRules,
  saveSignatureSeriesRule,
  deleteSignatureSeriesRule,
  cleanupBackupQualifications,
} from '@/lib/api/qualifications'
import type { QualificationInfo } from '@/lib/api/types'
import { formatCN } from '@/lib/time'
import { usePermissions } from '@/hooks/use-permissions'
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
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ActionIconButton } from '@/components/shared/action-icon-button'
import { DataTable } from '@/components/shared/data-table/data-table'
import { ImportDialog } from '@/components/shared/import-dialog'
import { ThemeSwitch } from '@/components/theme-switch'
import { QualificationDetailDialog } from './components/qualification-detail-dialog'
import { QualificationDialog } from './components/qualification-dialog'


export function QualificationsPage({ library = 'primary' }: { library?: 'primary' | 'backup' }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<QualificationInfo | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<QualificationInfo | undefined>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [cleanupBefore, setCleanupBefore] = useState('')
  const [cleanupReported, setCleanupReported] = useState<'all' | 'yes' | 'no'>('all')
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)
  const [cleanupIds, setCleanupIds] = useState<string[]>([])
  const [rulePattern, setRulePattern] = useState('')
  const [ruleSeries, setRuleSeries] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | undefined>()
  const [detailTarget, setDetailTarget] = useState<
    QualificationInfo | undefined
  >()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [signatureMode, setSignatureMode] = useState<'contains' | 'exact'>(
    'contains'
  )
  const [searchInputs, setSearchInputs] = useState({
    enterprise_name: '',
    cert_number: '',
    identity_cert_number: '',
    sms_signature: '',
    diversion_info: '',
    signature_series: '',
    business_type: '',
    business_attribute: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<{
    enterprise_name?: string
    cert_number?: string
    identity_cert_number?: string
    sms_signature?: string
    sms_signature_mode?: 'contains' | 'exact'
    diversion_info?: string
    signature_series?: string
    business_type?: string
    business_attribute?: string
  }>({})
  const queryClient = useQueryClient()
  const { data: seriesRules = [] } = useQuery({ queryKey: ['signature-series-rules'], queryFn: getSignatureSeriesRules })
  const saveRule = useMutation({
    mutationFn: () => saveSignatureSeriesRule({ pattern: rulePattern.trim(), series_name: ruleSeries.trim() }, editingRuleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-series-rules'] })
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      setRulePattern(''); setRuleSeries(''); setEditingRuleId(undefined)
      toast.success('系列规则已保存')
    },
    onError: () => toast.error('系列规则保存失败'),
  })
  const removeRule = useMutation({
    mutationFn: deleteSignatureSeriesRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-series-rules'] })
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      toast.success('系列规则已删除')
    },
    onError: () => toast.error('系列规则删除失败'),
  })
  const cleanupFilters = {
    before: cleanupBefore || undefined,
    reported: cleanupReported === 'all' ? undefined : cleanupReported === 'yes',
  }
  const archiveBackup = useMutation({
    mutationFn: () => cleanupBackupQualifications({ ...cleanupFilters, dry_run: false, ids: cleanupIds }),
    onSuccess: (result) => {
      setCleanupCount(null)
      setCleanupIds([])
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      toast.success(`已归档 ${result.count} 条备用资质`)
    },
    onError: () => toast.error('归档失败'),
  })
  const { has } = usePermissions()

  const { data, isLoading } = useQuery({
    queryKey: [
      'qualifications',
      { page, page_size: pageSize, library, ...appliedFilters },
    ],
    queryFn: () =>
      getQualifications({ page, page_size: pageSize, library, ...appliedFilters }),
  })

  const handleSearch = () => {
    setAppliedFilters({
      enterprise_name: searchInputs.enterprise_name.trim() || undefined,
      cert_number: searchInputs.cert_number.trim() || undefined,
      identity_cert_number:
        searchInputs.identity_cert_number.trim() || undefined,
      sms_signature: searchInputs.sms_signature.trim() || undefined,
      sms_signature_mode: signatureMode,
      diversion_info: searchInputs.diversion_info.trim() || undefined,
      signature_series: searchInputs.signature_series || undefined,
      business_type: searchInputs.business_type.trim() || undefined,
      business_attribute: searchInputs.business_attribute.trim() || undefined,
    })
    setPage(1)
  }

  const handleReset = () => {
    setSearchInputs({
      enterprise_name: '',
      cert_number: '',
      identity_cert_number: '',
      sms_signature: '',
      diversion_info: '',
      signature_series: '',
      business_type: '',
      business_attribute: '',
    })
    setAppliedFilters({})
    setSignatureMode('contains')
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQualification(id),
    onSuccess: () => {
      toast.success('资质信息删除成功')
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
      setDeleteDialogOpen(false)
      setToDelete(undefined)
    },
    onError: () => toast.error('资质信息删除失败'),
  })

  const qualifications = data?.data ?? []
  const total = data?.total ?? 0

  const selectedIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    [rowSelection]
  )
  const selectedCount = selectedIds.length

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => batchDeleteQualifications(ids),
    onSuccess: (result) => {
      toast.success(`已删除 ${result.deleted_count} 条记录`)
      setRowSelection({})
      setBatchDeleteDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['qualifications'] })
    },
    onError: () => toast.error('批量删除失败'),
  })

  const columns = useMemo<ColumnDef<QualificationInfo>[]>(
    () => [
      { accessorKey: 'enterprise_name', header: '企业名称' },
      {
        accessorKey: 'legal_representative_name',
        header: '法人',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'responsible_name',
        header: '责任人',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'sms_signature',
        header: '签名',
        cell: ({ getValue }) => getValue() || '-',
      },
      {
        accessorKey: 'business_type',
        header: '业务类型',
        cell: ({ getValue }) => getValue() || '-',
      },
      { accessorKey: 'signature_series', header: '签名系列', cell: ({ getValue }) => getValue() || '-' },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ getValue }) => formatCN(getValue() as string, { withSeconds: true }),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <ActionIconButton
              label='详情'
              icon='view'
              tone='view'
              onClick={() => {
                setDetailTarget(row.original)
              }}
            />
            {has('qualification:write') && (
              <ActionIconButton
                label='编辑'
                icon='edit'
                tone='edit'
                onClick={() => {
                  setSelected(row.original)
                  setDialogOpen(true)
                }}
              />
            )}
            {has('qualification:write') && (
              <ActionIconButton
                label='删除'
                icon='delete'
                tone='delete'
                onClick={() => {
                  setToDelete(row.original)
                  setDeleteDialogOpen(true)
                }}
              />
            )}
          </div>
        ),
      },
    ],
    [has]
  )

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
            <h2 className='text-2xl font-bold tracking-tight'>{library === 'backup' ? '备用资质库' : '资质管理'}</h2>
            <p className='text-muted-foreground'>
              管理企业资质信息（企业名称、证件、负责人、经办人等）
            </p>
          </div>
          <div className='flex space-x-2'>
            {library === 'backup' && has('qualification:write') && <Button variant='outline' disabled={!cleanupBefore && cleanupReported === 'all'} onClick={async () => {
              try {
                const result = await cleanupBackupQualifications(cleanupFilters)
                if (!result.count) toast.info('没有符合条件的备用资质')
                else { setCleanupIds(result.ids); setCleanupCount(result.count) }
              } catch { toast.error('清理预览失败') }
            }}>按条件归档</Button>}
            {has('qualification:write') && <Button variant='outline' onClick={() => setRulesOpen(true)}>管理签名系列</Button>}
            {has('qualification:write') && (
              <Button
                onClick={() => {
                  setSelected(undefined)
                  setDialogOpen(true)
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                新建资质
              </Button>
            )}
            {has('qualification:import') && (
              <>
                <Button
                  variant='outline'
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  导入数据
                </Button>
                <Button
                  variant='outline'
                  onClick={() => downloadQualificationTemplate()}
                >
                  <Download className='mr-2 h-4 w-4' />
                  下载模板
                </Button>
              </>
            )}
            {has('qualification:write') && selectedCount > 0 && (
              <Button
                variant='destructive'
                onClick={() => setBatchDeleteDialogOpen(true)}
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                删除 ({selectedCount})
              </Button>
            )}
            <Button
              variant='outline'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['qualifications'] })
              }
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              刷新
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='border-border/80 bg-card mt-4 mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4 shadow-sm shadow-slate-950/5'>
          {library === 'backup' && <>
            <div className='flex flex-col gap-1'><label className='text-muted-foreground text-sm'>归档早于此入库日期</label><Input type='date' className='w-40' value={cleanupBefore} onChange={(e) => setCleanupBefore(e.target.value)} /></div>
            <div className='flex flex-col gap-1'><label className='text-muted-foreground text-sm'>归档报备状态</label>
              <Select value={cleanupReported} onValueChange={(value: 'all' | 'yes' | 'no') => setCleanupReported(value)}>
                <SelectTrigger className='w-32'><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value='all'>全部</SelectItem><SelectItem value='yes'>已报备</SelectItem><SelectItem value='no'>未报备</SelectItem></SelectContent>
              </Select>
            </div>
          </>}
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>签名系列</label>
            <Select value={searchInputs.signature_series || '__all__'} onValueChange={(value) => setSearchInputs((s) => ({ ...s, signature_series: value === '__all__' ? '' : value }))}>
              <SelectTrigger className='w-40'><SelectValue placeholder='全部' /></SelectTrigger>
              <SelectContent><SelectItem value='__all__'>全部</SelectItem>{[...new Set(seriesRules.map((rule) => rule.series_name))].map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(['business_type', 'business_attribute'] as const).map((field) => (
            <div key={field} className='flex flex-col gap-1'>
              <label className='text-muted-foreground text-sm'>{field === 'business_type' ? '业务类型' : '业务属性'}</label>
              <Input className='w-36' value={searchInputs[field]} onChange={(e) => setSearchInputs((s) => ({ ...s, [field]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
            </div>
          ))}
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>签名</label>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                placeholder='搜索签名'
                value={searchInputs.sms_signature}
                onChange={(e) =>
                  setSearchInputs((s) => ({
                    ...s,
                    sms_signature: e.target.value,
                  }))
                }
                className='w-56 pl-8'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>匹配方式</label>
            <Select
              value={signatureMode}
              onValueChange={(value: 'contains' | 'exact') =>
                setSignatureMode(value)
              }
            >
              <SelectTrigger className='w-28'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='contains'>模糊</SelectItem>
                <SelectItem value='exact'>精确</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>企业名称</label>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                placeholder='搜索企业名称'
                value={searchInputs.enterprise_name}
                onChange={(e) =>
                  setSearchInputs((s) => ({
                    ...s,
                    enterprise_name: e.target.value,
                  }))
                }
                className='w-56 pl-8'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>单位证件号</label>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                placeholder='搜索单位证件号'
                value={searchInputs.cert_number}
                onChange={(e) =>
                  setSearchInputs((s) => ({
                    ...s,
                    cert_number: e.target.value,
                  }))
                }
                className='w-56 pl-8'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>身份证件号</label>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                placeholder='搜索身份证件号'
                value={searchInputs.identity_cert_number}
                onChange={(e) =>
                  setSearchInputs((s) => ({
                    ...s,
                    identity_cert_number: e.target.value,
                  }))
                }
                className='w-56 pl-8'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-sm'>引流信息</label>
            <Input
              placeholder='搜索引流链接或手机号码'
              value={searchInputs.diversion_info}
              onChange={(e) => setSearchInputs((s) => ({ ...s, diversion_info: e.target.value }))}
              className='w-56'
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
          </div>
          <div className='flex gap-2'>
            <Button size='sm' onClick={handleSearch}>
              搜索
            </Button>
            <Button variant='ghost' size='sm' onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={qualifications}
          page={page}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          total={total}
          onPageChange={setPage}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
        />
      </Main>

      <QualificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        qualification={selected}
        library={library}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['qualifications'] })
        }
      />

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto'>
          <DialogHeader><DialogTitle>签名系列规则</DialogTitle></DialogHeader>
          <p className='text-muted-foreground text-sm'>签名包含匹配词时归入系列；多个规则命中时使用最长匹配词。</p>
          <div className='flex gap-2'>
            <Input aria-label='匹配词' placeholder='签名匹配词' value={rulePattern} onChange={(e) => setRulePattern(e.target.value)} />
            <Input aria-label='系列名称' placeholder='系列名称' value={ruleSeries} onChange={(e) => setRuleSeries(e.target.value)} />
            <Button disabled={!rulePattern.trim() || !ruleSeries.trim() || saveRule.isPending} onClick={() => saveRule.mutate()}>{editingRuleId ? '保存' : '添加'}</Button>
          </div>
          <div className='space-y-2'>{seriesRules.map((rule) => (
            <div key={rule.id} className='flex items-center justify-between gap-2 border-b py-2 text-sm'>
              <span>{rule.pattern} → {rule.series_name}</span>
              <div className='flex gap-2'>
                <Button variant='ghost' size='sm' onClick={() => { setEditingRuleId(rule.id); setRulePattern(rule.pattern); setRuleSeries(rule.series_name) }}>编辑</Button>
                <Button variant='ghost' size='sm' onClick={() => removeRule.mutate(rule.id)}>删除</Button>
              </div>
            </div>
          ))}</div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cleanupCount !== null} onOpenChange={(open) => { if (!open) { setCleanupCount(null); setCleanupIds([]) } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认归档备用资质</AlertDialogTitle>
            <AlertDialogDescription>符合条件的 {cleanupCount} 条资质将从备用库列表和后续报备选择中隐藏。历史报备文件不受影响。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={archiveBackup.isPending} onClick={() => archiveBackup.mutate()}>确认归档</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title='资质信息'
        onDownloadTemplate={downloadQualificationTemplate}
        onImport={(file) => importQualifications(file, library)}
        onPreview={previewQualificationsImport}
        onDownloadErrorReport={downloadQualificationImportErrorReport}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['qualifications'] })
        }
      />

      {detailTarget && (
        <QualificationDetailDialog
          open={!!detailTarget}
          onOpenChange={(open) => {
            if (!open) setDetailTarget(undefined)
          }}
          qualification={detailTarget}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资质 "{toDelete?.enterprise_name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              className='bg-red-600 hover:bg-red-700'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除已选的 {selectedCount} 条资质吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => batchDeleteMutation.mutate(selectedIds)}
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

export default QualificationsPage
