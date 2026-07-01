import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type HoldStatus = 'pending' | 'ready' | 'fulfilled' | 'cancelled' | 'expired';

export interface Hold {
  id: string;
  bib_record_id: string;
  bib_title?: string;
  member_id: string;
  member_name?: string;
  membership_no?: string;
  status: HoldStatus;
  queue_position?: number;
  placed_at: string;
  ready_at?: string | null;
  expires_at?: string | null;
  pickup_branch_id?: string;
  pickup_branch_name?: string;
}

export interface HoldInput {
  bib_record_id: string;
  member_id: string;
  pickup_branch_id?: string;
  copy_id?: string; // optional — item-level hold for a specific copy
}

export const holdsApi = {
  list: async (orgSlug: string, params?: { status?: HoldStatus | ''; member_id?: string; bib_record_id?: string; page?: number; limit?: number }): Promise<Paginated<Hold>> => {
    const res = await apiClient.get<Paginated<Hold> | Hold[]>(`${libBase(orgSlug)}/holds`, params);
    return normalizePage<Hold>(res);
  },
  place: (orgSlug: string, data: HoldInput) => apiClient.post<Hold>(`${libBase(orgSlug)}/holds`, data),
  markReady: (orgSlug: string, id: string) => apiClient.post<{ ready: boolean }>(`${libBase(orgSlug)}/holds/${id}/ready`, {}),
  cancel: (orgSlug: string, id: string) => apiClient.delete<void>(`${libBase(orgSlug)}/holds/${id}`),
};
