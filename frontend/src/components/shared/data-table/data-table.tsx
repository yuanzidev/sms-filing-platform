import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/empty-state'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onSortingChange?: (sorting: SortingState) => void
  enableRowSelection?: boolean
  onRowSelectionChange?: (selection: RowSelectionState) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onSortingChange,
  enableRowSelection,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      onSortingChange?.(next)
    },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(next)
      onRowSelectionChange?.(next)
    },
    enableRowSelection,
    state: { sorting, rowSelection },
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className='space-y-4'>
      <div className='bg-card overflow-hidden rounded-lg border shadow-sm shadow-slate-950/5'>
        <Table>
          <TableHeader className='bg-muted/50'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='h-11 px-3'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='hover:bg-primary/5 data-[state=selected]:bg-primary/10'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='px-3 py-3'>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center'
                >
                  <EmptyState
                    title='暂无数据'
                    description='尝试调整筛选条件，或新建一条记录。'
                    className='border-0 bg-transparent py-10'
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <span className='text-muted-foreground text-sm'>共 {total} 条记录</span>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            上一页
          </Button>
          <span className='text-muted-foreground text-sm'>
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
