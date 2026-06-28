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

/**
 * Anti-corruption layer between the UI's friendly field names and the library-api / Ent model.
 * The backend stores MARC-style names (isbn13/isbn10, publisher_name, ddc_classification,
 * lc_call_number, summary, cover_image_url, page_count, authors[]) and a 4-value format enum
 * (PHYSICAL/EBOOK/AUDIOBOOK/PERIODICAL). The UI speaks isbn/publisher/dewey/call_number/
 * description/cover_url/pages/author and a richer lowercase format list. Without this mapping,
 * ISBN-prefilled details were silently dropped on save and not shown on read.
 */
const FORMAT_TO_API: Record<BibFormat, string> = {
  book: 'PHYSICAL', ebook: 'EBOOK', audiobook: 'AUDIOBOOK', periodical: 'PERIODICAL',
  dvd: 'PHYSICAL', map: 'PHYSICAL', thesis: 'PHYSICAL', other: 'PHYSICAL',
};
const FORMAT_FROM_API: Record<string, BibFormat> = {
  PHYSICAL: 'book', EBOOK: 'ebook', AUDIOBOOK: 'audiobook', PERIODICAL: 'periodical',
};

/** Map a UI BibInput to the backend's create/update payload shape. */
function toBibPayload(input: Partial<BibInput>): Record<string, unknown> {
  const isbnClean = (input.isbn ?? '').replace(/[^0-9Xx]/g, '');
  const authors = input.authors?.length
    ? input.authors
    : (input.author ? input.author.split(',').map((s) => s.trim()).filter(Boolean) : undefined);
  const payload: Record<string, unknown> = {};
  const put = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== '') payload[k] = v; };
  put('title', input.title);
  put('subtitle', input.subtitle);
  put('isbn13', isbnClean.length === 10 ? undefined : isbnClean);
  put('isbn10', isbnClean.length === 10 ? isbnClean : undefined);
  if (authors?.length) payload.authors = authors;
  put('publisher_name', input.publisher);
  put('issn', input.issn);
  put('edition', input.edition);
  put('language', input.language);
  put('ddc_classification', input.dewey);
  put('lc_call_number', input.call_number);
  put('summary', input.description);
  put('cover_image_url', input.cover_url);
  put('collection_id', input.collection_id);
  if (input.publication_year != null) payload.publication_year = input.publication_year;
  if (input.pages != null) payload.page_count = input.pages;
  if (input.format) payload.format = FORMAT_TO_API[input.format] ?? 'PHYSICAL';
  return payload;
}

/** Map a backend bib record (Ent JSON) back to the UI's BibRecord shape (keeps availability fields). */
function fromBibRecord(raw: BibRecord | Record<string, unknown> | null | undefined): BibRecord {
  const r = (raw ?? {}) as Record<string, any>;
  const authors: string[] | undefined = Array.isArray(r.authors) ? r.authors : undefined;
  return {
    ...r,
    isbn: r.isbn ?? r.isbn13 ?? r.isbn10 ?? undefined,
    author: r.author ?? (authors?.length ? authors.join(', ') : undefined),
    authors,
    publisher: r.publisher ?? r.publisher_name ?? undefined,
    dewey: r.dewey ?? r.ddc_classification ?? undefined,
    call_number: r.call_number ?? r.lc_call_number ?? undefined,
    description: r.description ?? r.summary ?? undefined,
    cover_url: r.cover_url ?? r.cover_image_url ?? undefined,
    pages: r.pages ?? r.page_count ?? undefined,
    format: FORMAT_FROM_API[r.format] ?? (r.format as BibFormat) ?? 'book',
  } as BibRecord;
}

export const catalogApi = {
  listBibs: async (orgSlug: string, params?: BibListParams): Promise<Paginated<BibRecord>> => {
    const res = await apiClient.get<Paginated<BibRecord> | BibRecord[]>(`${libBase(orgSlug)}/catalog/bibs`, params);
    const page = normalizePage<BibRecord>(res);
    return { ...page, data: page.data.map(fromBibRecord) };
  },

  getBib: async (orgSlug: string, id: string) =>
    fromBibRecord(await apiClient.get<BibRecord>(`${libBase(orgSlug)}/catalog/bibs/${id}`)),

  createBib: async (orgSlug: string, data: BibInput) =>
    fromBibRecord(await apiClient.post<BibRecord>(`${libBase(orgSlug)}/catalog/bibs`, toBibPayload(data))),

  updateBib: async (orgSlug: string, id: string, data: Partial<BibInput>) =>
    fromBibRecord(await apiClient.put<BibRecord>(`${libBase(orgSlug)}/catalog/bibs/${id}`, toBibPayload(data))),

  deleteBib: (orgSlug: string, id: string) =>
    apiClient.delete<void>(`${libBase(orgSlug)}/catalog/bibs/${id}`),

  search: async (orgSlug: string, q: string, params?: { format?: string; subject_id?: string; collection_id?: string; branch_id?: string; language?: string; available?: boolean; page?: number; limit?: number }): Promise<Paginated<BibRecord>> => {
    const res = await apiClient.get<Paginated<BibRecord> | BibRecord[]>(`${libBase(orgSlug)}/catalog/search`, { q, ...params });
    const page = normalizePage<BibRecord>(res);
    return { ...page, data: page.data.map(fromBibRecord) };
  },

  /** Facet values for the OPAC filter UI (formats / subjects / collections / branches / languages). */
  facets: (orgSlug: string) =>
    apiClient.get<{ formats: string[]; subjects: { id: string; name: string }[]; collections: { id: string; name: string }[]; branches: { id: string; name: string }[]; languages: string[] }>(`${libBase(orgSlug)}/catalog/facets`),

  /** MARCXML / MARC-in-JSON export + MARC-lite import. */
  marcXmlUrl: (orgSlug: string, id: string) => `${apiClient.baseUrl}${libBase(orgSlug)}/catalog/bibs/${id}/marc.xml`,
  importMarc: async (orgSlug: string, data: Partial<BibInput>) =>
    fromBibRecord(await apiClient.post<BibRecord>(`${libBase(orgSlug)}/catalog/import/marc`, toBibPayload(data))),

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
