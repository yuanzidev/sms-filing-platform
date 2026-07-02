export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  }
}

export function filterBySearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  query: string
): T[] {
  if (!query) return items
  const lower = query.toLowerCase()
  return items.filter((item) =>
    searchFields.some((field) => {
      const val = item[field]
      return val != null && String(val).toLowerCase().includes(lower)
    })
  )
}

export function filterByFields<T>(
  items: T[],
  filters: Partial<Record<keyof T, unknown>>
): T[] {
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true
      return item[key as keyof T] === value
    })
  )
}

export function sortByField<T>(
  items: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return order === 'asc' ? -1 : 1
    if (av > bv) return order === 'asc' ? 1 : -1
    return 0
  })
}
