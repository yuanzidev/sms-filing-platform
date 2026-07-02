import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function AuthInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const hasAuth = watch('has_authorization')

  return (
    <Card>
      <CardHeader><CardTitle>授权信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-auth"
            checked={hasAuth ?? false}
            onCheckedChange={(v) => setValue('has_authorization', Boolean(v))}
          />
          <Label htmlFor="has-auth">有授权书</Label>
        </div>
        <div />
        <div className="space-y-1">
          <Label>授权开始日期</Label>
          <Input {...register('auth_start_date')} type="date" />
        </div>
        <div className="space-y-1">
          <Label>授权截止日期</Label>
          <Input {...register('auth_end_date')} type="date" />
        </div>
        <div className="space-y-1">
          <Label>授权附件</Label>
          <Input {...register('auth_attachment')} />
        </div>
        <div className="space-y-1">
          <Label>合同附件</Label>
          <Input {...register('contract_attachment')} />
        </div>
      </CardContent>
    </Card>
  )
}
