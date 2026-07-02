import type { Carrier, PortStatus, SubPortStatus } from './records'

// ============================================================
// Port types
// ============================================================

export interface MainPort {
  id: string
  port_number: string
  carrier: Carrier
  port_range: string
  province: string
  city: string
  port_type: string
  status: PortStatus
  sub_port_count: number
  created_at: string
}

export interface SubPort {
  id: string
  port_number: string
  main_port_id: string
  main_port_number: string
  carrier: Carrier
  enterprise_name: string
  sms_signature: string
  business_type: string
  status: SubPortStatus
  record_number: string | null
  updated_at: string
}

// ============================================================
// Static mock data
// ============================================================

export const mainPorts: MainPort[] = [
  {
    id: 'mp-001',
    port_number: '10690001',
    carrier: '移动',
    port_range: '10690001/10690001-001~003',
    province: '北京',
    city: '北京市',
    port_type: '三网合一',
    status: '使用中',
    sub_port_count: 3,
    created_at: '2025-08-15 09:00:00',
  },
  {
    id: 'mp-002',
    port_number: '10690002',
    carrier: '移动',
    port_range: '10690002/10690002-001~002',
    province: '广东',
    city: '广州市',
    port_type: '三网合一',
    status: '使用中',
    sub_port_count: 2,
    created_at: '2025-09-20 10:30:00',
  },
  {
    id: 'mp-003',
    port_number: '10690003',
    carrier: '联通',
    port_range: '10690003/10690003-001~003',
    province: '上海',
    city: '上海市',
    port_type: '单网',
    status: '使用中',
    sub_port_count: 3,
    created_at: '2025-10-01 14:00:00',
  },
  {
    id: 'mp-004',
    port_number: '10690004',
    carrier: '联通',
    port_range: '10690004/10690004-001~002',
    province: '浙江',
    city: '杭州市',
    port_type: '单网',
    status: '空闲',
    sub_port_count: 2,
    created_at: '2025-11-10 08:00:00',
  },
  {
    id: 'mp-005',
    port_number: '10690005',
    carrier: '电信',
    port_range: '10690005/10690005-001~003',
    province: '江苏',
    city: '南京市',
    port_type: '三网合一',
    status: '使用中',
    sub_port_count: 3,
    created_at: '2025-12-05 11:00:00',
  },
  {
    id: 'mp-006',
    port_number: '10660001',
    carrier: '电信',
    port_range: '10660001/10660001-001~002',
    province: '四川',
    city: '成都市',
    port_type: '省内',
    status: '使用中',
    sub_port_count: 2,
    created_at: '2026-01-15 09:30:00',
  },
  {
    id: 'mp-007',
    port_number: '10660002',
    carrier: '移动',
    port_range: '10660002/10660002-001~003',
    province: '湖北',
    city: '武汉市',
    port_type: '省内',
    status: '停用',
    sub_port_count: 3,
    created_at: '2026-02-01 13:00:00',
  },
  {
    id: 'mp-008',
    port_number: '10670001',
    carrier: '联通',
    port_range: '10670001/10670001-001',
    province: '山东',
    city: '济南市',
    port_type: '省内',
    status: '空闲',
    sub_port_count: 1,
    created_at: '2026-03-10 10:00:00',
  },
  {
    id: 'mp-009',
    port_number: '10670002',
    carrier: '电信',
    port_range: '10670002/10670002-001~002',
    province: '福建',
    city: '福州市',
    port_type: '省内',
    status: '异常',
    sub_port_count: 2,
    created_at: '2026-04-20 15:00:00',
  },
  {
    id: 'mp-010',
    port_number: '10690006',
    carrier: '移动',
    port_range: '10690006/待分配',
    province: '北京',
    city: '北京市',
    port_type: '三网合一',
    status: '空闲',
    sub_port_count: 0,
    created_at: '2026-05-01 08:30:00',
  },
]

