import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegionInfoSection() {
  const { register } = useFormContext()

  return (
    <Card>
      <CardHeader><CardTitle>区域信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>省份</Label>
          <Input {...register('province')} />
        </div>
        <div className="space-y-1">
          <Label>城市</Label>
          <Input {...register('city')} />
        </div>
        <div className="space-y-1">
          <Label>区县</Label>
          <Input {...register('district')} />
        </div>
      </CardContent>
    </Card>
  )
}
