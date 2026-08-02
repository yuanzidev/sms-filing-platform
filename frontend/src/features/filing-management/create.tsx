import { Fragment, useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/shared/data-table/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getQualifications } from '@/lib/api/qualifications'
import { getExportGroups } from '@/lib/api/export-groups'
import { getPortInfos } from '@/lib/api/port-info'
import { getSubPortAvailability } from '@/lib/api/filing-sub-port-availability'
import { useCreateFilingTask } from '@/hooks/use-filing-tasks'
import type { QualificationInfo, ExportGroup, PortInfo } from '@/lib/api/types'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Loader2, Upload } from 'lucide-react'
import { SignatureImportDialog } from './components/signature-import-dialog'

type Step = 1 | 2 | 3 | 4 | 5

const FIELD_LABEL_MAP: Record<string, string> = {
  carrier: '运营商',
  operation_type: '操作类型',
  main_port_number: '主端口号',
  sub_port_number: '子端口号',
  port_range: '码号使用范围',
  province: '接入省',
  city: '接入地市',
  port_type: '端口类型',
  port_activation_date: '端口入网时间',
  allow_self_extension: '是否允许自行扩展',
  business_attribute: '业务属性',
  business_type: '业务类型',
  business_subtype: '业务细类',
  specific_usage: '具体用途',
  sms_signature: '短信签名',
  is_gateway_signature: '是否网关签名',
  carrier_room: '运营商接入机房及设备',
  enterprise_room: '企业接入机房及设备',
  has_authorization: '是否具有授权书',
  auth_start_date: '授权开始日期',
  auth_end_date: '授权结束日期',
  sms_template_content: '短信模板内容',
  submit_unit: '报送单位',
  carrier_enterprise_id: '运营商企业ID',
  enterprise_name: '企业名称',
  cert_type: '单位证件类型',
  cert_number: '单位证件号码',
  app_platform_name: 'APP/平台名称',
  group_code: '集团编码',
  responsible_name: '责任人姓名',
  responsible_cert_type: '责任人证件类型',
  responsible_cert_number: '责任人证件号码',
  responsible_phone: '责任人手机号',
  handler_name: '经办人姓名',
  handler_cert_type: '经办人证件类型',
  handler_cert_number: '经办人证件号码',
  handler_phone: '经办人手机号',
}

function getFieldLabel(name: string): string {
  return FIELD_LABEL_MAP[name] || name
}

