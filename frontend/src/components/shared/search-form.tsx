import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

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

export function SearchForm({ fields, onSearch, onReset }: SearchFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const basicFields = fields.filter((f) => !f.advanced)
  const advancedFields = fields.filter((f) => f.advanced)

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {basicFields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === 'select' ? (
              <Select
                value={values[field.name] ?? ''}
                onValueChange={(v) => handleChange(field.name, v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={`选择${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.name}
                placeholder={field.label}
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-[160px]"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 pb-0.5">
          <Button onClick={handleSearch}>搜索</Button>
          <Button variant="outline" onClick={handleReset}>重置</Button>
        </div>
      </div>

      {advancedFields.length > 0 && (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              高级搜索 <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-3">
              {advancedFields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      value={values[field.name] ?? ''}
                      onValueChange={(v) => handleChange(field.name, v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      placeholder={field.label}
                      value={values[field.name] ?? ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-[160px]"
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
