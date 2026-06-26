'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';

const KEY = 'reports';

export function useLibrarySummary(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'summary', orgSlug],
    queryFn: () => reportsApi.summary(orgSlug),
    enabled: !!orgSlug,
    staleTime: 30_000,
  });
}

export function usePopularTitles(orgSlug: string, days = 30, limit = 10) {
  return useQuery({
    queryKey: [KEY, 'popular', orgSlug, days, limit],
    queryFn: () => reportsApi.popular(orgSlug, { days, limit }),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCirculationTrend(orgSlug: string, params?: { from?: string; to?: string; branch_id?: string }) {
  return useQuery({
    queryKey: [KEY, 'circulation', orgSlug, params],
    queryFn: () => reportsApi.circulation(orgSlug, params),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}
