import { useMemo } from 'react'
import pcData from 'china-division/dist/pc.json'
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const pc = pcData as Record<string, string[]>
export const PROVINCES = Object.keys(pc)

interface Props<T extends FieldValues> {
  form: UseFormReturn<T>
  provinceName?: FieldPath<T>
  cityName?: FieldPath<T>
}

export function ProvinceCityFields<T extends FieldValues>({
  form,
  provinceName = 'province' as FieldPath<T>,
  cityName = 'city' as FieldPath<T>,
}: Props<T>) {
  const provinceValue = form.watch(provinceName) as string | undefined | null

  const cityOptions = useMemo<string[]>(() => {
    if (!provinceValue) return []
    const list = pc[provinceValue]
    return Array.isArray(list) ? list : []
  }, [provinceValue])

  return (
    <>
      <FormField
        control={form.control}
        name={provinceName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>省份</FormLabel>
            <Select
              value={(field.value as string) || ''}
              onValueChange={(v) => {
                field.onChange(v)
                form.setValue(cityName, '' as never, { shouldValidate: false })
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="选择省份" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                {field.value && !PROVINCES.includes(field.value as string) && (
                  <SelectItem value={field.value as string}>
                    {field.value as string}（自定义）
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={cityName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>城市</FormLabel>
            <Select
              value={(field.value as string) || ''}
              onValueChange={field.onChange}
              disabled={!provinceValue}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={provinceValue ? '选择城市' : '请先选省份'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                {field.value && !cityOptions.includes(field.value as string) && (
                  <SelectItem value={field.value as string}>
                    {field.value as string}（自定义）
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
