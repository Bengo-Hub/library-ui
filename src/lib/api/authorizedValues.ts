import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export interface AuthorizedValue {
  id: string;
  category: string;
  value: string;
  label: string | null;
  description: string | null;
  is_system: boolean;
  display_order: number;
  is_active: boolean;
}

export interface AuthorizedValueInput {
  category: string;
  value: string;
  label?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export const authorizedValuesApi = {
  listCategories: async (orgSlug: string): Promise<string[]> => {
    // No paging UI here — request the shared-pagination max explicitly so the category list
    // doesn't silently shrink to the default page size now that the backend paginates it.
    const res = await apiClient.get<{ data: string[] }>(`${libBase(orgSlug)}/admin/authorized-values/categories`, { limit: 100 });
    return res?.data ?? [];
  },
  list: async (orgSlug: string, category?: string): Promise<Paginated<AuthorizedValue>> => {
    // No paging UI here either — same reasoning as listCategories above.
    const qs = `?limit=100${category ? `&category=${encodeURIComponent(category)}` : ''}`;
    const res = await apiClient.get<Paginated<AuthorizedValue> | AuthorizedValue[]>(
      `${libBase(orgSlug)}/admin/authorized-values${qs}`
    );
    return normalizePage<AuthorizedValue>(res);
  },
  create: (orgSlug: string, data: AuthorizedValueInput) =>
    apiClient.post<AuthorizedValue>(`${libBase(orgSlug)}/admin/authorized-values`, data),
  update: (orgSlug: string, id: string, data: Partial<AuthorizedValueInput>) =>
    apiClient.put<AuthorizedValue>(`${libBase(orgSlug)}/admin/authorized-values/${id}`, data),
  delete: (orgSlug: string, id: string) =>
    apiClient.delete<{ status: string }>(`${libBase(orgSlug)}/admin/authorized-values/${id}`),
};
