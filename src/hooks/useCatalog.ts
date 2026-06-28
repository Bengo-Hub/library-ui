'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { catalogApi, type BibInput, type BibListParams, type CollectionInput } from '@/lib/api/catalog';

const KEY = 'catalog';

export function useBibs(orgSlug: string, params?: BibListParams) {
  return useQuery({
    queryKey: [KEY, 'bibs', orgSlug, params],
    queryFn: () => catalogApi.listBibs(orgSlug, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBib(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [KEY, 'bib', orgSlug, id],
    queryFn: () => catalogApi.getBib(orgSlug, id),
    enabled: !!orgSlug && !!id,
  });
}

export function useIsbnLookup(orgSlug: string) {
  return useMutation({
    mutationFn: (isbn: string) => catalogApi.isbnLookup(orgSlug, isbn),
  });
}

export function useCreateBib(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BibInput) => catalogApi.createBib(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'bibs', orgSlug] }),
  });
}

export function useUpdateBib(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BibInput> }) => catalogApi.updateBib(orgSlug, id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, 'bibs', orgSlug] });
      qc.invalidateQueries({ queryKey: [KEY, 'bib', orgSlug, id] });
    },
  });
}

export function useDeleteBib(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteBib(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'bibs', orgSlug] }),
  });
}

export function useCollections(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'collections', orgSlug],
    queryFn: () => catalogApi.listCollections(orgSlug),
    enabled: !!orgSlug,
    staleTime: 10 * 60_000,
  });
}

export function useCreateCollection(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CollectionInput) => catalogApi.createCollection(orgSlug, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'collections', orgSlug] }),
  });
}

export function useUpdateCollection(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CollectionInput }) => catalogApi.updateCollection(orgSlug, id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'collections', orgSlug] }),
  });
}

export function useDeleteCollection(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteCollection(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'collections', orgSlug] }),
  });
}

export function useUploadCover(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, side = 'front' }: { id: string; file: File; side?: 'front' | 'back' }) =>
      catalogApi.uploadCover(orgSlug, id, file, side),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: [KEY, 'bib', orgSlug, id] }),
  });
}

export function useCatalogFacets(orgSlug: string) {
  return useQuery({
    queryKey: [KEY, 'facets', orgSlug],
    queryFn: () => catalogApi.facets(orgSlug),
    enabled: !!orgSlug,
    staleTime: 5 * 60_000,
  });
}

export function useRecommendations(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [KEY, 'recommendations', orgSlug, id],
    queryFn: () => catalogApi.recommendations(orgSlug, id),
    enabled: !!orgSlug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useCatalogSearch(
  orgSlug: string,
  q: string,
  params?: { format?: string; subject_id?: string; collection_id?: string; branch_id?: string; language?: string; available?: boolean; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [KEY, 'search', orgSlug, q, params],
    queryFn: () => catalogApi.search(orgSlug, q, params),
    enabled: !!orgSlug,
    placeholderData: keepPreviousData,
  });
}
