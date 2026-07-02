import { SearchForm, type SearchField } from '@/components/shared/search-form'

const baseFields: SearchField[] = [
  { name: 'enterprise_name', label: '企业名称', type: 'text' },
  { name: 'main_port', label: '主端口', type: 'text' },
  { name: 'sub_port', label: '子端口', type: 'text' },
  { name: 'sms_signature', label: '短信签名', type: 'text' },
  {
    name: 'carrier',
    label: '运营商',
    type: 'select',
    options: [
      { label: '全部', value: '' },
      { label: '移动', value: '移动' },
      { label: '联通', value: '联通' },
      { label: '电信', value: '电信' },
    ],
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '全部', value: '' },
      { label: '草稿', value: '草稿' },
      { label: '已报备', value: '已报备' },
      { label: '变更中', value: '变更中' },
      { label: '停用', value: '停用' },
    ],
  },
]

const advancedFields: SearchField[] = [
  { name: 'province', label: '省份', type: 'text' },
  { name: 'city', label: '城市', type: 'text' },
  { name: 'business_type', label: '业务类型', type: 'text' },
  { name: 'record_number', label: '报备编号', type: 'text' },
  { name: 'handler_name', label: '经办人', type: 'text' },
  { name: 'start_date', label: '开始日期', type: 'text' },
  { name: 'end_date', label: '结束日期', type: 'text' },
]

const allFields: SearchField[] = [...baseFields, ...advancedFields.map((f) => ({ ...f, advanced: true }))]

interface RecordSearchFormProps {
  onSearch: (values: Record<string, string>) => void
  onReset: () => void
}

export function RecordSearchForm({ onSearch, onReset }: RecordSearchFormProps) {
  return <SearchForm fields={allFields} onSearch={onSearch} onReset={onReset} />
}
