'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchesApi, type BranchInput } from '@/lib/api/branches';

const KEY = 'branches';

export function useBranches(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, orgSlug],
    queryFn: () => branchesApi.list(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCreateBranch(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BranchInput) => branchesApi.create(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}

export function useUpdateBranch(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BranchInput> }) => branchesApi.update(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, orgSlug] }),
  });
}
