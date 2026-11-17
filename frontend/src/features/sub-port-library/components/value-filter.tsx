import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ValueFilterProps {
  label: string
  options: string[]
  selected: string[] | null
  onChange: (values: string[] | null) => void
}

export function ValueFilter({ label, options, selected, onChange }: ValueFilterProps) {
  const [search, setSearch] = useState('')
  const visible = options.filter((value) => value.includes(search.trim()))
  const selectedValues = selected ?? options

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type='button' variant='outline' className='w-44 justify-start'>
          {label}{selected === null ? '' : ` (${selected.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 space-y-2' align='start'>
        <Input
          placeholder={`搜索${label}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className='flex gap-2'>
          <Button type='button' size='sm' variant='ghost' onClick={() => onChange(null)}>
            全选
          </Button>
          <Button type='button' size='sm' variant='ghost' onClick={() => onChange([])}>
            全不选
          </Button>
        </div>
        <div className='max-h-60 space-y-1 overflow-y-auto'>
          {visible.map((value) => (
            <label key={value} className='flex cursor-pointer items-center gap-2 text-sm'>
              <Checkbox
                checked={selectedValues.includes(value)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedValues, value]
                    : selectedValues.filter((item) => item !== value)
                  onChange(next.length === options.length ? null : next)
                }}
              />
              <span className='truncate' title={value}>{value}</span>
            </label>
          ))}
          {visible.length === 0 && (
            <p className='text-muted-foreground py-2 text-center text-sm'>无匹配值</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
