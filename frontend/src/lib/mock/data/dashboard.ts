// ============================================================
// Dashboard statistics and data generation
// ============================================================

import type { Carrier } from './records'

export const dashboardStats = {
  total_records: 48,
  new_this_month: 12,
  updated_this_month: 7,
  incomplete: 5,
  expiring_soon: 3,
  with_ports: 35,
}

/**
 * Generate trend data for the last N days.
 * Returns an array of { date, count } objects with realistic variation.
 */
export function generateTrendData(days: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = []
  const today = new Date(2026, 6, 2) // 2026-07-02
  const baseCount = 3

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)

    // Realistic variation with weekday pattern (more on weekdays, fewer on weekends)
    const dayOfWeek = date.getDay()
    const weekdayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1.0

    // Introduce some randomness
    const randomFactor = 0.5 + Math.random() * 1.0

    // Occasional spikes
    const spike = Math.random() < 0.05 ? 5 + Math.random() * 8 : 0

    const count = Math.round((baseCount + Math.random() * 4) * weekdayFactor * randomFactor + spike)

    result.push({ date: dateStr, count })
  }

  return result
}

export const carrierDistribution: { carrier: Carrier; count: number }[] = [
  { carrier: '移动', count: 20 },
  { carrier: '联通', count: 15 },
  { carrier: '电信', count: 13 },
]

export const statusDistribution: { status: string; count: number }[] = [
  { status: '已报备', count: 24 },
  { status: '草稿', count: 12 },
  { status: '变更中', count: 7 },
  { status: '停用', count: 5 },
]
