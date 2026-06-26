/** Shared API envelope + helpers for library-api domain modules. */

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function emptyPage<T>(limit = 20): Paginated<T> {
  return { data: [], total: 0, page: 1, limit, hasMore: false };
}

/**
 * Normalize a list response that may come back as a bare array OR a paginated envelope.
 * library-api list endpoints return `{ data, total, page, limit, has_more }`; some return
 * a bare array — this collapses both to a consistent Paginated<T>.
 */
export function normalizePage<T>(res: Paginated<T> | T[] | { data?: T[]; total?: number; page?: number; limit?: number; has_more?: boolean; hasMore?: boolean }): Paginated<T> {
  if (Array.isArray(res)) {
    return { data: res, total: res.length, page: 1, limit: res.length || 20, hasMore: false };
  }
  const data = (res?.data ?? []) as T[];
  return {
    data,
    total: (res as any)?.total ?? data.length,
    page: (res as any)?.page ?? 1,
    limit: (res as any)?.limit ?? data.length ?? 20,
    hasMore: (res as any)?.hasMore ?? (res as any)?.has_more ?? false,
  };
}

/** Build the tenant-scoped library base path: /api/v1/{tenant}/library. */
export function libBase(orgSlug: string): string {
  return `/api/v1/${orgSlug}/library`;
}
