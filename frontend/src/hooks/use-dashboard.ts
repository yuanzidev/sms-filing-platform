import { useQuery } from '@tanstack/react-query'
import * as dashboardApi from '@/lib/api/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getDashboardStats(),
  })
}

export function useDashboardTrends(days?: number) {
  return useQuery({
    queryKey: ['dashboardTrends', { days }],
    queryFn: () => dashboardApi.getDashboardTrends(days),
  })
}

export function useCarrierDistribution() {
  return useQuery({
    queryKey: ['carrierDistribution'],
    queryFn: () => dashboardApi.getCarrierDistribution(),
  })
}
