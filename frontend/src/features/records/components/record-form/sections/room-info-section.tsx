import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RoomInfoSection() {
  const { register } = useFormContext()

  return (
    <Card>
      <CardHeader><CardTitle>机房信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>运营商机房</Label>
          <Input {...register('carrier_room')} />
        </div>
        <div className="space-y-1">
          <Label>企业机房</Label>
          <Input {...register('enterprise_room')} />
        </div>
        <div className="space-y-1">
          <Label>其他机房</Label>
          <Input {...register('other_room')} />
        </div>
      </CardContent>
    </Card>
  )
}
