import { useState, useMemo } from 'react'
import type { ApiDataItem } from '@/lib/mock/data/api-data'
import { useApiData } from '@/hooks/use-api-data'
import { DataTable } from '@/components/shared/data-table/data-table'
import { SearchForm, type SearchField } from '@/components/shared/search-form'
import { StatusTag } from '@/components/shared/status-tag'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

const searchFields: SearchField[] = [
  { name: 'api_name', label: 'API名称', type: 'select', options: [
    { label: '全部', value: '' },
    { label: 'sms_template_api_v1', value: 'sms_template_api_v1' },
    { label: 'port_register_api_v2', value: 'port_register_api_v2' },
    { label: 'enterprise_verify_api_v1', value: 'enterprise_verify_api_v1' },
    { label: 'signature_register_api_v1', value: 'signature_register_api_v1' },
    { label: 'blacklist_check_api_v1', value: 'blacklist_check_api_v1' },
  ]},
  { name: 'data_type', label: '数据类型', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '模板报备', value: '模板报备' },
    { label: '端口报备', value: '端口报备' },
    { label: '企业认证', value: '企业认证' },
    { label: '签名报备', value: '签名报备' },
    { label: '黑名单校验', value: '黑名单校验' },
  ]},
  { name: 'status', label: '状态', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '待处理', value: '待处理' },
    { label: '已入库', value: '已入库' },
    { label: '校验失败', value: '校验失败' },
    { label: '已忽略', value: '已忽略' },
  ]},
  { name: 'carrier', label: '运营商', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '移动', value: '移动' },
    { label: '联通', value: '联通' },
    { label: '电信', value: '电信' },
  ]},
  { name: 'enterprise_name', label: '企业名称', type: 'text' },
]

interface ApiDataRow {
  id: string
  import_time: string
  api_name: string
  data_type: string
  enterprise_name: string
  main_port: string
  sub_port: string
  carrier: string
  status: string
  error_reason: string | null
  raw_data: object
}

export function ApiDataListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [rawDialog, setRawDialog] = useState<{ open: boolean; item?: ApiDataRow }>({ open: false })
  const pageSize = 10

  const { data, isLoading, error } = useApiData({ ...filters, page, pageSize })

  const rows = useMemo(() => (data?.data ?? []) as ApiDataRow[], [data])
  const total = data?.total ?? 0

  const columns: ColumnDef<ApiDataRow>[] = useMemo(() => [
    { accessorKey: 'import_time', header: '导入时间' },
    { accessorKey: 'api_name', header: 'API名称' },
    { accessorKey: 'data_type', header: '数据类型' },
    { accessorKey: 'enterprise_name', header: '企业名称' },
    { accessorKey: 'main_port', header: '主端口' },
    { accessorKey: 'sub_port', header: '子端口' },
    { accessorKey: 'carrier', header: '运营商' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
    },
    {
      accessorKey: 'error_reason',
      header: '错误原因',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? <span className="text-destructive text-xs">{val}</span> : '-'
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setRawDialog({ open: true, item: row.original })}>
          <Eye className="mr-1 h-4 w-4" />原始数据
        </Button>
      ),
    },
  ], [])

  if (error) return <div className="p-6 text-muted-foreground">加载失败：{error.message}</div>

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">API数据展示</h1>
      <SearchForm fields={searchFields} onSearch={(f) => { setFilters(f); setPage(1) }} />
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
      <Dialog open={rawDialog.open} onOpenChange={(open) => setRawDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>原始数据</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
            {JSON.stringify(rawDialog.item?.raw_data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
