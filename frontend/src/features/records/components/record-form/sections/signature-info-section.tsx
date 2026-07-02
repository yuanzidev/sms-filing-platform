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

export function SignatureInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const verified = watch('signature_verified')
  const gateway = watch('is_gateway_signature')

  return (
    <Card>
      <CardHeader><CardTitle>签名信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>短信签名 *</Label>
          <Input {...register('sms_signature')} />
        </div>
        <div className="space-y-1">
          <Label>签名类型</Label>
          <Select value={watch('signature_type') ?? ''} onValueChange={(v) => setValue('signature_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择签名类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="企业签名">企业签名</SelectItem>
              <SelectItem value="APP签名">APP签名</SelectItem>
              <SelectItem value="网站签名">网站签名</SelectItem>
              <SelectItem value="商标签名">商标签名</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sig-verified"
            checked={verified ?? false}
            onCheckedChange={(v) => setValue('signature_verified', Boolean(v))}
          />
          <Label htmlFor="sig-verified">签名已验证</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="gateway-sig"
            checked={gateway ?? false}
            onCheckedChange={(v) => setValue('is_gateway_signature', Boolean(v))}
          />
          <Label htmlFor="gateway-sig">网关签名</Label>
        </div>
        <div className="space-y-1">
          <Label>签名附件</Label>
          <Input {...register('signature_attachment')} />
        </div>
      </CardContent>
    </Card>
  )
}
