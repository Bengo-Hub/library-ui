'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authorizedValuesApi, type AuthorizedValueInput } from '@/lib/api/authorizedValues';

const KEY = 'authorized-values';

export function useAuthorizedValueCategories(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, orgSlug, 'categories'],
    queryFn: () => authorizedValuesApi.listCategories(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useAuthorizedValues(orgSlug: string, category?: string) {
  return useQuery({
    queryKey: [KEY, orgSlug, category ?? 'all'],
    queryFn: () => authorizedValuesApi.list(orgSlug, category),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCreateAuthorizedValue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AuthorizedValueInput) => authorizedValuesApi.create(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useUpdateAuthorizedValue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AuthorizedValueInput> }) =>
      authorizedValuesApi.update(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useDeleteAuthorizedValue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authorizedValuesApi.delete(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}
