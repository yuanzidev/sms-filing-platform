import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BusinessInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const isGreen = watch('is_green_channel')

  return (
    <Card>
      <CardHeader><CardTitle>业务信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>业务属性</Label>
          <Select value={watch('business_attribute') ?? ''} onValueChange={(v) => setValue('business_attribute', v)}>
            <SelectTrigger><SelectValue placeholder="选择业务属性" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="行业短信">行业短信</SelectItem>
              <SelectItem value="营销短信">营销短信</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>业务类型</Label>
          <Select value={watch('business_type') ?? ''} onValueChange={(v) => setValue('business_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择业务类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="验证码">验证码</SelectItem>
              <SelectItem value="通知类">通知类</SelectItem>
              <SelectItem value="营销类">营销类</SelectItem>
              <SelectItem value="政务类">政务类</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>业务子类型</Label>
          <Input {...register('business_subtype')} />
        </div>
        <div className="space-y-1">
          <Label>运营商侧原始业务类型</Label>
          <Input {...register('carrier_original_biz_type')} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>具体用途</Label>
          <Input {...register('specific_usage')} className="w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="green-channel"
            checked={isGreen ?? false}
            onCheckedChange={(v) => setValue('is_green_channel', Boolean(v))}
          />
          <Label htmlFor="green-channel">绿色通道</Label>
        </div>
        <div className="space-y-1">
          <Label>黑名单类型</Label>
          <Input {...register('blacklist_type')} />
        </div>
      </CardContent>
    </Card>
  )
}
