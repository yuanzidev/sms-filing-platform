import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as filingTasksApi from '@/lib/api/filing-tasks'
import type { FilingTaskFilters } from '@/lib/api/filing-tasks'
import type { CreateFilingTaskRequest } from '@/lib/api/types'

export function useFilingTasks(filters: FilingTaskFilters = {}) {
  return useQuery({
    queryKey: ['filing-tasks', filters],
    queryFn: () => filingTasksApi.getFilingTasks(filters),
  })
}

export function useFilingTask(id: string) {
  return useQuery({
    queryKey: ['filing-task', id],
    queryFn: () => filingTasksApi.getFilingTask(id),
    enabled: !!id,
  })
}

export function useCreateFilingTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFilingTaskRequest) => filingTasksApi.createFilingTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filing-tasks'] }),
  })
}

export function useDeleteFilingTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => filingTasksApi.deleteFilingTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filing-tasks'] }),
  })
}
