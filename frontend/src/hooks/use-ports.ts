import { useQuery } from '@tanstack/react-query'
import * as portsApi from '@/lib/api/ports'
import type { MainPortFilters, SubPortFilters } from '@/lib/api/ports'

export function useMainPorts(filters: MainPortFilters = {}) {
  return useQuery({
    queryKey: ['mainPorts', filters],
    queryFn: () => portsApi.getMainPorts(filters),
  })
}

export function useMainPort(id: string) {
  return useQuery({
    queryKey: ['mainPort', id],
    queryFn: () => portsApi.getMainPort(id),
    enabled: !!id,
  })
}

export function useSubPorts(filters: SubPortFilters = {}) {
  return useQuery({
    queryKey: ['subPorts', filters],
    queryFn: () => portsApi.getSubPorts(filters),
  })
}

export function useSubPort(id: string) {
  return useQuery({
    queryKey: ['subPort', id],
    queryFn: () => portsApi.getSubPort(id),
    enabled: !!id,
  })
}
