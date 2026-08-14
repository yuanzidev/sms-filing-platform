import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const START_MONTH = new Date(2000, 0)
const END_MONTH = new Date(new Date().getFullYear() + 10, 11)

function parseDateValue(value?: string) {
  if (!value) return undefined

  const [year, month, day] = value.replace(/\//g, "-").split("-").map(Number)
  if (year && month && day) {
    return new Date(year, month - 1, day)
  }

  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? undefined : fallback
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DatePicker({ value, onChange, placeholder = "选择日期", className }: DatePickerProps) {
  const date = parseDateValue(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateValue(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          captionLayout="dropdown"
          navLayout="after"
          mode="single"
          startMonth={START_MONTH}
          endMonth={END_MONTH}
          defaultMonth={date}
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(formatDateValue(d))
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
