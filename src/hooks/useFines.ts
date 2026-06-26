'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { finesApi, type FineStatus, type FineType, type MembershipFeeInput } from '@/lib/api/fines';

const KEY = 'fines';

export function useFines(orgSlug: string, params?: { status?: FineStatus | ''; member_id?: string; type?: FineType | ''; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, 'list', orgSlug, params],
    queryFn: () => finesApi.list(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}

export function useMemberFines(orgSlug: string, memberId: string) {
  return useQuery({
    queryKey: [KEY, 'member', orgSlug, memberId],
    queryFn: () => finesApi.memberFines(orgSlug, memberId),
    enabled: !!orgSlug && !!memberId,
  });
}

function invalidateFines(qc: ReturnType<typeof useQueryClient>, orgSlug: string) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: ['reports', 'summary', orgSlug] });
}

export function useWaiveFine(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => finesApi.waive(orgSlug, id, reason),
    onSuccess: () => invalidateFines(qc, orgSlug),
  });
}

/** Returns { initiate_url } — caller should redirect to the treasury pay page. */
export function usePayFine(orgSlug: string) {
  return useMutation({
    mutationFn: (id: string) => finesApi.pay(orgSlug, id),
  });
}

export function useAssessMembershipFee(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MembershipFeeInput) => finesApi.assessMembershipFee(orgSlug, data),
    onSuccess: () => invalidateFines(qc, orgSlug),
  });
}
