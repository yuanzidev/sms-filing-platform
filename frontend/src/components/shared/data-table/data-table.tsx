import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
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
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  getRowId?: (originalRow: TData, index: number) => string
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
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [pageInput, setPageInput] = useState(String(page))
  const effectiveRowSelection = rowSelection ?? internalRowSelection

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      onSortingChange?.(next)
    },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(effectiveRowSelection) : updater
      if (rowSelection === undefined) {
        setInternalRowSelection(next)
      }
      onRowSelectionChange?.(next)
    },
    enableRowSelection,
    state: { sorting, rowSelection: effectiveRowSelection },
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  const goToPage = () => {
    const nextPage = Number(pageInput)
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(page))
      return
    }
    const normalizedPage = Math.min(
      Math.max(1, Math.trunc(nextPage)),
      totalPages
    )
    setPageInput(String(normalizedPage))
    if (normalizedPage !== page) {
      onPageChange(normalizedPage)
    }
  }

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
        <div className='flex flex-wrap items-center justify-end gap-2'>
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
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-sm'>跳至</span>
            <Input
              type='number'
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  goToPage()
                }
              }}
              onBlur={() => {
                if (!pageInput.trim()) {
                  setPageInput(String(page))
                }
              }}
              className='h-8 w-20'
            />
            <span className='text-muted-foreground text-sm'>页</span>
            <Button
              variant='outline'
              size='sm'
              onClick={goToPage}
            >
              跳转
            </Button>
          </div>
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
