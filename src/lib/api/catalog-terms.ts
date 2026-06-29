import { apiClient } from './client';
import { libBase } from './types';

export type TermKind = 'author' | 'publisher' | 'place' | 'subject';

interface TermRow { value: string }

export const catalogTermsApi = {
  /** Search dictionary suggestions for a cataloging field (author/publisher/place/subject). */
  list: async (orgSlug: string, kind: TermKind, q?: string): Promise<string[]> => {
    const res = await apiClient.get<{ data?: TermRow[] } | TermRow[]>(
      `${libBase(orgSlug)}/catalog/terms`, { kind, q: q || undefined },
    );
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    return rows.map((r) => r.value);
  },
  /** Persist a new dictionary value so it appears in future pickers (best-effort; idempotent). */
  create: (orgSlug: string, kind: TermKind, value: string) =>
    apiClient.post<TermRow>(`${libBase(orgSlug)}/catalog/terms`, { kind, value }),
};
