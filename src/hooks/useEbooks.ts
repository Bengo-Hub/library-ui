'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ebooksApi, type EbookFormat } from '@/lib/api/ebooks';

const KEY = 'ebooks';

export function useEbooks(orgSlug: string, params?: { q?: string; format?: EbookFormat | ''; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, 'list', orgSlug, params],
    queryFn: () => ebooksApi.list(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}

export function useEbook(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [KEY, 'one', orgSlug, id],
    queryFn: () => ebooksApi.get(orgSlug, id),
    enabled: !!orgSlug && !!id,
  });
}

export function useUploadEbook(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: { title: string; author?: string; bib_record_id?: string; format?: EbookFormat; total_licenses?: number } }) =>
      ebooksApi.upload(orgSlug, file, meta),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] }),
  });
}

export function useLendEbook(orgSlug: string) {
  return useMutation({ mutationFn: (id: string) => ebooksApi.lend(orgSlug, id) });
}

export function useSaveReadPosition(orgSlug: string) {
  return useMutation({
    mutationFn: ({ loanId, position }: { loanId: string; position: string }) => ebooksApi.savePosition(orgSlug, loanId, position),
  });
}

export function usePurchaseEbook(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberId }: { id: string; memberId: string }) => ebooksApi.purchase(orgSlug, id, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list', orgSlug] }),
  });
}

export function useDownloadEbook(orgSlug: string) {
  return useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => ebooksApi.download(orgSlug, id, token),
  });
}
