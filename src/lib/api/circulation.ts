import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost';

export interface Loan {
  id: string;
  copy_id: string;
  copy_barcode?: string;
  bib_record_id?: string;
  bib_title?: string;
  member_id: string;
  member_name?: string;
  membership_no?: string;
  status: LoanStatus;
  in_house?: boolean;
  checked_out_at: string;
  due_date: string;
  returned_at?: string | null;
  renewals?: number;
  max_renewals?: number;
  fine_amount?: number;
  branch_id?: string;
}

export interface CheckoutInput {
  member_id: string;
  copy_barcode: string;
  in_house?: boolean;
  /** Client-generated idempotency key so an offline-queued checkout replays exactly-once. */
  client_reference?: string;
}

export interface CheckoutResult {
  loan: Loan;
  member?: { id: string; full_name?: string; outstanding_fines?: number; active_loans?: number };
  warnings?: string[];
}

export interface ReturnResult {
  loan: Loan;
  fine_amount?: number;
  hold_triggered?: boolean;
  message?: string;
}

export interface LoanListParams {
  status?: LoanStatus | '';
  member_id?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export const circulationApi = {
  checkout: (orgSlug: string, data: CheckoutInput) =>
    apiClient.post<CheckoutResult>(`${libBase(orgSlug)}/circulation/checkout`, data),

  returnCopy: (orgSlug: string, copy_barcode: string) =>
    apiClient.post<ReturnResult>(`${libBase(orgSlug)}/circulation/return`, { copy_barcode }),

  renew: (orgSlug: string, loanId: string) =>
    apiClient.post<Loan>(`${libBase(orgSlug)}/circulation/renew/${loanId}`, {}),

  listLoans: async (orgSlug: string, params?: LoanListParams): Promise<Paginated<Loan>> => {
    const res = await apiClient.get<Paginated<Loan> | Loan[]>(`${libBase(orgSlug)}/circulation/loans`, params);
    return normalizePage<Loan>(res);
  },

  memberLoans: async (orgSlug: string, memberId: string): Promise<Loan[]> => {
    const res = await apiClient.get<{ data?: Loan[] } | Loan[]>(`${libBase(orgSlug)}/members/${memberId}/loans`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
};
