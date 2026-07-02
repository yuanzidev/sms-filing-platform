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
import { PortSelector } from '@/components/shared/port-selector'

export function PortInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const mainPort = watch('main_port')
  const allowSelfExt = watch('allow_self_extension')

  return (
    <Card>
      <CardHeader><CardTitle>端口信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>主端口 *</Label>
          <PortSelector value={mainPort ?? ''} onChange={(v) => setValue('main_port', v)} />
        </div>
        <div className="space-y-1">
          <Label>子端口</Label>
          <Input {...register('sub_port')} placeholder="端口号" />
        </div>
        <div className="space-y-1">
          <Label>端口范围</Label>
          <Input {...register('port_range')} />
        </div>
        <div className="space-y-1">
          <Label>端口类型</Label>
          <Select value={watch('port_type') ?? ''} onValueChange={(v) => setValue('port_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="三网合一">三网合一</SelectItem>
              <SelectItem value="单网">单网</SelectItem>
              <SelectItem value="省内">省内</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>端口开通日期</Label>
          <Input {...register('port_activation_date')} type="date" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="allow-self-ext"
            checked={allowSelfExt ?? false}
            onCheckedChange={(v) => setValue('allow_self_extension', Boolean(v))}
          />
          <Label htmlFor="allow-self-ext">允许自扩展</Label>
        </div>
      </CardContent>
    </Card>
  )
}
