import { apiClient } from './client';
import type { PaymentMethod } from './circulation';
import { libBase, normalizePage, type Paginated } from './types';

export type FineStatus = 'outstanding' | 'paid' | 'waived' | 'partial';
export type FineType = 'overdue' | 'lost' | 'damaged' | 'membership' | 'rental' | 'replacement' | 'processing' | 'other';

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
  /** treasury payment intent id — drives the in-app TreasuryPaymentModal. */
  intent_id: string;
  /** treasury initiate URL (POST endpoint the modal/iframe calls). */
  initiate_url: string;
  amount?: string | number;
  reference?: string;
}

/** A payment taken at the desk against a fine or fee. Omit amount to settle the whole balance. */
export interface RecordPaymentInput {
  amount?: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  /** Replay guard so a double click or retry cannot record the money twice. */
  client_reference?: string;
}

export interface FinePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  received_by?: string;
  paid_at: string;
}

export const finesApi = {
  list: async (orgSlug: string, params?: { status?: FineStatus | ''; member_id?: string; type?: FineType | ''; page?: number; limit?: number }): Promise<Paginated<Fine>> => {
    const res = await apiClient.get<Paginated<Fine> | Fine[]>(`${libBase(orgSlug)}/fines`, params);
    return normalizePage<Fine>(res);
  },

  memberFines: async (orgSlug: string, memberId: string): Promise<Fine[]> => {
    // No paging UI on the member detail page's fine history — request the shared-pagination
    // max explicitly so it doesn't silently shrink now that the backend paginates it.
    const res = await apiClient.get<{ data?: Fine[] } | Fine[]>(`${libBase(orgSlug)}/members/${memberId}/fines`, { limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },

  waive: (orgSlug: string, id: string, reason?: string) =>
    apiClient.post<Fine>(`${libBase(orgSlug)}/fines/${id}/waive`, { reason }),

  /** Returns { initiate_url } — the UI redirects to the treasury pay page. */
  pay: (orgSlug: string, id: string) =>
    apiClient.post<PayResult>(`${libBase(orgSlug)}/fines/${id}/pay`, {}),

  /** Records cash, M-Pesa, card or bank money taken at the desk. No treasury involved. */
  recordPayment: (orgSlug: string, id: string, data: RecordPaymentInput) =>
    apiClient.post<Fine>(`${libBase(orgSlug)}/fines/${id}/record-payment`, data),

  payments: (orgSlug: string, id: string) =>
    apiClient.get<FinePayment[]>(`${libBase(orgSlug)}/fines/${id}/payments`),

  // Membership fees are assessed as a fine of type=membership.
  assessMembershipFee: (orgSlug: string, data: MembershipFeeInput) =>
    apiClient.post<Fine>(`${libBase(orgSlug)}/fines/membership`, data),
};
