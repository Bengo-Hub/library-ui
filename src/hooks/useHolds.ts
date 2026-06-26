'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { holdsApi, type HoldInput, type HoldStatus } from '@/lib/api/holds';

const KEY = 'holds';

export function useHolds(orgSlug: string, params?: { status?: HoldStatus | ''; member_id?: string; bib_record_id?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, 'list', orgSlug, params],
    queryFn: () => holdsApi.list(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}

export function usePlaceHold(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HoldInput) => holdsApi.place(orgSlug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['reports', 'summary', orgSlug] });
    },
  });
}

export function useCancelHold(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => holdsApi.cancel(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
