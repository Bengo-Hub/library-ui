import { apiClient } from './client';
import { libBase } from './types';

// No paging UI on the "my account" self-service pages — these previously hardcoded a backend
// Limit(50). Pass the same explicit limit so the visible history doesn't silently shrink to the
// generic pagination default now that the backend paginates these via the shared package.
const MY_ACCOUNT_LIMIT = { limit: 50 };

export const myAccountApi = {
  loans: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/loans`, MY_ACCOUNT_LIMIT),

  holds: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/holds`, MY_ACCOUNT_LIMIT),

  fines: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/fines`, MY_ACCOUNT_LIMIT),

  placeHold: (orgSlug: string, data: { bib_record_id: string; copy_id?: string; branch_id?: string }) =>
    apiClient.post<unknown>(`${libBase(orgSlug)}/me/holds`, data),

  renewLoan: (orgSlug: string, loanId: string) =>
    apiClient.post<unknown>(`${libBase(orgSlug)}/me/loans/${loanId}/renew`),

  payFine: (orgSlug: string, fineId: string) =>
    apiClient.post<{ intent_id: string; initiate_url: string; amount: number }>(`${libBase(orgSlug)}/me/fines/${fineId}/pay`),
};
