// Time formatting utilities for consistent timezone handling across the app.
// Backend stores UTC timestamps (often without timezone info). We normalize
// all API datetime strings as UTC and render them in Asia/Shanghai by default.

const TZ_SHANGHAI = 'Asia/Shanghai'

// Detects if an ISO-like string already has timezone info (Z or +hh:mm/-hh:mm)
function hasTimeZoneInfo(s: string): boolean {
  return /[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)
}

// Normalize common API datetime strings to a full ISO string with UTC 'Z'.
// - Accepts formats like 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', with/without ms
// - If timezone part is missing, assume the string is UTC and append 'Z'.
// - If only date is provided, assume midnight 00:00:00 UTC.
function normalizeToUtcIsoString(input: string): string {
  let s = input.trim()
  if (!s) return s
  // Replace space between date and time with 'T' to be ISO-compliant
  if (/^\d{4}-\d{2}-\d{2} /.test(s)) {
    s = s.replace(' ', 'T')
  }
  // If only date part provided
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    s = `${s}T00:00:00`
  }
  // If there's no timezone information, treat as UTC
  if (!hasTimeZoneInfo(s)) {
    s = `${s}Z`
  }
  return s
}

// Parse API date input into a Date representing the instant in time.
// - String inputs without TZ are treated as UTC.
export function parseApiDate(input: string | Date): Date {
  if (input instanceof Date) return input
  const iso = normalizeToUtcIsoString(input)
  const d = new Date(iso)
  return d
}

// Format a Date in a specific IANA timezone using Intl and formatToParts.
function formatInTimeZone(
  date: Date,
  options: {
    timeZone?: string
    withSeconds?: boolean
    dateOnly?: boolean
  } = {}
): string {
  const { timeZone = TZ_SHANGHAI, withSeconds = false, dateOnly = false } = options
  const intl = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: dateOnly ? undefined : '2-digit',
    minute: dateOnly ? undefined : '2-digit',
    second: dateOnly ? undefined : withSeconds ? '2-digit' : undefined,
    hour12: false,
  })
  const parts = intl.formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  const yyyy = get('year')
  const MM = get('month').padStart(2, '0')
  const dd = get('day').padStart(2, '0')
  if (dateOnly) {
    return `${yyyy}-${MM}-${dd}`
  }
  const HH = get('hour').padStart(2, '0')
  const mm = get('minute').padStart(2, '0')
  const ss = get('second') ? get('second').padStart(2, '0') : ''
  return withSeconds ? `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}` : `${yyyy}-${MM}-${dd} ${HH}:${mm}`
}

// Public helpers

export function formatCN(
  input: string | Date | null | undefined,
  options: { withSeconds?: boolean; dateOnly?: boolean; timeZone?: string } = {}
): string {
  if (!input) return '-'
  const date = parseApiDate(input)
  if (isNaN(date.getTime())) return '-'
  return formatInTimeZone(date, options)
}

export const time = {
  parseApiDate,
  formatCN,
}

export default time
