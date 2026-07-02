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

export function ExtendedFieldsSection() {
  const { register, setValue, watch } = useFormContext()
  const carrier = watch('carrier')

  if (!carrier) {
    return (
      <Card>
        <CardHeader><CardTitle>扩展字段</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">请先选择运营商</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>扩展字段</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {carrier === '移动' && (
          <>
            <div className="space-y-1">
              <Label>速率限制（条/秒）</Label>
              <Input {...register('rate_limit')} type="number" placeholder="100" />
            </div>
            <div className="space-y-1">
              <Label>通道类型</Label>
              <Select value={watch('channel_type') ?? ''} onValueChange={(v) => setValue('channel_type', v)}>
                <SelectTrigger><SelectValue placeholder="选择通道类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通">普通</SelectItem>
                  <SelectItem value="高速">高速</SelectItem>
                  <SelectItem value="专线">专线</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {carrier === '联通' && (
          <div className="space-y-1">
            <Label>联通业务代码</Label>
            <Input {...register('unicom_biz_code')} placeholder="例如：UNICOM001" />
          </div>
        )}
        {carrier === '电信' && (
          <div className="space-y-1">
            <Label>电信产品编号</Label>
            <Input {...register('telecom_product_id')} placeholder="例如：TEL001" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
