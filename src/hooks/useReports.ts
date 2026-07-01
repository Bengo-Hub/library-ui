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

export function useMemberActivity(orgSlug: string, days = 90) {
  return useQuery({
    queryKey: [KEY, 'member-activity', orgSlug, days],
    queryFn: () => reportsApi.memberActivity(orgSlug, { days }),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useOverdueAging(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'overdue-aging', orgSlug],
    queryFn: () => reportsApi.overdueAging(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useItemMovement(orgSlug: string, days = 90) {
  return useQuery({
    queryKey: [KEY, 'item-movement', orgSlug, days],
    queryFn: () => reportsApi.itemMovement(orgSlug, { days }),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useFineAging(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'fine-aging', orgSlug],
    queryFn: () => reportsApi.fineAging(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useAcquisitionSpend(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'acquisition-spend', orgSlug],
    queryFn: () => reportsApi.acquisitionSpend(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCatalogStats(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'catalog-stats', orgSlug],
    queryFn: () => reportsApi.catalogStats(orgSlug),
    enabled: !!orgSlug,
    staleTime: 10 * 60_000,
  });
}

export function useEbookUsage(orgSlug: string, days = 30) {
  return useQuery({
    queryKey: [KEY, 'ebook-usage', orgSlug, days],
    queryFn: () => reportsApi.ebookUsage(orgSlug, { days }),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useMemberTrend(orgSlug: string, days = 30) {
  return useQuery({
    queryKey: [KEY, 'member-trend', orgSlug, days],
    queryFn: () => reportsApi.memberTrend(orgSlug, { days }),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}
