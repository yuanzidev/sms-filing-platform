// ============================================================
// Shared types — used by other mock data modules and handlers
// ============================================================

export type Carrier = '移动' | '联通' | '电信'
export type RecordStatus = '草稿' | '已报备' | '变更中' | '停用'
export type PortStatus = '空闲' | '使用中' | '停用' | '异常'
export type SubPortStatus = '空闲' | '已分配' | '已报备' | '停用'
export type ApiDataStatus = '待处理' | '已入库' | '校验失败' | '已忽略'

export interface FilingRecord {
  id: string
  record_number: string
  carrier: Carrier
  operation_type: string
  submit_unit: string
  source_file: string | null
  import_batch: string | null
  status: RecordStatus

  // Port
  main_port: string
  sub_port: string
  port_range: string
  port_type: string
  port_activation_date: string | null
  allow_self_extension: boolean

  // Region
  province: string
  city: string
  district: string

  // Enterprise
  enterprise_name: string
  cert_type: string
  cert_number: string
  customer_type: string
  group_code: string
  app_platform_name: string

  // Responsible person
  responsible_name: string
  responsible_cert_type: string
  responsible_cert_number: string
  responsible_cert_address: string
  responsible_phone: string

  // Handler
  handler_name: string
  handler_cert_type: string
  handler_cert_number: string
  handler_cert_address: string
  handler_phone: string

  // Authorization
  has_authorization: boolean
  auth_start_date: string | null
  auth_end_date: string | null
  auth_attachment: string | null
  contract_attachment: string | null

  // Business
  business_attribute: string
  business_type: string
  business_subtype: string
  carrier_original_biz_type: string
  specific_usage: string
  is_green_channel: boolean
  blacklist_type: string

  // Signature
  sms_signature: string
  signature_type: string
  signature_verified: boolean
  is_gateway_signature: boolean
  signature_attachment: string | null

  // Machine room
  carrier_room: string
  enterprise_room: string
  other_room: string

  // Templates (sub-table)
  templates: TemplateItem[]

  // Traffic diversion (sub-table)
  diversions: DiversionItem[]

  // Attachments
  attachments: AttachmentItem[]

  // Metadata
  created_at: string
  updated_at: string
  operator: string
}

export interface TemplateItem {
  id: string
  content: string
  has_variable: boolean
  param_type: string
  param_length: number
}

export interface DiversionItem {
  id: string
  content: string
  ratio: number
  number_type: string
  number: string
  number_usage: string
  link_type: string
  link_url: string
  attachment: string | null
}

export interface AttachmentItem {
  type: string
  label: string
  status: '未上传' | '已上传' | '缺失' | '格式异常'
  file_name?: string
  file_url?: string
}

// ============================================================
// Mock data generation utilities
// ============================================================

function pad(n: number, width: number = 4): string {
  return String(n).padStart(width, '0')
}

