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
  circulation_trend?: { date: string; checkouts: number; returns: number }[];
  popular_titles?: { id: string; title: string; loans: number }[];
}

export interface MemberActivityRow {
  member_id: string;
  name: string;
  membership_no: string;
  loans: number;
}

export interface OverdueAgingRow {
  bucket: string;
  count: number;
}

export interface ItemMovementRow {
  copy_id: string;
  barcode: string;
  title: string;
  checkouts: number;
}

export interface FineAgingRow {
  member_id: string;
  name: string;
  membership_no: string;
  days_old: number;
  outstanding: number;
}

export interface AcquisitionSpendReport {
  funds: { fund_id: string; name: string; allocated: number; spent: number; remaining: number }[];
  vendors: { vendor_id: string; name: string; spend: number }[];
}

export interface CatalogStatsReport {
  total_titles: number;
  total_copies: number;
  by_format: { key: string; count: number }[];
  by_language: { key: string; count: number }[];
  by_copy_status: { key: string; count: number }[];
}

export interface EbookUsageReport {
  total_loans: number;
  active_loans_now: number;
  popular_titles: { ebook_id: string; title: string; loans: number; avg_hours: number }[];
}

export const reportsApi = {
  summary: (orgSlug: string) =>
    apiClient.get<LibrarySummary>(`${libBase(orgSlug)}/reports/summary`),

  circulation: (orgSlug: string, params?: { from?: string; to?: string; branch_id?: string }) =>
    apiClient.get<{ data: { date: string; checkouts: number; returns: number }[] }>(`${libBase(orgSlug)}/reports/circulation`, params),

  // No paging UI (dashboard widget) — this previously hardcoded a backend Limit(200); pass the
  // same explicit limit so it doesn't silently shrink to the generic pagination default now
  // that the backend paginates it via the shared package.
  overdue: (orgSlug: string) =>
    apiClient.get<{ data: unknown[] }>(`${libBase(orgSlug)}/reports/overdue`, { limit: 100 }),

  popular: (orgSlug: string, params?: { limit?: number; days?: number }) =>
    apiClient.get<{ data: { id: string; title: string; loans: number }[] }>(`${libBase(orgSlug)}/reports/popular`, params),

  memberActivity: (orgSlug: string, params?: { days?: number }) =>
    apiClient.get<{ data: MemberActivityRow[]; total: number }>(`${libBase(orgSlug)}/reports/member-activity`, params),

  overdueAging: (orgSlug: string) =>
    apiClient.get<{ data: OverdueAgingRow[]; total: number }>(`${libBase(orgSlug)}/reports/overdue-aging`),

  itemMovement: (orgSlug: string, params?: { days?: number }) =>
    apiClient.get<{ data: ItemMovementRow[]; total: number }>(`${libBase(orgSlug)}/reports/item-movement`, params),

  fineAging: (orgSlug: string) =>
    apiClient.get<{ data: FineAgingRow[]; total: number }>(`${libBase(orgSlug)}/reports/fine-aging`),

  acquisitionSpend: (orgSlug: string) =>
    apiClient.get<AcquisitionSpendReport>(`${libBase(orgSlug)}/reports/acquisition-spend`),

  catalogStats: (orgSlug: string) =>
    apiClient.get<CatalogStatsReport>(`${libBase(orgSlug)}/reports/catalog-stats`),

  ebookUsage: (orgSlug: string, params?: { days?: number }) =>
    apiClient.get<EbookUsageReport>(`${libBase(orgSlug)}/reports/ebook-usage`, params),

  memberTrend: (orgSlug: string, params?: { days?: number }) =>
    apiClient.get<{ data: { date: string; count: number }[]; total: number }>(`${libBase(orgSlug)}/reports/member-trend`, params),

  csvUrl: (orgSlug: string, endpoint: string) =>
    `${libBase(orgSlug)}/reports/${endpoint}?format=csv`,
};
