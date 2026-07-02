import { Badge } from '@/components/ui/badge'

const colorMap: Record<string, string> = {
  // Record status
  '草稿': 'bg-gray-100 text-gray-700',
  '已报备': 'bg-green-100 text-green-700',
  '变更中': 'bg-orange-100 text-orange-700',
  '停用': 'bg-red-100 text-red-700',
  // Port status
  '空闲': 'bg-blue-100 text-blue-700',
  '使用中': 'bg-green-100 text-green-700',
  '异常': 'bg-red-100 text-red-700',
  // Sub port status
  '已分配': 'bg-orange-100 text-orange-700',
  // API status
  '待处理': 'bg-blue-100 text-blue-700',
  '已入库': 'bg-green-100 text-green-700',
  '校验失败': 'bg-red-100 text-red-700',
  '已忽略': 'bg-gray-100 text-gray-700',
  // Attachment status
  '未上传': 'bg-gray-100 text-gray-500',
  '已上传': 'bg-green-100 text-green-700',
  '缺失': 'bg-red-100 text-red-700',
  '格式异常': 'bg-yellow-100 text-yellow-700',
}

interface StatusTagProps {
  status: string
  customMap?: Record<string, string>
}

export function StatusTag({ status, customMap }: StatusTagProps) {
  const map = customMap ?? colorMap
  const className = map[status] ?? 'bg-gray-100 text-gray-700'
  return <Badge className={className} variant="outline">{status}</Badge>
}
