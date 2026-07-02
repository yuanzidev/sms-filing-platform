import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubTableField } from '@/components/shared/sub-table-field'

const diversionColumns = [
  { key: 'content', header: '分流内容', type: 'text' as const },
  { key: 'ratio', header: '分流比例', type: 'number' as const },
]

export function DiversionInfoSection() {
  const { setValue, watch } = useFormContext()
  const diversions = watch('diversions') ?? []

  return (
    <Card>
      <CardHeader><CardTitle>分流信息</CardTitle></CardHeader>
      <CardContent>
        <SubTableField
          columns={diversionColumns}
          value={diversions}
          onChange={(items) => setValue('diversions', items)}
          addLabel="添加分流"
        />
      </CardContent>
    </Card>
  )
}
