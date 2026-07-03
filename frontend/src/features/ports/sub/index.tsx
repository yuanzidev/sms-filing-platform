import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getSubPorts, type SubPortFilters } from '@/lib/api/ports'
import type { SubPort } from '@/lib/api/types'
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
    { label: '已分配', value: '已分配' },
    { label: '已报备', value: '已报备' },
    { label: '停用', value: '停用' },
  ]},
]

const columns: ColumnDef<SubPort>[] = [
  { accessorKey: 'port_number', header: '端口号' },
  { accessorKey: 'carrier', header: '运营商' },
  { accessorKey: 'main_port_number', header: '所属主端口' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
  },
  { accessorKey: 'created_at', header: '创建时间' },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => {
      const navigate = useNavigate()
      return (
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/ports/sub/$portId/detail', params: { portId: row.original.id } })}>
          <Eye className="mr-1 h-4 w-4" />查看
        </Button>
      )
    },
  },
]

export function SubPortListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['ports', 'sub', { ...filters, page, page_size: pageSize }],
    queryFn: () => getSubPorts({ ...filters, page, page_size: pageSize } as SubPortFilters),
  })

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">子端口管理</h1>
      <SearchForm fields={searchFields} onSearch={(f) => { setFilters(f); setPage(1) }} onReset={() => { setFilters({}); setPage(1) }} />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  )
}
