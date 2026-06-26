'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { circulationApi, type CheckoutInput, type LoanListParams } from '@/lib/api/circulation';

const KEY = 'circulation';

export function useLoans(orgSlug: string, params?: LoanListParams) {
  return useQuery({
    queryKey: [KEY, 'loans', orgSlug, params],
    queryFn: () => circulationApi.listLoans(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useMemberLoans(orgSlug: string, memberId: string) {
  return useQuery({
    queryKey: [KEY, 'member-loans', orgSlug, memberId],
    queryFn: () => circulationApi.memberLoans(orgSlug, memberId),
    enabled: !!orgSlug && !!memberId,
  });
}

function invalidateCirc(qc: ReturnType<typeof useQueryClient>, orgSlug: string) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: ['copies'] });
  qc.invalidateQueries({ queryKey: ['catalog', 'bibs', orgSlug] });
  qc.invalidateQueries({ queryKey: ['reports', 'summary', orgSlug] });
}

export function useCheckout(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckoutInput) => circulationApi.checkout(orgSlug, data),
    onSuccess: () => invalidateCirc(qc, orgSlug),
  });
}

export function useReturn(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (copyBarcode: string) => circulationApi.returnCopy(orgSlug, copyBarcode),
    onSuccess: () => invalidateCirc(qc, orgSlug),
  });
}

export function useRenew(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => circulationApi.renew(orgSlug, loanId),
    onSuccess: () => invalidateCirc(qc, orgSlug),
  });
}
