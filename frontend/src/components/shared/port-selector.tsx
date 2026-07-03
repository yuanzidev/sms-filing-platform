import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getMainPorts } from '@/lib/api/ports'

interface PortSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  carrier?: string
}

export function PortSelector({
  value,
  onChange,
  placeholder = '请选择端口',
  carrier,
}: PortSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['main-ports', { carrier, page_size: 100 }],
    queryFn: () => getMainPorts({ carrier, page_size: 100 }),
  })
  const ports = data?.data ?? []

  const filtered = search
    ? ports.filter((p) => p.port_number.includes(search))
    : ports

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索端口号..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>未找到端口</CommandEmpty>
            <CommandGroup>
              {filtered.map((port) => (
                <CommandItem
                  key={port.id}
                  value={port.port_number}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === port.port_number ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{port.port_number}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {port.carrier} {port.province}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
