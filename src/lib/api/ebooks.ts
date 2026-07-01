import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type EbookFormat = 'pdf' | 'epub';

export interface Ebook {
  id: string;
  bib_record_id?: string;
  title: string;
  author?: string;
  format: EbookFormat;
  cover_url?: string | null;
  description?: string;
  file_size?: number | null;
  language?: string;
  // licensing — concurrent loan model
  total_licenses?: number;
  available_licenses?: number;
  // Phase 2 purchase
  is_purchasable?: boolean;
  price?: string | number;
  created_at?: string;
}

export interface EbookLendResult {
  loan_id: string;
  access_token: string;
  /** ISO expiry of the lending token. */
  expires_at?: string;
  format?: EbookFormat;
}

export interface EbookLoan {
  id: string;
  ebook_id: string;
  member_id?: string;
  last_read_position?: string | null;
  borrowed_at?: string;
  expires_at?: string;
}

export const ebooksApi = {
  list: async (orgSlug: string, params?: { q?: string; format?: EbookFormat | ''; page?: number; limit?: number }): Promise<Paginated<Ebook>> => {
    const res = await apiClient.get<Paginated<Ebook> | Ebook[]>(`${libBase(orgSlug)}/ebooks`, params);
    return normalizePage<Ebook>(res);
  },

  get: (orgSlug: string, id: string) => apiClient.get<Ebook>(`${libBase(orgSlug)}/ebooks/${id}`),

  upload: (orgSlug: string, file: File, meta: { title: string; author?: string; bib_record_id?: string; format?: EbookFormat; total_licenses?: number }): Promise<Ebook> => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', meta.title);
    if (meta.author) form.append('author', meta.author);
    if (meta.bib_record_id) form.append('bib_record_id', meta.bib_record_id);
    if (meta.format) form.append('format', meta.format);
    if (meta.total_licenses != null) form.append('total_licenses', String(meta.total_licenses));
    return apiClient.post<Ebook>(`${libBase(orgSlug)}/ebooks`, form);
  },

  /** Borrow a license — returns { loan_id, access_token } used to stream the content. */
  lend: (orgSlug: string, id: string) =>
    apiClient.post<EbookLendResult>(`${libBase(orgSlug)}/ebooks/${id}/lend`, {}),

  /** Absolute URL to stream the protected content (token-gated). */
  readUrl: (orgSlug: string, id: string, token: string) =>
    `${apiClient.baseUrl}${libBase(orgSlug)}/ebooks/${id}/read?token=${encodeURIComponent(token)}`,

  /** Fetch the protected content as a Blob (carries auth + tenant headers). */
  readBlob: (orgSlug: string, id: string, token: string) =>
    apiClient.getBlob(`${libBase(orgSlug)}/ebooks/${id}/read`, { token }),

  savePosition: (orgSlug: string, loanId: string, position: string) =>
    apiClient.post<void>(`${libBase(orgSlug)}/ebooks/loans/${loanId}/position`, { position }),

  /** Phase 2: buy an e-book outright — returns a treasury initiate_url for the shared pay page. */
  purchase: (orgSlug: string, id: string, memberId: string) =>
    apiClient.post<EbookPurchaseResult>(`${libBase(orgSlug)}/ebooks/${id}/purchase`, { member_id: memberId }),

  /** Token-gated download of a paid purchase — streams binary file. */
  download: (orgSlug: string, id: string, token: string) =>
    apiClient.getBlob(`${libBase(orgSlug)}/ebooks/${id}/download`, { token }),
};

export interface EbookPurchaseResult {
  purchase_id: string;
  intent_id: string;
  initiate_url: string;
  amount: string;
  download_token: string;
}
