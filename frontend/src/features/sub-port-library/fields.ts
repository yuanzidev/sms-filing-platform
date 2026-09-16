import type { ExportGroup, ExportGroupField } from '@/lib/api/types'

export type SubPortLibraryField = Pick<
  ExportGroupField,
  'field_name' | 'field_label' | 'sort_order'
>

const FIXED_FIELD_NAMES = new Set([
  'main_port_number',
  'sub_port_number',
  'port_sub_extension',
])

const SUPPLEMENTAL_FIELDS: SubPortLibraryField[] = [
  {
    field_name: 'other_proof',
    field_label: '其他举证图片',
    sort_order: 10_000,
  },
  {
    field_name: 'sub_port_failure_reason',
    field_label: '子端口失败原因',
    sort_order: 10_001,
  },
]
const SUPPLEMENTAL_FIELD_NAMES = new Set(
  SUPPLEMENTAL_FIELDS.map((field) => field.field_name)
)

export function getSubPortLibraryFields(
  group: ExportGroup
): SubPortLibraryField[] {
  const fields: SubPortLibraryField[] = [...group.fields]
    .filter(
      (field) =>
        !FIXED_FIELD_NAMES.has(field.field_name) &&
        !SUPPLEMENTAL_FIELD_NAMES.has(field.field_name)
    )
    .sort((a, b) => a.sort_order - b.sort_order)

  const seenNames = new Set(fields.map((field) => field.field_name))
  const seenLabels = new Set(fields.map((field) => field.field_label))
  for (const field of SUPPLEMENTAL_FIELDS) {
    if (!seenNames.has(field.field_name) && !seenLabels.has(field.field_label)) {
      fields.push(field)
      seenNames.add(field.field_name)
      seenLabels.add(field.field_label)
    }
  }

  return fields
}
