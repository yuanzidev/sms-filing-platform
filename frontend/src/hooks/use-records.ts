import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as recordsApi from '@/lib/api/records'
import type { RecordFilters } from '@/lib/api/records'
import type { FilingRecord } from '@/lib/mock/data/records'

export function useRecords(filters: RecordFilters = {}) {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.getRecords(filters),
  })
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: ['record', id],
    queryFn: () => recordsApi.getRecord(id),
    enabled: !!id,
  })
}

export function useCreateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: recordsApi.createRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}

export function useUpdateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FilingRecord> }) =>
      recordsApi.updateRecord(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recordsApi.deleteRecord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  })
}
