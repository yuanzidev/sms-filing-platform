import { useState, useMemo } from 'react'
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
import { useCreateFilingTask } from '@/hooks/use-filing-tasks'
import type { QualificationInfo, ExportGroup } from '@/lib/api/types'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Upload } from 'lucide-react'
import { SignatureImportDialog } from './components/signature-import-dialog'

type Step = 1 | 2 | 3

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

  // Step 2 state
  const [exportGroupId, setExportGroupId] = useState<string>('')
  const [groupByField, setGroupByField] = useState<string>('__none__')
  const [portCount, setPortCount] = useState('')

  // Fetch qualifications
  const { data: qualData } = useQuery({
    queryKey: ['qualifications', { page: qualPage, page_size: 10, signature: qualSearch || undefined }],
    queryFn: () => getQualifications({ page: qualPage, page_size: 10, signature: qualSearch || undefined }),
  })

  // Fetch export groups
  const { data: exportGroupsData, isLoading: exportGroupsLoading, isError: exportGroupsError } = useQuery({
    queryKey: ['export-groups'],
    queryFn: () => getExportGroups(),
  })

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
    { accessorKey: 'signature', header: '签名', cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'handler_name', header: '经办人', cell: ({ getValue }) => getValue() || '-' },
  ], [])

  const estimatedRows = selectedIds.length * (portCount ? Number(portCount) : 0)

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
        port_count: portCount ? Number(portCount) : undefined,
        export_group_id: exportGroupId,
        group_by_field: groupByField === '__none__' ? undefined : (groupByField || undefined),
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
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-sm ${step >= s ? 'font-medium' : 'text-muted-foreground'}`}>
                  {s === 1 ? '选择资质' : s === 2 ? '配置导出' : '确认生成'}
                </span>
                {i < 2 && <div className="mx-2 h-px w-8 bg-border" />}
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

      {/* Step 2: Configure export */}
      {step === 2 && (
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

            <div className="space-y-2">
              <label className="text-sm font-medium">随机端口数量（可选）</label>
              <Input
                type="number"
                placeholder="留空使用全量端口"
                value={portCount}
                onChange={(e) => setPortCount(e.target.value)}
                className="w-full max-w-sm"
              />
              <p className="text-xs text-muted-foreground">不填写则使用全部可用端口</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button onClick={() => setStep(3)} disabled={!exportGroupId}>
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
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
                <p className="text-xl font-bold">{portCount ? `${portCount}（随机抽取）` : '全量'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">导出字段组</span>
                <p className="text-lg font-medium">{selectedExportGroup?.name ?? '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">分组字段</span>
                <p className="text-lg font-medium">{groupByField && groupByField !== '__none__' ? getFieldLabel(groupByField) : '无'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">预计行数（资质 × 端口）</span>
                <p className="text-xl font-bold">{estimatedRows > 0 ? estimatedRows.toLocaleString() : '端口全量后确定'}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
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