export function FilingCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)

  // Step 1 state
  const [qualPage, setQualPage] = useState(1)
  const [qualSearch, setQualSearch] = useState('')
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({})

  // Step 2 state (port selection)
  const [portSearch, setPortSearch] = useState('')
  const [portCarrierFilter, setPortCarrierFilter] = useState<string>('__all__')
  const [selectedPortIds, setSelectedPortIds] = useState<Record<string, boolean>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Step 3 state (configure sub-port range)
  const [subPortRangeStart, setSubPortRangeStart] = useState('100001')
  const [subPortRangeEnd, setSubPortRangeEnd] = useState('199999')

  // Step 4 state (configure export)
  const [exportGroupId, setExportGroupId] = useState<string>('')
  const [groupByField, setGroupByField] = useState<string>('__none__')
  const [taskName, setTaskName] = useState('')

  // Fetch qualifications
  const { data: qualData } = useQuery({
    queryKey: ['qualifications', { page: qualPage, page_size: 10, sms_signature: qualSearch || undefined }],
    queryFn: () => getQualifications({ page: qualPage, page_size: 10, sms_signature: qualSearch || undefined }),
  })

  // Fetch export groups
  const { data: exportGroupsData, isLoading: exportGroupsLoading, isError: exportGroupsError } = useQuery({
    queryKey: ['export-groups'],
    queryFn: () => getExportGroups(),
  })

  // Fetch all ports for selection (small dataset, < 100 rows)
  const { data: portData } = useQuery({
    queryKey: ['port-info-all'],
    queryFn: () => getPortInfos({ page: 1, page_size: 500 }),
  })

  const allPorts: PortInfo[] = portData?.data ?? []

  const createMutation = useCreateFilingTask()

  // Get selected qualification IDs (from row indices + data)
  const qualifications = qualData?.data ?? []
  const selectedIds = useMemo(() => {
    return Object.entries(selectedRows)
      .filter(([, v]) => v)
      .map(([idx]) => qualifications[Number(idx)]?.id)
      .filter(Boolean) as string[]
  }, [selectedRows, qualifications])

  const [signatureImportOpen, setSignatureImportOpen] = useState(false)

  const selectedExportGroup = exportGroupsData?.data?.find((g: ExportGroup) => g.id === exportGroupId)

  // Field options for group_by_field from the selected export group's fields
  const groupByFieldOptions = useMemo(() => {
    if (!selectedExportGroup?.fields) return []
    return selectedExportGroup.fields.map((f) => ({
      value: f.field_name,
      label: `${getFieldLabel(f.field_name)} (${f.field_name})`,
    }))
  }, [selectedExportGroup])

  const qualificationColumns = useMemo<ColumnDef<QualificationInfo>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      ),
      enableSorting: false,
    },
    { accessorKey: 'enterprise_name', header: '企业名称' },
    { accessorKey: 'legal_representative_name', header: '法人', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'sms_signature', header: '短信签名', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'handler_name', header: '经办人', cell: ({ getValue }) => getValue() || '-' },
  ], [])

  // Step 2 only selects main ports (sub_port_number is null)
  const portsForSelection = useMemo(
    () => allPorts.filter((p) => !p.sub_port_number),
    [allPorts]
  )

  // Group main ports by main_port_number
  const portGroups = useMemo(() => {
    const groups: Record<string, PortInfo[]> = {}
    for (const p of portsForSelection) {
      const key = p.main_port_number
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    // Sort each group: main port (sub_port_number is null/empty) first, then by sub_port_number
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const aSub = a.sub_port_number || ''
        const bSub = b.sub_port_number || ''
        if (aSub === '' && bSub !== '') return -1
        if (bSub === '' && aSub !== '') return 1
        return aSub.localeCompare(bSub)
      })
    }
    return groups
  }, [portsForSelection])

  const carrierOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of portsForSelection) set.add(p.carrier)
    return Array.from(set).sort()
  }, [portsForSelection])

  const filteredGroups = useMemo(() => {
    const result: Record<string, PortInfo[]> = {}
    const search = portSearch.trim().toLowerCase()
    for (const [key, ports] of Object.entries(portGroups)) {
      if (portCarrierFilter !== '__all__' && !ports.some((p) => p.carrier === portCarrierFilter)) continue
      if (search) {
        const matched = ports.some(
          (p) =>
            p.main_port_number.toLowerCase().includes(search) ||
            (p.sub_port_number || '').toLowerCase().includes(search) ||
            key.toLowerCase().includes(search)
        )
        if (!matched) continue
      }
      result[key] = ports
    }
    return result
  }, [portGroups, portCarrierFilter, portSearch])

  const selectedPortIdList = useMemo(
    () => Object.entries(selectedPortIds).filter(([, v]) => v).map(([id]) => id),
    [selectedPortIds]
  )

  const selectedGroupCount = useMemo(() => {
    const set = new Set<string>()
    for (const id of selectedPortIdList) {
      const p = allPorts.find((x) => x.id === id)
      if (p) set.add(p.main_port_number)
    }
    return set.size
  }, [selectedPortIdList, allPorts])

  function groupSelectionState(_key: string, ports: PortInfo[]): 'none' | 'partial' | 'all' {
    const selectedCount = ports.filter((p) => selectedPortIds[p.id]).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === ports.length) return 'all'
    return 'partial'
  }

  function toggleGroup(key: string, ports: PortInfo[]) {
    const state = groupSelectionState(key, ports)
    setSelectedPortIds((prev) => {
      const next = { ...prev }
      const shouldSelect = state !== 'all'
      for (const p of ports) next[p.id] = shouldSelect
      return next
    })
  }

  function togglePort(id: string) {
    setSelectedPortIds((prev) => {
      const next = { ...prev }
      next[id] = !next[id]
      return next
    })
  }

  function toggleGroupExpanded(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const estimatedRows = selectedIds.length * selectedPortIdList.length

  const handleSignatureImport = (matchedIds: string[]) => {
    setSelectedRows((prev) => {
      const next = { ...prev }
      matchedIds.forEach((id) => {
        const idx = qualifications.findIndex((q) => q.id === id)
        if (idx !== -1) {
          next[idx] = true
        }
      })
      return next
    })
  }

  const handleCreate = () => {
    if (!exportGroupId) {
      toast.error('请选择导出字段组')
      return
    }
    createMutation.mutate(
      {
        qualification_ids: selectedIds,
        port_ids: selectedPortIdList,
        export_group_id: exportGroupId,
        group_by_field: groupByField === '__none__' ? undefined : (groupByField || undefined),
        task_name: taskName.trim() || undefined,
        auto_allocate_sub_ports: true,
        sub_port_range_start: Number(subPortRangeStart),
        sub_port_range_end: Number(subPortRangeEnd),
      },
      {
        onSuccess: (task) => {
          toast.success('报备任务创建成功', {
            description: task.download_url ? '点击下载导出文件' : undefined,
            action: task.download_url
              ? {
                  label: '下载',
                  onClick: () => window.open(task.download_url!, '_blank'),
                }
              : undefined,
          })
          navigate({ to: '/filing-management' })
        },
        onError: () => toast.error('创建报备任务失败'),
      },
    )
  }

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/filing-management' })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>新建报备</h2>
              <p className='text-muted-foreground'>
                选择资质、配置导出参数并生成报备任务
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-sm ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
                  {s === 1 ? '选择资质' : s === 2 ? '选择主端口' : s === 3 ? '子端口范围' : s === 4 ? '配置导出' : '确认生成'}
                </span>
                {i < 4 && <div className="mx-2 h-px w-8 bg-border" />}
              </div>
            ))}
          </div>

      {/* Step 1: Select qualifications */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>选择资质</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="搜索签名"
                value={qualSearch}
                onChange={(e) => {
                  setQualSearch(e.target.value)
                  setQualPage(1)
                }}
                className="w-64"
              />
              <span className="text-sm text-muted-foreground">
                已选 {selectedIds.length} 个资质
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSignatureImportOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                批量导入签名
              </Button>
            </div>
            <DataTable
              columns={qualificationColumns}
              data={qualifications}
              page={qualPage}
              pageSize={10}
              total={qualData?.total ?? 0}
              onPageChange={setQualPage}
              enableRowSelection
              onRowSelectionChange={(selection) => {
                setSelectedRows(selection as Record<number, boolean>)
              }}
            />
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={selectedIds.length === 0}>
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select main ports */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>选择主端口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="搜索端口号"
                value={portSearch}
                onChange={(e) => setPortSearch(e.target.value)}
                className="w-64"
              />
              <Select value={portCarrierFilter} onValueChange={setPortCarrierFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全部运营商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部运营商</SelectItem>
                  {carrierOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                已选 {selectedGroupCount} 个主端口 / {selectedPortIdList.length} 行
              </span>
            </div>

            <div className="rounded-lg border">
              <div className="max-h-[480px] overflow-auto">
                {Object.keys(filteredGroups).length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    没有匹配的端口
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(filteredGroups).map(([key, ports]) => {
                        const state = groupSelectionState(key, ports)
                        const expanded = expandedGroups[key] ?? false
                        return (
                          <Fragment key={key}>
                            <tr
                              className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleGroupExpanded(key)}
                            >
                              <td className="w-10 p-3">
                                <Checkbox
                                  checked={state === 'all' ? true : state === 'partial' ? 'indeterminate' : false}
                                  onCheckedChange={() => toggleGroup(key, ports)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`全选主端口 ${key}`}
                                />
                              </td>
                              <td className="p-3 font-medium">
                                <div className="flex items-center gap-2">
                                  {expanded
                                    ? <ChevronDown className="h-4 w-4" />
                                    : <ChevronRight className="h-4 w-4" />}
                                  {key}
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground text-right">
                                {ports.filter((p) => selectedPortIds[p.id]).length}/{ports.length}
                              </td>
                            </tr>
                            {expanded && ports.map((p) => (
                              <tr
                                key={p.id}
                                className="border-b last:border-0 hover:bg-accent/30"
                              >
                                <td className="w-10 p-3 pl-8">
                                  <Checkbox
                                    checked={!!selectedPortIds[p.id]}
                                    onCheckedChange={() => togglePort(p.id)}
                                    aria-label={`选择端口 ${p.sub_port_number || '主端口'}`}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono">
                                      {p.sub_port_number || '—'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {p.carrier} · {p.province || '-'} · {p.city || '-'} · {p.port_type || '-'}
                                    </span>
                                  </div>
                                </td>
                                <td />
                              </tr>
                            ))}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedPortIdList.length === 0}
              >
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configure sub-port range */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>配置子端口范围</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">起始号码</label>
                <Input
                  value={subPortRangeStart}
                  onChange={(e) => setSubPortRangeStart(e.target.value)}
                  className="w-40"
                  placeholder="100001"
                />
              </div>
              <span className="pb-2 text-muted-foreground">-</span>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">结束号码</label>
                <Input
                  value={subPortRangeEnd}
                  onChange={(e) => setSubPortRangeEnd(e.target.value)}
                  className="w-40"
                  placeholder="199999"
                />
              </div>
            </div>

            <RangeAvailability
              mainPortNumbers={selectedPortIdList
                .map((id) => allPorts.find((p) => p.id === id)?.main_port_number)
                .filter(Boolean) as string[]}
              rangeStart={Number(subPortRangeStart) || 0}
              rangeEnd={Number(subPortRangeEnd) || 0}
              needCount={selectedIds.length}
            />

            <div className="rounded bg-muted/50 p-3 text-sm">
              预计生成 {selectedIds.length * selectedGroupCount} 个子端口
              （资质 {selectedIds.length} × 主端口 {selectedGroupCount}）
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={
                  !/^\d+$/.test(subPortRangeStart) ||
                  !/^\d+$/.test(subPortRangeEnd) ||
                  Number(subPortRangeStart) > Number(subPortRangeEnd)
                }
              >
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Configure export */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>配置导出</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">导出字段组 *</label>
              {exportGroupsLoading ? (
                <Skeleton className="h-10 w-full max-w-sm" />
              ) : exportGroupsError ? (
                <p className="text-sm text-destructive">加载导出字段组失败，请刷新重试</p>
              ) : (
                <Select value={exportGroupId} onValueChange={(v) => { setExportGroupId(v); setGroupByField('__none__') }}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="选择导出字段组" />
                  </SelectTrigger>
                  <SelectContent>
                    {(exportGroupsData?.data ?? []).map((g: ExportGroup) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">任务名称（可选）</label>
              <Input
                placeholder="留空则自动生成"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full max-w-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">分组排序字段（可选）</label>
              <Select value={groupByField} onValueChange={setGroupByField} disabled={!exportGroupId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="不分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不分组</SelectItem>
                  {groupByFieldOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button onClick={() => setStep(5)} disabled={!exportGroupId}>
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirm */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>确认生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
              <div>
                <span className="text-sm text-muted-foreground">选中资质数</span>
                <p className="text-xl font-bold">{selectedIds.length}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">端口数量</span>
                <p className="text-xl font-bold">{selectedPortIdList.length}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">导出字段组</span>
                <p className="text-lg font-medium">{selectedExportGroup?.name ?? '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">分组字段</span>
                <p className="text-lg font-medium">{groupByField && groupByField !== '__none__' ? getFieldLabel(groupByField) : '无'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">任务名称</span>
                <p className="text-lg font-medium">{taskName || '（自动生成）'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">预计行数（资质 × 端口）</span>
                <p className="text-xl font-bold">{estimatedRows.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                生成报备
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
        <SignatureImportDialog
          open={signatureImportOpen}
          onOpenChange={setSignatureImportOpen}
          onConfirm={handleSignatureImport}
        />
      </Main>
    </>
  )
}

function RangeAvailability({
  mainPortNumbers, rangeStart, rangeEnd, needCount,
}: {
  mainPortNumbers: string[]
  rangeStart: number
  rangeEnd: number
  needCount: number
}) {
  const { data } = useQuery({
    queryKey: ['sub-port-availability', mainPortNumbers, rangeStart, rangeEnd],
    queryFn: () => getSubPortAvailability(mainPortNumbers, rangeStart, rangeEnd),
    enabled: mainPortNumbers.length > 0 && rangeStart > 0 && rangeEnd > rangeStart,
  })

  if (!data) return null
  return (
    <div className="space-y-1 rounded border p-3 text-sm">
      {mainPortNumbers.map((mpn) => {
        const info = data[mpn]
        if (!info) return null
        const insufficient = info.available < needCount
        return (
          <div key={mpn} className={insufficient ? 'text-destructive' : ''}>
            主端口 {mpn}: 可用 {info.available} / {info.total}
            {insufficient && ` (不足，需要 ${needCount})`}
          </div>
        )
      })}
    </div>
  )
}
