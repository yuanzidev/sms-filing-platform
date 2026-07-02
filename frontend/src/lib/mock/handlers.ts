import { http, HttpResponse } from 'msw'

import type { FilingRecord } from './data/records'
import { mockRecords } from './data/records'
import { mainPorts, subPorts } from './data/ports'
import { dashboardStats, generateTrendData, carrierDistribution } from './data/dashboard'
import { apiDataItems } from './data/api-data'
import type { ApiDataItem } from './data/api-data'
import { paginate } from './utils'

// ============================================================
// Mutable copies for CRUD operations
// ============================================================

const records: FilingRecord[] = [...mockRecords]
const apiData: ApiDataItem[] = [...apiDataItems]

// ============================================================
// Helpers
// ============================================================

function fmtDatetime(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, '0')
}

function nextRecordId(): string {
  let max = 0
  for (const r of records) {
    const num = parseInt(r.id.replace('rec-', ''), 10)
    if (num > max) max = num
  }
  return `rec-${pad(max + 1)}`
}

// ============================================================
// Handlers
// ============================================================

export const handlers = [
  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------
  http.get('/api/v1/dashboard/stats', () => {
    return HttpResponse.json(dashboardStats)
  }),

  http.get('/api/v1/dashboard/trends', ({ request }) => {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30', 10)
    return HttpResponse.json(generateTrendData(days))
  }),

  http.get('/api/v1/dashboard/carrier-distribution', () => {
    return HttpResponse.json(carrierDistribution)
  }),

  // --------------------------------------------------
  // Records
  // --------------------------------------------------
  http.get('/api/v1/records', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)

    let filtered = [...records]

    // Substring/text filters
    const enterprise_name = url.searchParams.get('enterprise_name')
    if (enterprise_name) {
      filtered = filtered.filter((r) =>
        r.enterprise_name.includes(enterprise_name),
      )
    }
    const sms_signature = url.searchParams.get('sms_signature')
    if (sms_signature) {
      filtered = filtered.filter((r) =>
        r.sms_signature.includes(sms_signature),
      )
    }

    // Exact match filters
    const main_port = url.searchParams.get('main_port')
    if (main_port) filtered = filtered.filter((r) => r.main_port === main_port)

    const sub_port = url.searchParams.get('sub_port')
    if (sub_port) filtered = filtered.filter((r) => r.sub_port === sub_port)

    const carrier = url.searchParams.get('carrier')
    if (carrier) filtered = filtered.filter((r) => r.carrier === carrier)

    const status = url.searchParams.get('status')
    if (status) filtered = filtered.filter((r) => r.status === status)

    return HttpResponse.json(paginate(filtered, page, pageSize))
  }),

  http.get('/api/v1/records/:id', ({ params }) => {
    const record = records.find((r) => r.id === params.id)
    if (!record) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(record)
  }),

  http.post('/api/v1/records', async ({ request }) => {
    const body = (await request.json()) as Partial<FilingRecord>
    const now = fmtDatetime(new Date())
    const newRecord: FilingRecord = {
      templates: [],
      diversions: [],
      attachments: [],
      ...body,
      id: nextRecordId(),
      record_number:
        body.record_number ||
        `REC-${now.slice(0, 10).replace(/-/g, '')}-${pad(records.length + 1)}`,
      created_at: now,
      updated_at: now,
    } as FilingRecord
    records.push(newRecord)
    return HttpResponse.json(newRecord, { status: 201 })
  }),

  http.patch('/api/v1/records/:id', async ({ params, request }) => {
    const idx = records.findIndex((r) => r.id === params.id)
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    const body = (await request.json()) as Partial<FilingRecord>
    records[idx] = {
      ...records[idx],
      ...body,
      updated_at: fmtDatetime(new Date()),
    }
    return HttpResponse.json(records[idx])
  }),

  http.delete('/api/v1/records/:id', ({ params }) => {
    const idx = records.findIndex((r) => r.id === params.id)
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    records.splice(idx, 1)
    return HttpResponse.json({ message: 'deleted' })
  }),

  // --------------------------------------------------
  // Ports
  // --------------------------------------------------
  http.get('/api/v1/ports/main', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)
    return HttpResponse.json(paginate(mainPorts, page, pageSize))
  }),

  http.get('/api/v1/ports/main/:id', ({ params }) => {
    const port = mainPorts.find((p) => p.id === params.id)
    if (!port) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(port)
  }),

  http.get('/api/v1/ports/sub', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)
    return HttpResponse.json(paginate(subPorts, page, pageSize))
  }),

  http.get('/api/v1/ports/sub/:id', ({ params }) => {
    const port = subPorts.find((p) => p.id === params.id)
    if (!port) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(port)
  }),

  // --------------------------------------------------
  // API Data
  // --------------------------------------------------
  http.get('/api/v1/api-data', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)

    let filtered = [...apiData]
    const status = url.searchParams.get('status')
    if (status) {
      filtered = filtered.filter((item) => item.status === status)
    }

    return HttpResponse.json(paginate(filtered, page, pageSize))
  }),

  http.patch('/api/v1/api-data/:id', async ({ params, request }) => {
    const idx = apiData.findIndex((item) => item.id === params.id)
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    const body = (await request.json()) as Partial<ApiDataItem>
    apiData[idx] = { ...apiData[idx], ...body }
    return HttpResponse.json(apiData[idx])
  }),
]
