import api from '../api'

export interface FilingFillOption {
  id: string
  field_name: 'usage_category' | 'specific_usage' | 'sms_template_content'
  value: string
}

export const getFilingFillOptions = async (): Promise<FilingFillOption[]> =>
  (await api.get('/api/v1/filing-tasks/fill-options')).data

export const saveFilingFillOption = async (
  data: Pick<FilingFillOption, 'field_name' | 'value'>,
  id?: string
): Promise<FilingFillOption> =>
  (await (id
    ? api.patch(`/api/v1/filing-tasks/fill-options/${id}`, data)
    : api.post('/api/v1/filing-tasks/fill-options', data))).data

export const deleteFilingFillOption = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/filing-tasks/fill-options/${id}`)
}
