'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { circulationRulesApi, type CirculationRuleInput } from '@/lib/api/circulationRules';

const KEY = 'circulation-rules';

export function useCirculationRules(orgSlug: string, branchId?: string) {
  return useQuery({
    queryKey: [KEY, orgSlug, branchId ?? 'all'],
    queryFn: () => circulationRulesApi.list(orgSlug, branchId),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useCreateCirculationRule(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CirculationRuleInput) => circulationRulesApi.create(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useUpdateCirculationRule(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CirculationRuleInput }) =>
      circulationRulesApi.update(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useDeleteCirculationRule(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => circulationRulesApi.delete(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}
