'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/lib/api/rbac';

const KEY = 'rbac';

export function useRoles(orgSlug: string) {
  return useQuery({ queryKey: [KEY, 'roles', orgSlug], queryFn: () => rbacApi.listRoles(orgSlug), enabled: !!orgSlug });
}

export function useAllPermissions(orgSlug: string) {
  return useQuery({ queryKey: [KEY, 'permissions', orgSlug], queryFn: () => rbacApi.listPermissions(orgSlug), enabled: !!orgSlug, staleTime: 10 * 60_000 });
}

export function useTeam(orgSlug: string) {
  return useQuery({ queryKey: [KEY, 'team', orgSlug], queryFn: () => rbacApi.listTeam(orgSlug), enabled: !!orgSlug });
}

export function useUpdateRole(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions, description }: { id: string; permissions: string[]; description?: string }) =>
      rbacApi.updateRole(orgSlug, id, { permissions, description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'roles', orgSlug] }),
  });
}

export function useAssignRole(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) => rbacApi.assignRole(orgSlug, userId, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'team', orgSlug] }),
  });
}
