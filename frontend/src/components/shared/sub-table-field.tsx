import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'

interface SubTableFieldProps<T extends Record<string, unknown>> {
  columns: {
    key: string
    header: string
    type: 'text' | 'select' | 'number'
    options?: { label: string; value: string }[]
  }[]
  value: T[]
  onChange: (items: T[]) => void
  addLabel?: string
}

function emptyItem<T extends Record<string, unknown>>(
  columns: SubTableFieldProps<T>['columns'],
): T {
  const item: Record<string, unknown> = {}
  for (const col of columns) {
    item[col.key] = col.type === 'number' ? 0 : ''
  }
  return item as T
}

export function SubTableField<T extends Record<string, unknown>>({
  columns,
  value,
  onChange,
  addLabel = '添加',
}: SubTableFieldProps<T>) {
  function updateItem(index: number, key: string, val: unknown) {
    const next = [...value]
    next[index] = { ...next[index], [key]: val }
    onChange(next)
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...value, emptyItem<T>(columns)])
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
            <TableHead className="w-[60px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            value.map((item, index) => (
              <TableRow key={index}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.type === 'select' && col.options ? (
                      <Select
                        value={String(item[col.key] ?? '')}
                        onValueChange={(v) => updateItem(index, col.key, v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {col.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={col.type === 'number' ? 'number' : 'text'}
                        value={String(item[col.key] ?? '')}
                        onChange={(e) =>
                          updateItem(
                            index,
                            col.key,
                            col.type === 'number' ? Number(e.target.value) : e.target.value,
                          )
                        }
                        className="h-8"
                      />
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}
