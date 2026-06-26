import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type FineStatus = 'outstanding' | 'paid' | 'waived' | 'partial';
export type FineType = 'overdue' | 'lost' | 'damaged' | 'membership' | 'processing' | 'other';

export interface Fine {
  id: string;
  member_id: string;
  member_name?: string;
  membership_no?: string;
  loan_id?: string | null;
  bib_title?: string;
  type: FineType;
  status: FineStatus;
  amount: number;
  amount_paid?: number;
  balance?: number;
  reason?: string;
  assessed_at: string;
  paid_at?: string | null;
  waived_at?: string | null;
  waived_by?: string;
}

export interface MembershipFeeInput {
  member_id: string;
  amount: number;
  reason?: string;
}

export interface PayResult {
  /** treasury-hosted payment page the UI redirects to. */
  initiate_url: string;
  reference?: string;
}

export const finesApi = {
  list: async (orgSlug: string, params?: { status?: FineStatus | ''; member_id?: string; type?: FineType | ''; page?: number; limit?: number }): Promise<Paginated<Fine>> => {
    const res = await apiClient.get<Paginated<Fine> | Fine[]>(`${libBase(orgSlug)}/fines`, params);
    return normalizePage<Fine>(res);
  },

  memberFines: async (orgSlug: string, memberId: string): Promise<Fine[]> => {
    const res = await apiClient.get<{ data?: Fine[] } | Fine[]>(`${libBase(orgSlug)}/members/${memberId}/fines`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },

  waive: (orgSlug: string, id: string, reason?: string) =>
    apiClient.post<Fine>(`${libBase(orgSlug)}/fines/${id}/waive`, { reason }),

  /** Returns { initiate_url } — the UI redirects to the treasury pay page. */
  pay: (orgSlug: string, id: string) =>
    apiClient.post<PayResult>(`${libBase(orgSlug)}/fines/${id}/pay`, {}),

  // Membership fees are assessed as a fine of type=membership.
  assessMembershipFee: (orgSlug: string, data: MembershipFeeInput) =>
    apiClient.post<Fine>(`${libBase(orgSlug)}/fines/membership`, data),
};
