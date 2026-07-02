import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as apiDataApi from '@/lib/api/api-data'
import type { ApiDataFilters, UpdateApiDataRequest } from '@/lib/api/api-data'

export function useApiData(filters: ApiDataFilters = {}) {
  return useQuery({
    queryKey: ['apiData', filters],
    queryFn: () => apiDataApi.getApiData(filters),
  })
}

export function useUpdateApiData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiDataRequest }) =>
      apiDataApi.updateApiData(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiData'] }),
  })
}
