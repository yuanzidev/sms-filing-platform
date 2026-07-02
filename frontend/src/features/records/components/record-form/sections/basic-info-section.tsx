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

export function BasicInfoSection() {
  const { register, setValue, watch } = useFormContext()
  const carrier = watch('carrier')

  return (
    <Card>
      <CardHeader><CardTitle>基础信息</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>运营商 *</Label>
          <Select value={carrier ?? ''} onValueChange={(v) => setValue('carrier', v)}>
            <SelectTrigger><SelectValue placeholder="选择运营商" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="移动">移动</SelectItem>
              <SelectItem value="联通">联通</SelectItem>
              <SelectItem value="电信">电信</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>报备编号</Label>
          <Input {...register('record_number')} placeholder="自动生成" />
        </div>
        <div className="space-y-1">
          <Label>操作类型</Label>
          <Select value={watch('operation_type') ?? ''} onValueChange={(v) => setValue('operation_type', v)}>
            <SelectTrigger><SelectValue placeholder="选择操作类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="新增">新增</SelectItem>
              <SelectItem value="变更">变更</SelectItem>
              <SelectItem value="续期">续期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>提交单位</Label>
          <Input {...register('submit_unit')} />
        </div>
        <div className="space-y-1">
          <Label>来源文件</Label>
          <Input {...register('source_file')} />
        </div>
        <div className="space-y-1">
          <Label>导入批次</Label>
          <Input {...register('import_batch')} />
        </div>
        <div className="space-y-1">
          <Label>状态</Label>
          <Select value={watch('status') ?? ''} onValueChange={(v) => setValue('status', v)}>
            <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="草稿">草稿</SelectItem>
              <SelectItem value="已报备">已报备</SelectItem>
              <SelectItem value="变更中">变更中</SelectItem>
              <SelectItem value="停用">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
