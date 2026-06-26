import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type BibFormat = 'book' | 'ebook' | 'audiobook' | 'periodical' | 'dvd' | 'map' | 'thesis' | 'other';

export const BIB_FORMATS: { value: BibFormat; label: string }[] = [
  { value: 'book', label: 'Book' },
  { value: 'ebook', label: 'eBook' },
  { value: 'audiobook', label: 'Audiobook' },
  { value: 'periodical', label: 'Periodical' },
  { value: 'dvd', label: 'DVD / Media' },
  { value: 'map', label: 'Map' },
  { value: 'thesis', label: 'Thesis' },
  { value: 'other', label: 'Other' },
];

export interface BibRecord {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  authors?: string[];
  publisher?: string;
  publication_year?: number | null;
  edition?: string;
  isbn?: string;
  issn?: string;
  format: BibFormat;
  language?: string;
  dewey?: string;
  call_number?: string;
  subjects?: string[];
  collection_id?: string;
  collection_name?: string;
  description?: string;
  cover_url?: string | null;
  pages?: number | null;
  // availability summary enriched by library-api
  total_copies?: number;
  available_copies?: number;
  on_hold?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BibInput {
  title: string;
  subtitle?: string;
  author?: string;
  authors?: string[];
  publisher?: string;
  publication_year?: number | null;
  edition?: string;
  isbn?: string;
  issn?: string;
  format: BibFormat;
  language?: string;
  dewey?: string;
  call_number?: string;
  subjects?: string[];
  collection_id?: string;
  description?: string;
  cover_url?: string | null;
  pages?: number | null;
}

export interface IsbnLookupResult {
  title?: string;
  subtitle?: string;
  author?: string;
  authors?: string[];
  publisher?: string;
  publication_year?: number | null;
  isbn?: string;
  pages?: number | null;
  cover_url?: string | null;
  subjects?: string[];
  language?: string;
}

export interface NamedEntity {
  id: string;
  name: string;
  count?: number;
}

export interface BibListParams {
  q?: string;
  format?: BibFormat | '';
  collection_id?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

export const catalogApi = {
  listBibs: async (orgSlug: string, params?: BibListParams): Promise<Paginated<BibRecord>> => {
    const res = await apiClient.get<Paginated<BibRecord> | BibRecord[]>(`${libBase(orgSlug)}/catalog/bibs`, params);
    return normalizePage<BibRecord>(res);
  },

  getBib: (orgSlug: string, id: string) =>
    apiClient.get<BibRecord>(`${libBase(orgSlug)}/catalog/bibs/${id}`),

  createBib: (orgSlug: string, data: BibInput) =>
    apiClient.post<BibRecord>(`${libBase(orgSlug)}/catalog/bibs`, data),

  updateBib: (orgSlug: string, id: string, data: Partial<BibInput>) =>
    apiClient.put<BibRecord>(`${libBase(orgSlug)}/catalog/bibs/${id}`, data),

  deleteBib: (orgSlug: string, id: string) =>
    apiClient.delete<void>(`${libBase(orgSlug)}/catalog/bibs/${id}`),

  search: async (orgSlug: string, q: string, params?: { format?: string; subject_id?: string; collection_id?: string; branch_id?: string; language?: string; available?: boolean; page?: number; limit?: number }): Promise<Paginated<BibRecord>> => {
    const res = await apiClient.get<Paginated<BibRecord> | BibRecord[]>(`${libBase(orgSlug)}/catalog/search`, { q, ...params });
    return normalizePage<BibRecord>(res);
  },

  /** Facet values for the OPAC filter UI (formats / subjects / collections / branches / languages). */
  facets: (orgSlug: string) =>
    apiClient.get<{ formats: string[]; subjects: { id: string; name: string }[]; collections: { id: string; name: string }[]; branches: { id: string; name: string }[]; languages: string[] }>(`${libBase(orgSlug)}/catalog/facets`),

  /** MARCXML / MARC-in-JSON export + MARC-lite import. */
  marcXmlUrl: (orgSlug: string, id: string) => `${apiClient.baseUrl}${libBase(orgSlug)}/catalog/bibs/${id}/marc.xml`,
  importMarc: (orgSlug: string, data: Partial<BibInput>) => apiClient.post<BibRecord>(`${libBase(orgSlug)}/catalog/import/marc`, data),

  /** "Also borrowed" recommendations (co-loan ranking) for a title. */
  recommendations: async (orgSlug: string, id: string): Promise<{ bib_record_id: string; title: string; score: number }[]> => {
    const res = await apiClient.get<{ data?: { bib_record_id: string; title: string; score: number }[] }>(`${libBase(orgSlug)}/catalog/bibs/${id}/recommendations`);
    return (res as { data?: { bib_record_id: string; title: string; score: number }[] }).data ?? [];
  },

  isbnLookup: (orgSlug: string, isbn: string) =>
    apiClient.get<IsbnLookupResult>(`${libBase(orgSlug)}/catalog/isbn/${encodeURIComponent(isbn)}`),

  uploadCover: (orgSlug: string, id: string, file: File): Promise<{ cover_url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ cover_url: string }>(`${libBase(orgSlug)}/catalog/bibs/${id}/cover`, form);
  },

  // Reference lists
  listAuthors: async (orgSlug: string): Promise<NamedEntity[]> => {
    const res = await apiClient.get<{ data?: NamedEntity[] } | NamedEntity[]>(`${libBase(orgSlug)}/catalog/authors`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  listPublishers: async (orgSlug: string): Promise<NamedEntity[]> => {
    const res = await apiClient.get<{ data?: NamedEntity[] } | NamedEntity[]>(`${libBase(orgSlug)}/catalog/publishers`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  listSubjects: async (orgSlug: string): Promise<NamedEntity[]> => {
    const res = await apiClient.get<{ data?: NamedEntity[] } | NamedEntity[]>(`${libBase(orgSlug)}/catalog/subjects`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  listCollections: async (orgSlug: string): Promise<NamedEntity[]> => {
    const res = await apiClient.get<{ data?: NamedEntity[] } | NamedEntity[]>(`${libBase(orgSlug)}/catalog/collections`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  createCollection: (orgSlug: string, name: string) =>
    apiClient.post<NamedEntity>(`${libBase(orgSlug)}/catalog/collections`, { name }),
};
