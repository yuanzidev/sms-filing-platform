import { useMemo } from 'react'
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SearchableSelect } from '@/components/shared/searchable-select'
import { PROVINCES, PROVINCE_CITY_MAP, PROVINCE_OPTIONS } from './province-city-data'

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
    const list = PROVINCE_CITY_MAP[provinceValue]
    return Array.isArray(list) ? list : []
  }, [provinceValue])

  const citySelectOptions = useMemo(
    () => cityOptions.map((city) => ({ value: city, label: city })),
    [cityOptions]
  )

  return (
    <>
      <FormField
        control={form.control}
        name={provinceName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>省份</FormLabel>
            <SearchableSelect
              value={(field.value as string) || ''}
              onValueChange={(v) => {
                field.onChange(v)
                form.setValue(cityName, '' as never, { shouldValidate: false })
              }}
              options={
                field.value && !PROVINCES.includes(field.value as string)
                  ? [
                      ...PROVINCE_OPTIONS,
                      {
                        value: field.value as string,
                        label: `${field.value as string}（自定义）`,
                      },
                    ]
                  : PROVINCE_OPTIONS
              }
              placeholder='选择省份'
              searchPlaceholder='搜索省份...'
              emptyText='未找到省份'
            />
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
            <SearchableSelect
              value={(field.value as string) || ''}
              onValueChange={field.onChange}
              disabled={!provinceValue}
              options={
                field.value && !cityOptions.includes(field.value as string)
                  ? [
                      ...citySelectOptions,
                      {
                        value: field.value as string,
                        label: `${field.value as string}（自定义）`,
                      },
                    ]
                  : citySelectOptions
              }
              placeholder={provinceValue ? '选择城市' : '请先选省份'}
              searchPlaceholder='搜索城市...'
              emptyText='未找到城市'
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
