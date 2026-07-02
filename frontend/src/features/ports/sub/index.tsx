import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getSubPorts } from '@/lib/mock/store'
import type { SubPort } from '@/lib/mock/data/ports'
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
  { name: 'enterprise_name', label: '企业名称', type: 'text' },
]

const columns: ColumnDef<SubPort>[] = [
  { accessorKey: 'port_number', header: '端口号' },
  { accessorKey: 'carrier', header: '运营商' },
  { accessorKey: 'main_port_number', header: '所属主端口' },
  { accessorKey: 'enterprise_name', header: '企业名称' },
  { accessorKey: 'sms_signature', header: '短信签名' },
  { accessorKey: 'business_type', header: '业务类型' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ getValue }) => <StatusTag status={getValue() as string} />,
  },
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

  const { data, total } = getSubPorts(filters, page, pageSize)

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">子端口管理</h1>
      <SearchForm fields={searchFields} onSearch={(f) => { setFilters(f); setPage(1) }} />
      <DataTable
        columns={columns}
        data={data as SubPort[]}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
