import { apiClient } from './client';
import { libBase } from './types';

export const myAccountApi = {
  loans: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/loans`),

  holds: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/holds`),

  fines: (orgSlug: string) =>
    apiClient.get<{ data: unknown[]; total: number }>(`${libBase(orgSlug)}/me/fines`),

  placeHold: (orgSlug: string, data: { bib_record_id: string; copy_id?: string; branch_id?: string }) =>
    apiClient.post<unknown>(`${libBase(orgSlug)}/me/holds`, data),

  renewLoan: (orgSlug: string, loanId: string) =>
    apiClient.post<unknown>(`${libBase(orgSlug)}/me/loans/${loanId}/renew`),

  payFine: (orgSlug: string, fineId: string) =>
    apiClient.post<{ intent_id: string; initiate_url: string; amount: number }>(`${libBase(orgSlug)}/me/fines/${fineId}/pay`),
};
