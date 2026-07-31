import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export interface CirculationRule {
  id: string;
  branch_id: string | null;
  tier_id: string | null;
  item_format: 'PHYSICAL' | 'EBOOK' | 'AUDIOBOOK' | 'PERIODICAL' | null;
  loan_period_days: number;
  loan_period_hours: number;
  is_hourly: boolean;
  max_renewals: number;
  holdable: boolean;
  fine_per_day: string;
  grace_days: number;
  max_fine_cap: string;
  cap_fine_at_replacement_price: boolean;
  rental_charge: string;
  replacement_cost: string;
  processing_fee: string;
  due_date_mode: 'DAYS' | 'CALENDAR' | 'DATEDUE' | 'DAYWEEK';
  label: string | null;
}

export type CirculationRuleInput = {
  branch_id?: string | null;
  tier_id?: string | null;
  item_format?: string | null;
  loan_period_days: number;
  loan_period_hours?: number;
  is_hourly?: boolean;
  max_renewals: number;
  holdable?: boolean;
  fine_per_day?: string;
  grace_days?: number;
  max_fine_cap?: string;
  cap_fine_at_replacement_price?: boolean;
  rental_charge?: string;
  replacement_cost?: string;
  processing_fee?: string;
  due_date_mode?: string;
  label?: string;
};

export const ITEM_FORMATS = [
  { value: '', label: 'All formats' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'EBOOK', label: 'E-book' },
  { value: 'AUDIOBOOK', label: 'Audiobook' },
  { value: 'PERIODICAL', label: 'Periodical' },
] as const;

export const DUE_DATE_MODES = [
  { value: 'DAYS', label: 'Days (raw count)' },
  { value: 'CALENDAR', label: 'Calendar (skip closed days)' },
  { value: 'DATEDUE', label: 'Date-due (push past closure)' },
  { value: 'DAYWEEK', label: 'Day-of-week (push to matching open weekday)' },
] as const;

export const circulationRulesApi = {
  list: async (orgSlug: string, branchId?: string): Promise<Paginated<CirculationRule>> => {
    // No paging UI here — this renders as a full matrix, so request the shared-pagination max
    // explicitly rather than letting it silently shrink to the default page size now that the
    // backend paginates it.
    const qs = `?limit=100${branchId ? `&branch_id=${branchId}` : ''}`;
    const res = await apiClient.get<Paginated<CirculationRule> | CirculationRule[]>(
      `${libBase(orgSlug)}/admin/circulation-rules${qs}`
    );
    return normalizePage<CirculationRule>(res);
  },
  create: (orgSlug: string, data: CirculationRuleInput) =>
    apiClient.post<CirculationRule>(`${libBase(orgSlug)}/admin/circulation-rules`, data),
  update: (orgSlug: string, id: string, data: CirculationRuleInput) =>
    apiClient.put<CirculationRule>(`${libBase(orgSlug)}/admin/circulation-rules/${id}`, data),
  delete: (orgSlug: string, id: string) =>
    apiClient.delete<{ status: string }>(`${libBase(orgSlug)}/admin/circulation-rules/${id}`),
};