/** Format a Date as local YYYY-MM-DD string (avoids toISOString timezone shift) */
function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format a Date as local YYYY-MM-DD HH:mm:ss string */
function fmtDatetime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${fmtDate(d)} ${h}:${min}:${s}`
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return fmtDate(d)
}

function randomDatetime(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return fmtDatetime(d)
}

// ============================================================
// Helper data pools — realistic Chinese values
// ============================================================

const enterpriseNames: readonly string[] = [
  '北京华信科技有限公司',
  '上海鼎盛信息技术有限公司',
  '广州启航网络科技有限公司',
  '深圳前海数码科技有限公司',
  '杭州云端信息技术有限公司',
  '南京智控科技发展有限公司',
  '成都天府软件技术有限公司',
  '武汉长江数据科技有限公司',
  '苏州工业园区信息技术有限公司',
  '青岛海洋信息技术有限公司',
  '北京国信科技有限公司',
  '上海数联信息技术有限公司',
  '广州银联网络科技有限公司',
  '浙江网新科技有限公司',
  '江苏通服信息技术有限公司',
  '四川智联科技有限公司',
  '湖北中信网络技术有限公司',
  '山东浪潮云信息技术有限公司',
  '福建亿榕信息技术有限公司',
  '厦门巨龙信息科技有限公司',
  '北京中科汇联科技有限公司',
  '上海移远通信技术有限公司',
  '东莞华贝电子科技有限公司',
  '宁波均胜电子股份有限公司',
  '重庆中科云从科技有限公司',
  '天津智慧城市信息技术有限公司',
]

const regions: readonly { province: string; city: string; district: string }[] = [
  { province: '北京', city: '北京市', district: '朝阳区' },
  { province: '北京', city: '北京市', district: '海淀区' },
  { province: '上海', city: '上海市', district: '浦东新区' },
  { province: '上海', city: '上海市', district: '徐汇区' },
  { province: '广东', city: '广州市', district: '天河区' },
  { province: '广东', city: '深圳市', district: '南山区' },
  { province: '广东', city: '东莞市', district: '南城街道' },
  { province: '浙江', city: '杭州市', district: '西湖区' },
  { province: '浙江', city: '宁波市', district: '鄞州区' },
  { province: '浙江', city: '温州市', district: '鹿城区' },
  { province: '江苏', city: '南京市', district: '鼓楼区' },
  { province: '江苏', city: '苏州市', district: '姑苏区' },
  { province: '四川', city: '成都市', district: '高新区' },
  { province: '湖北', city: '武汉市', district: '东湖高新区' },
  { province: '山东', city: '济南市', district: '历下区' },
  { province: '山东', city: '青岛市', district: '市南区' },
  { province: '福建', city: '福州市', district: '鼓楼区' },
  { province: '福建', city: '厦门市', district: '思明区' },
  { province: '重庆', city: '重庆市', district: '渝北区' },
  { province: '天津', city: '天津市', district: '河西区' },
]

const certNumbers: readonly string[] = [
  '91110108MA01B5C82X',
  '91310115MA1H7N2P3Q',
  '91440101MA59GT2R7B',
  '91440300MA5D8K1L5M',
  '91330106MA27X9T4V1',
  '91320113MA1Y3F6B8N',
  '91510100MA6CR7W2D9',
  '91420100MA4K3P1E5K',
  '91320594MA1W6H8J3L',
  '91370212MA3E5R7T2M',
]

const carriers: readonly Carrier[] = ['移动', '联通', '电信']
const statusWeights: readonly RecordStatus[] = [
  '已报备', '已报备', '已报备', '已报备',
  '草稿', '草稿',
  '变更中',
  '停用',
]

const operationTypes: readonly string[] = [
  '新增报备', '变更报备', '续期报备', '注销报备',
]

const portTypes: readonly string[] = ['三网合一', '单网', '省内']
const businessAttributes: readonly string[] = ['自有业务', '外包业务', '转租业务']
const businessTypes: readonly string[] = ['验证码', '通知类', '营销类', '政务类']
const businessSubtypes: readonly string[] = ['行业短信', '公益短信', '金融通知', '物流通知', '政务通知', '会员营销']
const specificUsages: readonly string[] = ['用户注册验证', '订单通知', '物流提醒', '安全提醒', '政务公告', '营销推广']
const blacklistTypes: readonly string[] = ['正常', '低风险', '中风险', '高风险']

const certTypeOptions: readonly string[] = ['统一社会信用代码', '营业执照']
const customerTypeOptions: readonly string[] = ['企业', '个体工商户', '事业单位', '政府机构']

const signatureTypes: readonly string[] = ['全称签名', '简称签名', '个性化签名']
const sigAttachments: readonly (string | null)[] = [
  'signature/授权证明-华信.pdf',
  'signature/签名授权书-鼎盛.pdf',
  'signature/签名确认函-启航.pdf',
  'signature/授权委托书-前海数码.pdf',
  null,
  'signature/签名认证-云端信息.pdf',
]

const names: readonly string[] = [
  '张伟', '王芳', '李强', '刘洋', '陈静',
  '杨磊', '赵敏', '黄勇', '周洁', '吴超',
  '徐丽', '孙明', '马军', '朱婷', '胡波',
]

const idNumbers: readonly string[] = [
  '110101199001011234',
  '310104198505152345',
  '440301197807083456',
  '330102199203044567',
  '320501198610115678',
  '510107199112126789',
  '420106198309138901',
  '370202199004149012',
  '350102198705159123',
  '500105199206169234',
  '120101198811179345',
  '210103199307189456',
  '430104198209199567',
  '440305199110209678',
  '330302198412219789',
]

const phoneNumbers: readonly string[] = [
  '13900139001', '13800138002', '13700137003',
  '13600136004', '13500135005', '15900159006',
  '15800158007', '15700157008', '15000150009',
  '15100151010', '18600186011', '18500185012',
  '18800188013', '18700187014', '18900189015',
]

const mainPortNumbers: readonly string[] = [
  '10690001', '10690002', '10690003', '10690004', '10690005',
  '10660001', '10660002', '10660003', '10670001', '10670002',
]

const subPortNumbers: readonly string[] = [
  '10690001-001', '10690001-002', '10690001-003',
  '10690002-001', '10690002-002',
  '10690003-001', '10690003-002', '10690003-003',
  '10690004-001', '10690004-002',
  '10690005-001', '10690005-002', '10690005-003',
  '10660001-001', '10660001-002',
  '10660002-001', '10660002-002', '10660002-003',
  '10670001-001',
  '10670002-001', '10670002-002',
]

const roomNames: readonly string[] = [
  '移动机房门禁1', '联通机房A区', '电信数据中心3',
  '移动北京机房', '联通上海机房', '广州数据中心',
  '自建机房-主', '阿里云ECS', '腾讯云服务器',
]

const smsSignatures: readonly string[] = [
  '华信科技', '鼎盛信息', '启航网络', '前海数码',
  '云端服务', '智控科技', '天府软件', '长江数据',
  '园区信息', '海洋信息', '国信科技', '数联信息',
  '银联网络', '网新科技', '通服信息', '智联科技',
  '中信网络', '浪潮云', '亿榕信息', '巨龙信息',
]

// ============================================================
// Main generation function
// ============================================================

export function generateRecords(): FilingRecord[] {
  const records: FilingRecord[] = []
  const recCount = 48
  const today = new Date(2026, 6, 2) // 2026-07-02
  const sixMonthsAgo = new Date(2025, 12, 2) // 2026-01-02 (month 12 = Jan in 0-based)
  sixMonthsAgo.setMonth(today.getMonth() - 6)

  for (let i = 0; i < recCount; i++) {
    const region = regions[i % regions.length]
    const enterprise = enterpriseNames[i % enterpriseNames.length]
    const carrier = carriers[i % carriers.length]
    const status = statusWeights[i % statusWeights.length]
    const certNumber = certNumbers[i % certNumbers.length]

    const hasPort = i !== 0 // first record has no port (edge case)
    const hasTemplates = i !== 3 // record index 3 has no templates (edge case)
    const hasMissingAttachments = i === 2 // record index 2 has missing attachments (edge case)
    const isExpiringAuth = i === 1 // record index 1 has expiring auth (edge case)

    const mainPortIdx = i % mainPortNumbers.length
    const subPortIdx = i % subPortNumbers.length

    // Edge case: no port for record 0
    const mainPort = hasPort ? mainPortNumbers[mainPortIdx] : ''
    const subPort = hasPort ? subPortNumbers[subPortIdx] : ''
    const portRange = hasPort ? `${mainPort}/${subPort}` : ''

    const authStartDate = randomDate(sixMonthsAgo, today)
    let authEndDate: string | null
    if (isExpiringAuth) {
      // Expiring in 3 days
      const expiring = new Date(today)
      expiring.setDate(expiring.getDate() + 3)
      authEndDate = fmtDate(expiring)
    } else {
      authEndDate = randomDate(today, new Date(2027, 6, 2))
    }

    const createdDate = randomDatetime(sixMonthsAgo, today)
    const updatedDate = randomDatetime(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), today)

    const templateCount = hasTemplates ? (1 + (i % 3)) : 0
    const templates: TemplateItem[] = []
    for (let t = 0; t < templateCount; t++) {
      templates.push({
        id: `tmpl-${pad(i + 1)}-${pad(t + 1, 2)}`,
        content: [
          '您的验证码是${code}，请在${minutes}分钟内完成验证，切勿泄露给他人。',
          '尊敬的用户，您的订单${order_no}已发货，快递单号${express_no}，预计${date}送达。',
          '【${company}】您本次登录的验证码为${code}，如非本人操作请忽略。',
          '您好，${name}，您的账户于${time}在${device}登录，如有异常请及时修改密码。',
          '感谢您购买${product}，您的专属客服${service}将为您提供服务，联系电话${phone}。',
        ][t % 5],
        has_variable: true,
        param_type: ['数字', '字母数字混合', '中文'][t % 3],
        param_length: [4, 6, 8][t % 3],
      })
    }

    const diversionCount = i % 3 + 1
    const diversions: DiversionItem[] = []
    for (let d = 0; d < diversionCount; d++) {
      diversions.push({
        id: `div-${pad(i + 1)}-${pad(d + 1, 2)}`,
        content: `分流链接${d + 1} - ${enterprise.slice(0, 4)}`,
        ratio: Math.floor(100 / diversionCount),
        number_type: ['固话', '手机', '400'][d % 3],
        number: phoneNumbers[(i + d) % phoneNumbers.length],
        number_usage: ['售前咨询', '售后服务', '投诉建议'][d % 3],
        link_type: ['http', 'https', '微信'][d % 3],
        link_url: d === 0 ? `https://${enterprise.slice(0, 4).toLowerCase()}.com` : '',
        attachment: d === 1 ? `attachment/diversion-${pad(i + 1)}.pdf` : null,
      })
    }

    let attachments: AttachmentItem[]
    if (hasMissingAttachments) {
      attachments = [
        { type: 'authorization', label: '授权委托书', status: '缺失' },
        { type: 'contract', label: '合同文件', status: '已上传', file_name: '合同-华信科技.pdf', file_url: '/files/contract-002.pdf' },
        { type: 'signature', label: '签名确认函', status: '未上传' },
        { type: 'business', label: '营业执照', status: '已上传', file_name: '营业执照-华信科技.pdf', file_url: '/files/business-002.pdf' },
      ]
    } else {
      attachments = [
        {
          type: 'authorization',
          label: '授权委托书',
          status: i % 4 === 3 ? '未上传' : '已上传',
          ...(i % 4 !== 3 ? { file_name: `授权书-${pad(i + 1)}.pdf`, file_url: `/files/auth-${pad(i + 1)}.pdf` } : {}),
        },
        {
          type: 'contract',
          label: '合同文件',
          status: i % 5 === 4 ? '缺失' : '已上传',
          ...(i % 5 !== 4 ? { file_name: `合同-${pad(i + 1)}.pdf`, file_url: `/files/contract-${pad(i + 1)}.pdf` } : {}),
        },
        {
          type: 'signature',
          label: '签名确认函',
          status: i % 6 === 5 ? '格式异常' : '已上传',
          ...(i % 6 !== 5 ? { file_name: `签名-${pad(i + 1)}.pdf`, file_url: `/files/sig-${pad(i + 1)}.pdf` } : {}),
        },
        {
          type: 'business',
          label: '营业执照',
          status: '已上传',
          file_name: `营业执照-${pad(i + 1)}.pdf`,
          file_url: `/files/biz-${pad(i + 1)}.pdf`,
        },
      ]
    }

    const responsiblePerson = names[i % names.length]
    const handlerPerson = names[(i + 5) % names.length]

    records.push({
      id: `rec-${pad(i + 1)}`,
      record_number: `REC-20260702-${pad(i + 1)}`,
      carrier,
      operation_type: operationTypes[i % operationTypes.length],
      submit_unit: enterprise,
      source_file: i % 7 === 6 ? null : `import/${pad(i + 1)}.xlsx`,
      import_batch: i % 7 === 6 ? null : `BATCH-2026${pad(i % 12 + 1, 2)}`,
      status,

      // Port
      main_port: mainPort,
      sub_port: subPort,
      port_range: portRange,
      port_type: portTypes[i % portTypes.length],
      port_activation_date: hasPort ? randomDate(sixMonthsAgo, today) : null,
      allow_self_extension: i % 2 === 0,

      // Region
      province: region.province,
      city: region.city,
      district: region.district,

      // Enterprise
      enterprise_name: enterprise,
      cert_type: certTypeOptions[i % certTypeOptions.length],
      cert_number: certNumber,
      customer_type: customerTypeOptions[i % customerTypeOptions.length],
      group_code: `G${String(1000 + i)}`,
      app_platform_name: `${enterprise.slice(0, 4)}APP`,

      // Responsible person
      responsible_name: responsiblePerson,
      responsible_cert_type: '居民身份证',
      responsible_cert_number: idNumbers[i % idNumbers.length],
      responsible_cert_address: `${region.province}${region.city}${region.district}${['科技园路1号', '创新大厦12层', '信息产业园B区', '商务中心3栋'][i % 4]}`,
      responsible_phone: phoneNumbers[i % phoneNumbers.length],

      // Handler
      handler_name: handlerPerson,
      handler_cert_type: '居民身份证',
      handler_cert_number: idNumbers[(i + 3) % idNumbers.length],
      handler_cert_address: `${region.province}${region.city}${['金融街88号', '开发区创业路22号', '高新区火炬大厦', '软件园二期'][i % 4]}`,
      handler_phone: phoneNumbers[(i + 7) % phoneNumbers.length],

      // Authorization
      has_authorization: i !== 3, // record index 3 has no auth
      auth_start_date: authStartDate,
      auth_end_date: authEndDate,
      auth_attachment: i % 8 === 7 ? null : `attachment/auth-${pad(i + 1)}.pdf`,
      contract_attachment: i % 9 === 8 ? null : `attachment/contract-${pad(i + 1)}.pdf`,

      // Business
      business_attribute: businessAttributes[i % businessAttributes.length],
      business_type: businessTypes[i % businessTypes.length],
      business_subtype: businessSubtypes[i % businessSubtypes.length],
      carrier_original_biz_type: `${carrier}${businessTypes[i % businessTypes.length]}`,
      specific_usage: specificUsages[i % specificUsages.length],
      is_green_channel: i % 5 === 4,
      blacklist_type: blacklistTypes[i % blacklistTypes.length],

      // Signature
      sms_signature: smsSignatures[i % smsSignatures.length],
      signature_type: signatureTypes[i % signatureTypes.length],
      signature_verified: i % 4 !== 3,
      is_gateway_signature: i % 6 < 2,
      signature_attachment: sigAttachments[i % sigAttachments.length],

      // Machine room
      carrier_room: roomNames[i % roomNames.length],
      enterprise_room: roomNames[(i + 3) % roomNames.length],
      other_room: i % 5 === 4 ? '' : roomNames[(i + 6) % roomNames.length],

      // Templates
      templates,

      // Traffic diversion
      diversions,

      // Attachments
      attachments,

      // Metadata
      created_at: createdDate,
      updated_at: updatedDate,
      operator: names[(i + 2) % names.length],
    })
  }

  return records
}

// Pre-generated singleton for use by handlers
export const mockRecords = generateRecords()
