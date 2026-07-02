import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ResponsibleInfoSection() {
  const { register, setValue, watch } = useFormContext()

  return (
    <Card>
      <CardHeader><CardTitle>负责人信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>姓名</Label>
          <Input {...register('responsible_name')} />
        </div>
        <div className="space-y-1">
          <Label>证件类型</Label>
          <Select value={watch('responsible_cert_type') ?? ''} onValueChange={(v) => setValue('responsible_cert_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择证件类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="身份证">身份证</SelectItem>
              <SelectItem value="护照">护照</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>证件号码</Label>
          <Input {...register('responsible_cert_number')} />
        </div>
        <div className="space-y-1">
          <Label>证件地址</Label>
          <Input {...register('responsible_cert_address')} />
        </div>
        <div className="space-y-1">
          <Label>联系电话</Label>
          <Input {...register('responsible_phone')} />
        </div>
      </CardContent>
    </Card>
  )
}
