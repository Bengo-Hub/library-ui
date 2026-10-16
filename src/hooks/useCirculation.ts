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
  qc.invalidateQueries({ queryKey: ['fines'] });
}

export function useCheckout(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckoutInput) => circulationApi.checkout(orgSlug, data),
    onSuccess: () => invalidateCirc(qc, orgSlug),
  });
}

/** Fee and due-date preview for the member and copy on the desk; idle until both are set. */
export function useCheckoutQuote(orgSlug: string, memberId: string | undefined, copyBarcode: string, inHouse: boolean) {
  return useQuery({
    queryKey: [KEY, 'quote', orgSlug, memberId, copyBarcode, inHouse],
    queryFn: () => circulationApi.checkoutQuote(orgSlug, { member_id: memberId!, copy_barcode: copyBarcode, in_house: inHouse }),
    enabled: !!orgSlug && !!memberId && copyBarcode.length > 0,
    staleTime: 30_000,
    retry: false,
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

export function useMarkLost(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => circulationApi.markLost(orgSlug, loanId),
    onSuccess: () => {
      invalidateCirc(qc, orgSlug);
      qc.invalidateQueries({ queryKey: ['fines'] });
    },
  });
}
