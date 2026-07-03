import { useMemo } from 'react'
import { type ColumnDef, type SortingState, type RowSelectionState } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/shared/data-table/data-table'
import { StatusTag } from '@/components/shared/status-tag'
import type { FilingRecord } from '@/lib/api/types'

interface RecordsTableProps {
  data: FilingRecord[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onSortingChange?: (sorting: SortingState) => void
  enableRowSelection?: boolean
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export function RecordsTable({
  onDelete,
  enableRowSelection,
  onRowSelectionChange,
  ...tableProps
}: RecordsTableProps) {
  const columns = useMemo<ColumnDef<FilingRecord>[]>(() => {
    const cols: ColumnDef<FilingRecord>[] = []

    if (enableRowSelection) {
      cols.push({
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
        enableHiding: false,
      })
    }

    cols.push(
      { accessorKey: 'record_number', header: '报备编号' },
      {
        id: 'carrier',
        header: '运营商',
        accessorFn: (row) => row.port_info?.carrier ?? '-',
      },
      {
        id: 'enterprise_name',
        header: '企业名称',
        accessorFn: (row) => row.qualification_info?.enterprise_name ?? '-',
      },
      {
        id: 'main_port',
        header: '主端口',
        accessorFn: (row) => row.port_info?.main_port_number ?? '-',
      },
      {
        id: 'sub_port',
        header: '子端口',
        accessorFn: (row) => row.port_info?.sub_port_number ?? '-',
      },
      {
        id: 'sms_signature',
        header: '短信签名',
        accessorFn: (row) => row.port_info?.sms_signature ?? '-',
      },
      {
        id: 'business_type',
        header: '业务类型',
        accessorFn: (row) => row.port_info?.business_type ?? '-',
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => <StatusTag status={row.original.status} />,
      },
      { accessorKey: 'created_at', header: '报备日期' },
      { accessorKey: 'updated_at', header: '更新时间' },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/records/$recordId/detail" params={{ recordId: row.original.id }}>
                查看
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/records/$recordId/edit" params={{ recordId: row.original.id }}>
                编辑
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(row.original.id)}
            >
              删除
            </Button>
          </div>
        ),
      },
    )

    return cols
  }, [enableRowSelection, onDelete])

  return (
    <DataTable
      columns={columns}
      {...tableProps}
      enableRowSelection={enableRowSelection}
      onRowSelectionChange={onRowSelectionChange}
    />
  )
}
