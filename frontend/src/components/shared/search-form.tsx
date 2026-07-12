import { useState } from 'react'
import { ChevronDown, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SearchField {
  name: string
  label: string
  type: 'text' | 'select'
  options?: { label: string; value: string }[]
  advanced?: boolean
}

interface SearchFormProps {
  fields: SearchField[]
  onSearch: (values: Record<string, string>) => void
  onReset: () => void
}

const EMPTY_SENTINEL = '__all__'

export function SearchForm({ fields, onSearch, onReset }: SearchFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const basicFields = fields.filter((f) => !f.advanced)
  const advancedFields = fields.filter((f) => f.advanced)

  const selectValue = (name: string) => {
    const v = values[name]
    return v === '' ? EMPTY_SENTINEL : (v ?? '')
  }

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: value === EMPTY_SENTINEL ? '' : value,
    }))
  }

  const handleSearch = () => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    )
    onSearch(cleaned)
  }

  const handleReset = () => {
    setValues({})
    onReset()
  }

  return (
    <div className='border-border/80 bg-card space-y-4 rounded-lg border p-4 shadow-sm shadow-slate-950/5'>
      <div className='flex flex-wrap items-end gap-3'>
        {basicFields.map((field) => (
          <div key={field.name} className='space-y-1'>
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === 'select' ? (
              <Select
                value={selectValue(field.name)}
                onValueChange={(v) => handleChange(field.name, v)}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder={`选择${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value || EMPTY_SENTINEL}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.name}
                placeholder={field.label}
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className='w-[160px]'
              />
            )}
          </div>
        ))}
        <div className='flex gap-2 pb-0.5'>
          <Button onClick={handleSearch}>
            <Search className='mr-2 h-4 w-4' />
            搜索
          </Button>
          <Button variant='outline' onClick={handleReset}>
            <RotateCcw className='mr-2 h-4 w-4' />
            重置
          </Button>
        </div>
      </div>

      {advancedFields.length > 0 && (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant='ghost' size='sm' className='gap-1'>
              高级搜索{' '}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='flex flex-wrap items-end gap-3 pt-3'>
              {advancedFields.map((field) => (
                <div key={field.name} className='space-y-1'>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      value={selectValue(field.name)}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className='w-[140px]'>
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value || EMPTY_SENTINEL}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      placeholder={field.label}
                      value={values[field.name] ?? ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className='w-[160px]'
                    />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
