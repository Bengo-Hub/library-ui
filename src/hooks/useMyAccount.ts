'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { myAccountApi } from '@/lib/api/my-account';

const KEY = 'my-account';

export function useMyLoans(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'loans', orgSlug],
    queryFn: () => myAccountApi.loans(orgSlug),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useMyHolds(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'holds', orgSlug],
    queryFn: () => myAccountApi.holds(orgSlug),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useMyFines(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'fines', orgSlug],
    queryFn: () => myAccountApi.fines(orgSlug),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useMyPlaceHold(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bib_record_id: string; copy_id?: string; branch_id?: string }) =>
      myAccountApi.placeHold(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'holds', orgSlug] }),
  });
}

export function useMyRenewLoan(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => myAccountApi.renewLoan(orgSlug, loanId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'loans', orgSlug] }),
  });
}

export function useMyPayFine(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fineId: string) => myAccountApi.payFine(orgSlug, fineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'fines', orgSlug] }),
  });
}
