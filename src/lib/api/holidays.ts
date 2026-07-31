import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export interface LibraryHoliday {
  id: string;
  branch_id: string | null;
  holiday_date: string; // ISO timestamp — date portion is what matters
  description: string | null;
  is_recurring: boolean;
}

export interface HolidayInput {
  branch_id?: string | null;
  holiday_date: string; // YYYY-MM-DD
  description?: string;
  is_recurring?: boolean;
}

export const holidaysApi = {
  list: async (orgSlug: string, params?: { branch_id?: string; year?: number }): Promise<Paginated<LibraryHoliday>> => {
    const qs = new URLSearchParams();
    if (params?.branch_id) qs.set('branch_id', params.branch_id);
    if (params?.year) qs.set('year', String(params.year));
    // No paging UI here — request the shared-pagination max explicitly so the holiday list
    // doesn't silently shrink to the default page size now that the backend paginates it.
    qs.set('limit', '100');
    const query = `?${qs}`;
    const res = await apiClient.get<Paginated<LibraryHoliday> | LibraryHoliday[]>(
      `${libBase(orgSlug)}/admin/holidays${query}`
    );
    return normalizePage<LibraryHoliday>(res);
  },
  create: (orgSlug: string, data: HolidayInput) =>
    apiClient.post<LibraryHoliday>(`${libBase(orgSlug)}/admin/holidays`, data),
  update: (orgSlug: string, id: string, data: HolidayInput) =>
    apiClient.put<LibraryHoliday>(`${libBase(orgSlug)}/admin/holidays/${id}`, data),
  delete: (orgSlug: string, id: string) =>
    apiClient.delete<{ status: string }>(`${libBase(orgSlug)}/admin/holidays/${id}`),
};
