/** Backend-aligned type definitions. Replaces mock data types. */

// ─── Shared enums / unions ────────────────────────────────

export type Carrier = '移动' | '联通' | '电信'
export type RecordStatus = '草稿' | '已报备' | '变更中' | '停用'
export type PortStatus = '空闲' | '使用中' | '停用' | '异常'
export type SubPortStatus = '空闲' | '已分配' | '已报备' | '停用'
export type ApiDataStatus = '待处理' | '已入库' | '校验失败' | '已忽略'

// ─── QualificationInfo ─────────────────────────────────────

export interface QualificationInfo {
  id: string
  // 企业信息
  enterprise_name: string
  cert_type: string | null
  cert_number: string | null
  app_platform_name: string | null
  // 法人
  legal_representative_name: string | null
  legal_representative_cert_type: string
  legal_representative_cert_number: string
  legal_representative_cert_address: string
  // 责任人
  responsible_name: string | null
  responsible_cert_type: string | null
  responsible_cert_number: string | null
  responsible_address: string | null
  responsible_phone: string | null
  // 经办人
  handler_name: string | null
  handler_cert_type: string | null
  handler_cert_number: string | null
  handler_address: string | null
  handler_phone: string | null
  // 签名与模板
  sms_signature: string | null
  signature_type: string | null
  signature_verified: boolean | null
  is_gateway_signature: boolean | null
  sms_template_content: string | null
  template_has_variable: boolean | null
  template_param_type: string | null
  template_param_length: string | null
  // 业务信息
  business_attribute: string | null
  business_type: string | null
  business_subtype: string | null
  specific_usage: string | null
  // 引流信息
  diversion_number: string | null
  diversion_number_type: string | null
  diversion_number_usage: string | null
  diversion_content: string | null
  link_address: string | null
  link_type: string | null
  created_at: string
  updated_at: string
}

export interface QualificationListResponse {
  data: QualificationInfo[]
  total: number
  page: number
  page_size: number
}

export interface BatchSignatureRequest {
  signatures: string[]
}

export interface BatchSignatureResponse {
  matched_qualifications: QualificationInfo[]
  unmatched_signatures: string[]
}

// ─── PortInfo ──────────────────────────────────────────────

export interface PortInfo {
  id: string
  carrier: string
  main_port_number: string
  enterprise_name: string
  sub_port_number: string | null
  port_range: string | null
  province: string | null
  city: string | null
  port_type: string
  operation_type: string
  port_activation_date: string | null
  allow_self_extension: boolean | null
  carrier_room: string
  enterprise_room: string
  has_authorization: boolean | null
  authorization_letter: string
  auth_start_date: string | null
  auth_end_date: string | null
  group_code: string
  region: string | null
  other_room_description: string | null
  is_green_channel: boolean | null
  blacklist_whitelist_type: string | null
  audit_form: string | null
  customer_type: string | null
  created_at: string
  updated_at: string
}

export interface PortInfoListResponse {
  data: PortInfo[]
  total: number
  page: number
  page_size: number
}

// ─── FilingRecord (nested, matching backend) ──────────────

export interface FilingRecord {
  id: string
  record_number: string
  status: string
  source_file: string | null
  import_batch: string | null
  port_info_id: string
  qualification_info_id: string
  operator_id: string | null
  created_at: string
  updated_at: string
  port_info: PortInfo | null
  qualification_info: QualificationInfo | null
  attachments?: FileAttachmentPublic[]
}

export interface FilingRecordListResponse {
  data: FilingRecord[]
  total: number
  page: number
  page_size: number
}

// ─── Dashboard ─────────────────────────────────────────────

export interface DashboardStats {
  total_records: number
  new_this_month: number
  updated_this_month: number
  incomplete: number
  expiring_soon: number
  main_port_count: number
  sub_port_count: number
}

export interface TrendDataPoint {
  date: string
  count: number
}

export interface CarrierDistribution {
  carrier: string
  count: number
}

export interface StatusDistribution {
  status: string
  count: number
}

// ─── Users ─────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  is_active: boolean
  is_superuser: boolean
  full_name: string | null
  role_id: string | null
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  data: User[]
  count: number
}

// ─── Roles ─────────────────────────────────────────────────

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface RoleListResponse {
  data: Role[]
  count: number
}

// ─── Login Logs ────────────────────────────────────────────

export interface LoginLog {
  id: string
  user_id: string
  user_email: string
  ip_address: string | null
  user_agent: string | null
  login_time: string
  success: boolean
}

export interface LoginLogListResponse {
  data: LoginLog[]
  count: number
}

// ─── Operation Logs ────────────────────────────────────────

export interface OperationLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  module: string | null
  detail: string | null
  result: string
  created_at: string
}

export interface OperationLogListResponse {
  data: OperationLog[]
  count: number
}

// ─── Ports (Main/Sub) ──────────────────────────────────────

export interface MainPort {
  id: string
  port_number: string
  carrier: string
  port_range: string | null
  province: string | null
  city: string | null
  port_type: string | null
  status: string
  sub_port_count: number
  created_at: string
  updated_at: string
}

export interface SubPort {
  id: string
  port_number: string
  main_port_id: string
  main_port_number: string
  carrier: string
  status: string
  created_at: string
  updated_at: string
}

export interface MainPortListResponse {
  data: MainPort[]
  total: number
  page: number
  page_size: number
}

export interface SubPortListResponse {
  data: SubPort[]
  total: number
  page: number
  page_size: number
}

// ─── API Access ────────────────────────────────────────────

export interface ApiAccessConfig {
  id: string
  name: string
  source_type: string | null
  endpoint: string | null
  auth_config: Record<string, unknown> | null
  field_mapping: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiAccessConfigListResponse {
  data: ApiAccessConfig[]
  count: number
}

export interface ApiAccessDataResponse {
  data: Record<string, unknown>[]
  total: number
  page: number
  page_size: number
  config: ApiAccessConfig
}

// ─── FilingTask ─────────────────────────────────────────────

export interface FilingTask {
  id: string
  task_name: string
  qualification_count: number
  port_count: number
  export_group_name: string
  group_by_field: string | null
  file_size: number | null
  operator_name: string
  created_at: string
  // detail only:
  qualification_ids?: string[]
  port_ids?: string[]
  file_path?: string | null
  download_url?: string | null
}

export interface FilingTasksResponse {
  data: FilingTask[]
  total: number
  page: number
  page_size: number
}

export interface CreateFilingTaskRequest {
  qualification_ids: string[]
  port_ids: string[]
  export_group_id: string
  group_by_field?: string | null
}

// ─── ExportGroup ─────────────────────────────────────────────

export interface ExportGroupField {
  id: string
  group_id: string
  field_name: string
  field_label: string
  sort_order: number
}

export interface ExportGroup {
  id: string
  name: string
  description: string | null
  fields: ExportGroupField[]
  created_at: string
  updated_at: string
}

export interface ExportGroupsResponse {
  data: ExportGroup[]
  count: number
}

// ─── Generic ───────────────────────────────────────────────

export interface MessageResponse {
  message: string
}

// ─── File Attachments ──────────────────────────────────────

export interface FileAttachmentPublic {
  id: string
  original_name: string
  stored_path: string
  file_size: number
  mime_type: string
  md5_hash: string
  entity_type: string
  entity_id: string
  field_name: string | null
  uploader_id: string | null
  created_at: string
}