export const subPorts: SubPort[] = [
  // mp-001 sub-ports (移动)
  {
    id: 'sp-001',
    port_number: '10690001-001',
    main_port_id: 'mp-001',
    main_port_number: '10690001',
    carrier: '移动',
    enterprise_name: '北京华信科技有限公司',
    sms_signature: '华信科技',
    business_type: '验证码',
    status: '已报备',
    record_number: 'REC-20260702-0001',
    updated_at: '2026-06-15 10:00:00',
  },
  {
    id: 'sp-002',
    port_number: '10690001-002',
    main_port_id: 'mp-001',
    main_port_number: '10690001',
    carrier: '移动',
    enterprise_name: '北京国信科技有限公司',
    sms_signature: '国信科技',
    business_type: '通知类',
    status: '已报备',
    record_number: 'REC-20260702-0011',
    updated_at: '2026-06-20 14:30:00',
  },
  {
    id: 'sp-003',
    port_number: '10690001-003',
    main_port_id: 'mp-001',
    main_port_number: '10690001',
    carrier: '移动',
    enterprise_name: '北京中科汇联科技有限公司',
    sms_signature: '中科汇联',
    business_type: '营销类',
    status: '空闲',
    record_number: null,
    updated_at: '2026-05-10 09:00:00',
  },

  // mp-002 sub-ports (移动)
  {
    id: 'sp-004',
    port_number: '10690002-001',
    main_port_id: 'mp-002',
    main_port_number: '10690002',
    carrier: '移动',
    enterprise_name: '广州启航网络科技有限公司',
    sms_signature: '启航网络',
    business_type: '验证码',
    status: '已报备',
    record_number: 'REC-20260702-0003',
    updated_at: '2026-06-18 11:00:00',
  },
  {
    id: 'sp-005',
    port_number: '10690002-002',
    main_port_id: 'mp-002',
    main_port_number: '10690002',
    carrier: '移动',
    enterprise_name: '广州银联网络科技有限公司',
    sms_signature: '银联网络',
    business_type: '通知类',
    status: '已分配',
    record_number: null,
    updated_at: '2026-06-25 16:00:00',
  },

  // mp-003 sub-ports (联通)
  {
    id: 'sp-006',
    port_number: '10690003-001',
    main_port_id: 'mp-003',
    main_port_number: '10690003',
    carrier: '联通',
    enterprise_name: '上海鼎盛信息技术有限公司',
    sms_signature: '鼎盛信息',
    business_type: '验证码',
    status: '已报备',
    record_number: 'REC-20260702-0002',
    updated_at: '2026-06-12 13:00:00',
  },
  {
    id: 'sp-007',
    port_number: '10690003-002',
    main_port_id: 'mp-003',
    main_port_number: '10690003',
    carrier: '联通',
    enterprise_name: '上海数联信息技术有限公司',
    sms_signature: '数联信息',
    business_type: '通知类',
    status: '已报备',
    record_number: 'REC-20260702-0012',
    updated_at: '2026-06-22 15:00:00',
  },
  {
    id: 'sp-008',
    port_number: '10690003-003',
    main_port_id: 'mp-003',
    main_port_number: '10690003',
    carrier: '联通',
    enterprise_name: '上海移远通信技术有限公司',
    sms_signature: '移远通信',
    business_type: '营销类',
    status: '停用',
    record_number: 'REC-20260702-0022',
    updated_at: '2026-05-30 10:00:00',
  },

  // mp-004 sub-ports (联通)
  {
    id: 'sp-009',
    port_number: '10690004-001',
    main_port_id: 'mp-004',
    main_port_number: '10690004',
    carrier: '联通',
    enterprise_name: '浙江网新科技有限公司',
    sms_signature: '网新科技',
    business_type: '政务类',
    status: '空闲',
    record_number: null,
    updated_at: '2026-04-01 08:00:00',
  },
  {
    id: 'sp-010',
    port_number: '10690004-002',
    main_port_id: 'mp-004',
    main_port_number: '10690004',
    carrier: '联通',
    enterprise_name: '杭州云端信息技术有限公司',
    sms_signature: '云端服务',
    business_type: '通知类',
    status: '已分配',
    record_number: null,
    updated_at: '2026-06-28 09:30:00',
  },

  // mp-005 sub-ports (电信)
  {
    id: 'sp-011',
    port_number: '10690005-001',
    main_port_id: 'mp-005',
    main_port_number: '10690005',
    carrier: '电信',
    enterprise_name: '南京智控科技发展有限公司',
    sms_signature: '智控科技',
    business_type: '验证码',
    status: '已报备',
    record_number: 'REC-20260702-0006',
    updated_at: '2026-06-10 11:30:00',
  },
  {
    id: 'sp-012',
    port_number: '10690005-002',
    main_port_id: 'mp-005',
    main_port_number: '10690005',
    carrier: '电信',
    enterprise_name: '苏州工业园区信息技术有限公司',
    sms_signature: '园区信息',
    business_type: '通知类',
    status: '已报备',
    record_number: 'REC-20260702-0009',
    updated_at: '2026-06-14 14:00:00',
  },
  {
    id: 'sp-013',
    port_number: '10690005-003',
    main_port_id: 'mp-005',
    main_port_number: '10690005',
    carrier: '电信',
    enterprise_name: '江苏通服信息技术有限公司',
    sms_signature: '通服信息',
    business_type: '营销类',
    status: '空闲',
    record_number: null,
    updated_at: '2026-03-20 10:00:00',
  },

  // mp-006 sub-ports (电信)
  {
    id: 'sp-014',
    port_number: '10660001-001',
    main_port_id: 'mp-006',
    main_port_number: '10660001',
    carrier: '电信',
    enterprise_name: '成都天府软件技术有限公司',
    sms_signature: '天府软件',
    business_type: '验证码',
    status: '已报备',
    record_number: 'REC-20260702-0007',
    updated_at: '2026-06-08 09:00:00',
  },
  {
    id: 'sp-015',
    port_number: '10660001-002',
    main_port_id: 'mp-006',
    main_port_number: '10660001',
    carrier: '电信',
    enterprise_name: '四川智联科技有限公司',
    sms_signature: '智联科技',
    business_type: '通知类',
    status: '已分配',
    record_number: null,
    updated_at: '2026-06-30 17:00:00',
  },

  // mp-007 sub-ports (移动)
  {
    id: 'sp-016',
    port_number: '10660002-001',
    main_port_id: 'mp-007',
    main_port_number: '10660002',
    carrier: '移动',
    enterprise_name: '武汉长江数据科技有限公司',
    sms_signature: '长江数据',
    business_type: '通知类',
    status: '停用',
    record_number: 'REC-20260702-0008',
    updated_at: '2026-04-15 10:00:00',
  },
  {
    id: 'sp-017',
    port_number: '10660002-002',
    main_port_id: 'mp-007',
    main_port_number: '10660002',
    carrier: '移动',
    enterprise_name: '湖北中信网络技术有限公司',
    sms_signature: '中信网络',
    business_type: '政务类',
    status: '停用',
    record_number: 'REC-20260702-0015',
    updated_at: '2026-05-01 08:00:00',
  },
  {
    id: 'sp-018',
    port_number: '10660002-003',
    main_port_id: 'mp-007',
    main_port_number: '10660002',
    carrier: '移动',
    enterprise_name: '武汉长江数据科技有限公司',
    sms_signature: '长江数据',
    business_type: '营销类',
    status: '已分配',
    record_number: null,
    updated_at: '2026-06-01 11:00:00',
  },

  // mp-008 sub-ports (联通)
  {
    id: 'sp-019',
    port_number: '10670001-001',
    main_port_id: 'mp-008',
    main_port_number: '10670001',
    carrier: '联通',
    enterprise_name: '山东浪潮云信息技术有限公司',
    sms_signature: '浪潮云',
    business_type: '验证码',
    status: '空闲',
    record_number: null,
    updated_at: '2026-03-10 10:00:00',
  },

  // mp-009 sub-ports (电信)
  {
    id: 'sp-020',
    port_number: '10670002-001',
    main_port_id: 'mp-009',
    main_port_number: '10670002',
    carrier: '电信',
    enterprise_name: '福建亿榕信息技术有限公司',
    sms_signature: '亿榕信息',
    business_type: '通知类',
    status: '已报备',
    record_number: 'REC-20260702-0019',
    updated_at: '2026-06-05 13:00:00',
  },
  {
    id: 'sp-021',
    port_number: '10670002-002',
    main_port_id: 'mp-009',
    main_port_number: '10670002',
    carrier: '电信',
    enterprise_name: '厦门巨龙信息科技有限公司',
    sms_signature: '巨龙信息',
    business_type: '营销类',
    status: '已报备',
    record_number: 'REC-20260702-0020',
    updated_at: '2026-06-07 15:30:00',
  },
]
