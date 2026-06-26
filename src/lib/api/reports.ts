import { apiClient } from './client';
import { libBase } from './types';

export interface LibrarySummary {
  active_loans: number;
  overdue_loans: number;
  holds_ready: number;
  holds_pending: number;
  total_members: number;
  active_members: number;
  total_titles: number;
  total_copies: number;
  available_copies: number;
  outstanding_fines: number;
  checkouts_today?: number;
  returns_today?: number;
  // optional time series for charts
  circulation_trend?: { date: string; checkouts: number; returns: number }[];
  popular_titles?: { id: string; title: string; loans: number }[];
}

export const reportsApi = {
  summary: (orgSlug: string) =>
    apiClient.get<LibrarySummary>(`${libBase(orgSlug)}/reports/summary`),

  circulation: (orgSlug: string, params?: { from?: string; to?: string; branch_id?: string }) =>
    apiClient.get<{ data: { date: string; checkouts: number; returns: number }[] }>(`${libBase(orgSlug)}/reports/circulation`, params),

  overdue: (orgSlug: string) =>
    apiClient.get<{ data: unknown[] }>(`${libBase(orgSlug)}/reports/overdue`),

  popular: (orgSlug: string, params?: { limit?: number; days?: number }) =>
    apiClient.get<{ data: { id: string; title: string; loans: number }[] }>(`${libBase(orgSlug)}/reports/popular`, params),
};
