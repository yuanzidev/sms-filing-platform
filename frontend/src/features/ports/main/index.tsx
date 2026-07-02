import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { MainPort } from '@/lib/mock/data/ports'
import { useMainPorts } from '@/hooks/use-ports'
import { DataTable } from '@/components/shared/data-table/data-table'
import { SearchForm, type SearchField } from '@/components/shared/search-form'
import { StatusTag } from '@/components/shared/status-tag'
import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

const searchFields: SearchField[] = [
  { name: 'carrier', label: '运营商', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '移动', value: '移动' },
    { label: '联通', value: '联通' },
    { label: '电信', value: '电信' },
  ]},
  { name: 'status', label: '状态', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '空闲', value: '空闲' },
    { label: '使用中', value: '使用中' },
    { label: '停用', value: '停用' },
    { label: '异常', value: '异常' },
  ]},
  { name: 'province', label: '省份', type: 'text' },
]

interface MainPortRow {
  id: string
  port_number: string
  carrier: string
  port_range: string
  province: string
  city: string
  port_type: string
  status: string
  sub_port_count: number
  created_at: string
}

const columns: ColumnDef<MainPortRow>[] = [
  { accessorKey: 'port_number', header: '端口号' },
  { accessorKey: 'carrier', header: '运营商' },
  { accessorKey: 'port_range', header: '端口范围' },
  { accessorKey: 'province', header: '省份' },
  { accessorKey: 'city', header: '城市' },
  { accessorKey: 'port_type', header: '端口类型' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
  },
  { accessorKey: 'sub_port_count', header: '子端口数' },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => {
      const navigate = useNavigate()
      return (
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/ports/main/$portId/detail', params: { portId: row.original.id } })}>
          <Eye className="mr-1 h-4 w-4" />查看
        </Button>
      )
    },
  },
]

export function MainPortListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading, error } = useMainPorts({ ...filters, page, pageSize })

  const rows = useMemo(() => (data?.data ?? []) as MainPortRow[], [data])
  const total = data?.total ?? 0

  if (error) return <div className="p-6 text-muted-foreground">加载失败：{error.message}</div>

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">主端口管理</h1>
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
    </div>
  )
}
