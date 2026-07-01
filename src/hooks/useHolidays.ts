'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { holidaysApi, type HolidayInput } from '@/lib/api/holidays';

const KEY = 'holidays';

export function useHolidays(orgSlug: string, params?: { branch_id?: string; year?: number }) {
  return useQuery({
    queryKey: [KEY, orgSlug, params?.branch_id ?? 'all', params?.year ?? 'all'],
    queryFn: () => holidaysApi.list(orgSlug, params),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCreateHoliday(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HolidayInput) => holidaysApi.create(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useUpdateHoliday(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HolidayInput }) => holidaysApi.update(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useDeleteHoliday(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => holidaysApi.delete(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}
