import api from '../api'

export interface SubPortAvailability {
  used: number
  total: number
  available: number
}

/**
 * 查询指定主端口在子端口范围内的可用数量
 */
export const getSubPortAvailability = async (
  mainPortNumbers: string[],
  rangeStart: number,
  rangeEnd: number
): Promise<Record<string, SubPortAvailability>> => {
  const response = await api.get('/api/v1/filing-tasks/sub-port-availability', {
    params: {
      main_port_numbers: mainPortNumbers.join(','),
      range_start: rangeStart,
      range_end: rangeEnd,
    },
  })
  return response.data
}
