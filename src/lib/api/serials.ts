import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerialFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type IssueStatus = 'EXPECTED' | 'RECEIVED' | 'LATE' | 'MISSING' | 'CLAIMED';

export interface SerialSubscription {
  id: string;
  bib_record_id: string;
  vendor_id: string | null;
  fund_id: string | null;
  start_date: string;
  end_date: string | null;
  frequency: SerialFrequency;
  price: string;
  currency_code: string;
  status: SubscriptionStatus;
  notes: string | null;
}

export interface SubscriptionInput {
  bib_record_id: string;
  vendor_id?: string;
  fund_id?: string;
  start_date?: string;
  end_date?: string;
  frequency: SerialFrequency;
  price: number;
  currency_code?: string;
  notes?: string;
}

export interface SerialIssue {
  id: string;
  subscription_id: string;
  volume: string | null;
  issue_no: string | null;
  expected_date: string;
  received_date: string | null;
  status: IssueStatus;
  copy_id: string | null;
  notes: string | null;
}

export interface IssueInput {
  subscription_id: string;
  volume?: string;
  issue_no?: string;
  expected_date?: string;
  notes?: string;
}

export interface SerialRoutingEntry {
  id: string;
  subscription_id: string;
  member_id: string;
  position: number;
}

export interface PredictedIssue {
  expected_date: string;
  volume?: string;
  issue_no?: string;
}

// ── API object ────────────────────────────────────────────────────────────────

export const serialsApi = {
  // Subscriptions
  listSubscriptions: async (orgSlug: string, status?: SubscriptionStatus): Promise<Paginated<SerialSubscription>> => {
    // No paging UI here — request the shared-pagination max explicitly so the subscriptions
    // list doesn't silently shrink to the default page size now that the backend paginates it.
    const qs = `?limit=100${status ? `&status=${status}` : ''}`;
    const res = await apiClient.get<Paginated<SerialSubscription> | SerialSubscription[]>(
      `${libBase(orgSlug)}/serials/subscriptions${qs}`
    );
    return normalizePage<SerialSubscription>(res);
  },
  getSubscription: (orgSlug: string, id: string) =>
    apiClient.get<SerialSubscription>(`${libBase(orgSlug)}/serials/subscriptions/${id}`),
  createSubscription: (orgSlug: string, data: SubscriptionInput) =>
    apiClient.post<SerialSubscription>(`${libBase(orgSlug)}/serials/subscriptions`, data),
  updateSubscription: (orgSlug: string, id: string, data: Partial<SubscriptionInput>) =>
    apiClient.put<SerialSubscription>(`${libBase(orgSlug)}/serials/subscriptions/${id}`, data),
  predictIssues: async (orgSlug: string, id: string): Promise<PredictedIssue[]> => {
    const res = await apiClient.post<{ data: PredictedIssue[] }>(
      `${libBase(orgSlug)}/serials/subscriptions/${id}/predict`
    );
    return res?.data ?? [];
  },

  // Routing
  listRouting: async (orgSlug: string, subId: string): Promise<Paginated<SerialRoutingEntry>> => {
    // No paging UI here — see listSubscriptions above.
    const res = await apiClient.get<Paginated<SerialRoutingEntry> | SerialRoutingEntry[]>(
      `${libBase(orgSlug)}/serials/subscriptions/${subId}/routing`,
      { limit: 100 }
    );
    return normalizePage<SerialRoutingEntry>(res);
  },
  addRouting: (orgSlug: string, subId: string, data: { member_id: string; position: number }) =>
    apiClient.post<SerialRoutingEntry>(`${libBase(orgSlug)}/serials/subscriptions/${subId}/routing`, data),

  // Issues
  listIssues: async (orgSlug: string, params?: { subscription_id?: string; status?: IssueStatus }): Promise<Paginated<SerialIssue>> => {
    const qs = new URLSearchParams();
    if (params?.subscription_id) qs.set('subscription_id', params.subscription_id);
    if (params?.status) qs.set('status', params.status);
    // No paging UI here — see listSubscriptions above.
    qs.set('limit', '100');
    const query = `?${qs}`;
    const res = await apiClient.get<Paginated<SerialIssue> | SerialIssue[]>(
      `${libBase(orgSlug)}/serials/issues${query}`
    );
    return normalizePage<SerialIssue>(res);
  },
  createIssue: (orgSlug: string, data: IssueInput) =>
    apiClient.post<SerialIssue>(`${libBase(orgSlug)}/serials/issues`, data),
  receiveIssue: (orgSlug: string, id: string) =>
    apiClient.post<SerialIssue>(`${libBase(orgSlug)}/serials/issues/${id}/receive`),
  claimIssue: (orgSlug: string, id: string) =>
    apiClient.post<SerialIssue>(`${libBase(orgSlug)}/serials/issues/${id}/claim`),
};
