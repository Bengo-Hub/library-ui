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
    const res = await apiClient.get<{ data: string[] }>(`${libBase(orgSlug)}/admin/authorized-values/categories`);
    return res?.data ?? [];
  },
  list: async (orgSlug: string, category?: string): Promise<Paginated<AuthorizedValue>> => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
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
