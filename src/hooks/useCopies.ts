'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { copiesApi, stocktakeApi, type CopyInput, type CopyStatus } from '@/lib/api/copies';

const KEY = 'copies';

export function useBibCopies(orgSlug: string, bibId: string) {
  return useQuery({
    queryKey: [KEY, 'bib', orgSlug, bibId],
    queryFn: () => copiesApi.listForBib(orgSlug, bibId),
    enabled: !!orgSlug && !!bibId,
  });
}

export function useCopies(orgSlug: string, params?: { status?: CopyStatus | ''; branch_id?: string; q?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, 'list', orgSlug, params],
    queryFn: () => copiesApi.list(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}

export function useCreateCopy(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CopyInput) => copiesApi.create(orgSlug, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['catalog', 'bib', orgSlug, vars.bib_record_id] });
    },
  });
}

export function useUpdateCopy(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CopyInput> }) => copiesApi.update(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCopy(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => copiesApi.delete(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useTransfers(orgSlug: string, status?: string) {
  return useQuery({
    queryKey: [KEY, 'transfers', orgSlug, status],
    queryFn: () => copiesApi.listTransfers(orgSlug, status),
    enabled: !!orgSlug,
  });
}

export function useCreateTransfer(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { copy_id: string; to_branch_id: string; notes?: string }) => copiesApi.createTransfer(orgSlug, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); },
  });
}

export function useReceiveTransfer(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => copiesApi.receiveTransfer(orgSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); },
  });
}

export function useStocktakes(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'stocktake', orgSlug],
    queryFn: () => stocktakeApi.list(orgSlug),
    enabled: !!orgSlug,
  });
}

export function useStartStocktake(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { branch_id: string; reference?: string }) => stocktakeApi.start(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'stocktake', orgSlug] }),
  });
}

export function useScanStocktake(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, barcode }: { id: string; barcode: string }) => stocktakeApi.scan(orgSlug, id, barcode),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'stocktake', orgSlug] }),
  });
}

export function useFinalizeStocktake(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stocktakeApi.finalize(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'stocktake', orgSlug] }),
  });
}
