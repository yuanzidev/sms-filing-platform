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

export function EnterpriseInfoSection() {
  const { register, setValue, watch } = useFormContext()

  return (
    <Card>
      <CardHeader><CardTitle>企业信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>企业名称 *</Label>
          <Input {...register('enterprise_name')} />
        </div>
        <div className="space-y-1">
          <Label>证件类型</Label>
          <Select value={watch('cert_type') ?? ''} onValueChange={(v) => setValue('cert_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择证件类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="统一社会信用代码">统一社会信用代码</SelectItem>
              <SelectItem value="营业执照">营业执照</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>证件号码</Label>
          <Input {...register('cert_number')} />
        </div>
        <div className="space-y-1">
          <Label>客户类型</Label>
          <Select value={watch('customer_type') ?? ''} onValueChange={(v) => setValue('customer_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择客户类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="企业">企业</SelectItem>
              <SelectItem value="政府/事业单位">政府/事业单位</SelectItem>
              <SelectItem value="个人">个人</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>集团编号</Label>
          <Input {...register('group_code')} />
        </div>
        <div className="space-y-1">
          <Label>应用平台名称</Label>
          <Input {...register('app_platform_name')} />
        </div>
      </CardContent>
    </Card>
  )
}
