'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { membersApi, type MemberInput, type MemberStatus, type MemberTierInput, type LoanPolicyInput, type NotificationPref } from '@/lib/api/members';

const KEY = 'members';

export function useMembers(orgSlug: string, params?: { q?: string; status?: MemberStatus | ''; tier_id?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, 'list', orgSlug, params],
    queryFn: () => membersApi.list(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}

export function useMember(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [KEY, 'one', orgSlug, id],
    queryFn: () => membersApi.get(orgSlug, id),
    enabled: !!orgSlug && !!id,
  });
}

export function useCreateMember(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberInput) => membersApi.create(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] }),
  });
}

export function useUpdateMember(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MemberInput> }) => membersApi.update(orgSlug, id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] });
      qc.invalidateQueries({ queryKey: [KEY, 'one', orgSlug, id] });
    },
  });
}

// ── Tiers ──
export function useMemberTiers(orgSlug: string) {
  return useQuery({ queryKey: [KEY, 'tiers', orgSlug], queryFn: () => membersApi.listTiers(orgSlug), enabled: !!orgSlug });
}
export function useCreateTier(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberTierInput) => membersApi.createTier(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'tiers', orgSlug] }),
  });
}
export function useUpdateTier(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MemberTierInput> }) => membersApi.updateTier(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'tiers', orgSlug] }),
  });
}

// ── Loan policies ──
export function useLoanPolicies(orgSlug: string) {
  return useQuery({ queryKey: [KEY, 'policies', orgSlug], queryFn: () => membersApi.listPolicies(orgSlug), enabled: !!orgSlug });
}
export function useCreatePolicy(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LoanPolicyInput) => membersApi.createPolicy(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'policies', orgSlug] }),
  });
}
export function useUpdatePolicy(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoanPolicyInput> }) => membersApi.updatePolicy(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'policies', orgSlug] }),
  });
}

export function useMembershipFees(orgSlug: string, status?: string) {
  return useQuery({
    queryKey: [KEY, 'membership-fees', orgSlug, status],
    queryFn: () => membersApi.listMembershipFees(orgSlug, status),
    enabled: !!orgSlug,
  });
}

export function useIssueMembershipFee(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => membersApi.issueMembershipFee(orgSlug, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'membership-fees', orgSlug] }),
  });
}

export function usePayMembershipFee(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => membersApi.payMembershipFee(orgSlug, feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'membership-fees', orgSlug] }),
  });
}

// ── Bulk import ──
export function useImportMembers(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => membersApi.importMembers(orgSlug, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] }),
  });
}

/** Polls job status every ~1.5s while the import is running; stops once it's done. */
export function useImportStatus(orgSlug: string, jobId: string | null) {
  return useQuery({
    queryKey: [KEY, 'import-status', orgSlug, jobId],
    queryFn: () => membersApi.getImportStatus(orgSlug, jobId as string),
    enabled: !!orgSlug && !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  });
}

export function useDeleteMember(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membersApi.delete(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] }),
  });
}

export function useNotificationPrefs(orgSlug: string, memberId: string) {
  return useQuery({
    queryKey: [KEY, 'notif-prefs', orgSlug, memberId],
    queryFn: () => membersApi.getNotificationPrefs(orgSlug, memberId),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useUpdateNotificationPrefs(orgSlug: string, memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPref[]) => membersApi.updateNotificationPrefs(orgSlug, memberId, prefs),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'notif-prefs', orgSlug, memberId] }),
  });
}
