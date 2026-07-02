import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubTableField } from '@/components/shared/sub-table-field'

const templateColumns = [
  { key: 'content', header: '模板内容', type: 'text' as const },
  { key: 'param_type', header: '参数类型', type: 'text' as const },
  { key: 'param_length', header: '参数长度', type: 'number' as const },
]

export function TemplateInfoSection() {
  const { setValue, watch } = useFormContext()
  const templates = watch('templates') ?? []

  return (
    <Card>
      <CardHeader><CardTitle>模板信息</CardTitle></CardHeader>
      <CardContent>
        <SubTableField
          columns={templateColumns}
          value={templates}
          onChange={(items) => setValue('templates', items)}
          addLabel="添加模板"
        />
      </CardContent>
    </Card>
  )
}
