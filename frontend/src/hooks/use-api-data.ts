import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as apiDataApi from '@/lib/api/api-data'

export function useApiAccessData(id: string, page = 1, page_size = 20) {
  return useQuery({
    queryKey: ['apiAccessData', id, page, page_size],
    queryFn: () => apiDataApi.getApiAccessData(id, page, page_size),
    enabled: !!id,
  })
}

export function useCreateApiAccessConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiDataApi.createApiAccessConfig>[0]) =>
      apiDataApi.createApiAccessConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiAccessConfigs'] }),
  })
}
