// In-memory mutable store for static/demo mode.
// All CRUD operations mutate this store; pages import directly instead of using react-query hooks.

import { mockRecords, type FilingRecord } from './data/records'
import { mainPorts, subPorts, type MainPort, type SubPort } from './data/ports'
import { apiDataItems } from './data/api-data'

// ============================================================
// Records store
// ============================================================

let records: FilingRecord[] = structuredClone(mockRecords)

let nextRecordNum = records.length + 1

export function getRecords(filters: Record<string, string>, page: number, pageSize: number) {
  let filtered = records

  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === '') continue
    const v = value.toLowerCase()
    filtered = filtered.filter((r) => {
      const field = (r as unknown as Record<string, unknown>)[key]
      return typeof field === 'string' && field.toLowerCase().includes(v)
    })
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)

  return { data, total }
}

export function getRecord(id: string): FilingRecord | undefined {
  return records.find((r) => r.id === id)
}

export function createRecord(input: Record<string, unknown>): FilingRecord {
  const id = `rec-${String(nextRecordNum++).padStart(4, '0')}`
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const record: FilingRecord = {
    id,
    record_number: `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextRecordNum - 1).padStart(4, '0')}`,
    carrier: (input.carrier as FilingRecord['carrier']) ?? '移动',
    operation_type: (input.operation_type as string) ?? '新增报备',
    submit_unit: (input.enterprise_name as string) ?? '',
    source_file: null,
    import_batch: null,
    status: (input.status as FilingRecord['status']) ?? '草稿',
    main_port: (input.main_port as string) ?? '',
    sub_port: (input.sub_port as string) ?? '',
    port_range: '',
    port_type: (input.port_type as string) ?? '',
    port_activation_date: (input.port_activation_date as string) ?? null,
    allow_self_extension: (input.allow_self_extension as boolean) ?? false,
    province: (input.province as string) ?? '',
    city: (input.city as string) ?? '',
    district: (input.district as string) ?? '',
    enterprise_name: (input.enterprise_name as string) ?? '',
    cert_type: (input.cert_type as string) ?? '',
    cert_number: (input.cert_number as string) ?? '',
    customer_type: (input.customer_type as string) ?? '',
    group_code: (input.group_code as string) ?? '',
    app_platform_name: (input.app_platform_name as string) ?? '',
    responsible_name: (input.responsible_name as string) ?? '',
    responsible_cert_type: (input.responsible_cert_type as string) ?? '',
    responsible_cert_number: (input.responsible_cert_number as string) ?? '',
    responsible_cert_address: (input.responsible_cert_address as string) ?? '',
    responsible_phone: (input.responsible_phone as string) ?? '',
    handler_name: (input.handler_name as string) ?? '',
    handler_cert_type: (input.handler_cert_type as string) ?? '',
    handler_cert_number: (input.handler_cert_number as string) ?? '',
    handler_cert_address: (input.handler_cert_address as string) ?? '',
    handler_phone: (input.handler_phone as string) ?? '',
    has_authorization: (input.has_authorization as boolean) ?? false,
    auth_start_date: (input.auth_start_date as string) ?? null,
    auth_end_date: (input.auth_end_date as string) ?? null,
    auth_attachment: null,
    contract_attachment: null,
    business_attribute: (input.business_attribute as string) ?? '',
    business_type: (input.business_type as string) ?? '',
    business_subtype: (input.business_subtype as string) ?? '',
    carrier_original_biz_type: '',
    specific_usage: (input.specific_usage as string) ?? '',
    is_green_channel: false,
    blacklist_type: (input.blacklist_type as string) ?? '正常',
    sms_signature: (input.sms_signature as string) ?? '',
    signature_type: (input.signature_type as string) ?? '',
    signature_verified: false,
    is_gateway_signature: false,
    signature_attachment: null,
    carrier_room: (input.carrier_room as string) ?? '',
    enterprise_room: (input.enterprise_room as string) ?? '',
    other_room: '',
    templates: (input.templates as FilingRecord['templates']) ?? [],
    diversions: (input.diversions as FilingRecord['diversions']) ?? [],
    attachments: (input.attachments as FilingRecord['attachments']) ?? [],
    created_at: now,
    updated_at: now,
    operator: '当前用户',
  }
  records.unshift(record)
  return record
}

export function updateRecord(id: string, input: Record<string, unknown>): FilingRecord | undefined {
  const idx = records.findIndex((r) => r.id === id)
  if (idx === -1) return undefined
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  records[idx] = { ...records[idx], ...input, updated_at: now } as FilingRecord
  return records[idx]
}

export function deleteRecord(id: string): boolean {
  const idx = records.findIndex((r) => r.id === id)
  if (idx === -1) return false
  records.splice(idx, 1)
  return true
}

// ============================================================
// Ports — direct access from static arrays
// ============================================================

export function getMainPorts(filters: Record<string, string>, page: number, pageSize: number) {
  let filtered = [...mainPorts]

  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === '') continue
    const v = value.toLowerCase()
    filtered = filtered.filter((p) => {
      const field = (p as unknown as Record<string, unknown>)[key]
      return typeof field === 'string' && field.toLowerCase().includes(v)
    })
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)

  return { data, total }
}

export function getMainPort(id: string): MainPort | undefined {
  return mainPorts.find((p) => p.id === id)
}

export function getSubPorts(filters: Record<string, string>, page: number, pageSize: number) {
  let filtered = [...subPorts]

  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === '') continue
    if (key === 'main_port_id') {
      filtered = filtered.filter((p) => p.main_port_id === value)
      continue
    }
    const v = value.toLowerCase()
    filtered = filtered.filter((p) => {
      const field = (p as unknown as Record<string, unknown>)[key]
      return typeof field === 'string' && field.toLowerCase().includes(v)
    })
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)

  return { data, total }
}

export function getSubPort(id: string): SubPort | undefined {
  return subPorts.find((p) => p.id === id)
}

// ============================================================
// API Data — direct access from static arrays
// ============================================================

export function getApiData(filters: Record<string, string>, page: number, pageSize: number) {
  let filtered = [...apiDataItems] as unknown as Record<string, unknown>[]

  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === '') continue
    const v = value.toLowerCase()
    filtered = filtered.filter((item) => {
      const field = item[key]
      return typeof field === 'string' && field.toLowerCase().includes(v)
    })
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)

  return { data, total }
}
