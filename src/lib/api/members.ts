import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type MemberStatus = 'active' | 'suspended' | 'expired' | 'pending';

export const MEMBER_STATUSES: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
];

export interface Member {
  id: string;
  membership_no: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  tier_id?: string;
  tier_name?: string;
  status: MemberStatus;
  sso_user_id?: string | null;
  crm_customer_id?: string | null;
  branch_id?: string;
  joined_at?: string;
  expires_at?: string | null;
  address?: string;
  notes?: string;
  // summary counts enriched by library-api
  active_loans?: number;
  outstanding_fines?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MemberInput {
  membership_no?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  tier_id?: string;
  status?: MemberStatus;
  sso_user_id?: string;
  crm_customer_id?: string;
  branch_id?: string;
  expires_at?: string;
  address?: string;
  notes?: string;
}

export interface MemberTier {
  id: string;
  name: string;
  max_loans: number;
  loan_period_days: number;
  max_renewals: number;
  max_holds: number;
  daily_fine_rate: number;
  membership_fee?: number;
  description?: string;
}

export interface MemberTierInput {
  name: string;
  max_loans: number;
  loan_period_days: number;
  max_renewals: number;
  max_holds: number;
  daily_fine_rate: number;
  membership_fee?: number;
  description?: string;
}

export interface LoanPolicy {
  id: string;
  name: string;
  format?: string;
  tier_id?: string;
  loan_period_days: number;
  max_renewals: number;
  daily_fine_rate: number;
  grace_period_days?: number;
  max_fine_cap?: number;
}

export interface LoanPolicyInput {
  name: string;
  format?: string;
  tier_id?: string;
  loan_period_days: number;
  max_renewals: number;
  daily_fine_rate: number;
  grace_period_days?: number;
  max_fine_cap?: number;
}

export const membersApi = {
  list: async (orgSlug: string, params?: { q?: string; status?: MemberStatus | ''; tier_id?: string; page?: number; limit?: number }): Promise<Paginated<Member>> => {
    const res = await apiClient.get<Paginated<Member> | Member[]>(`${libBase(orgSlug)}/members`, params);
    return normalizePage<Member>(res);
  },
  get: (orgSlug: string, id: string) => apiClient.get<Member>(`${libBase(orgSlug)}/members/${id}`),
  create: (orgSlug: string, data: MemberInput) => apiClient.post<Member>(`${libBase(orgSlug)}/members`, data),
  update: (orgSlug: string, id: string, data: Partial<MemberInput>) => apiClient.put<Member>(`${libBase(orgSlug)}/members/${id}`, data),

  // Member tiers
  listTiers: async (orgSlug: string): Promise<MemberTier[]> => {
    const res = await apiClient.get<{ data?: MemberTier[] } | MemberTier[]>(`${libBase(orgSlug)}/member-tiers`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  createTier: (orgSlug: string, data: MemberTierInput) => apiClient.post<MemberTier>(`${libBase(orgSlug)}/member-tiers`, data),
  updateTier: (orgSlug: string, id: string, data: Partial<MemberTierInput>) => apiClient.put<MemberTier>(`${libBase(orgSlug)}/member-tiers/${id}`, data),

  // Loan policies
  listPolicies: async (orgSlug: string): Promise<LoanPolicy[]> => {
    const res = await apiClient.get<{ data?: LoanPolicy[] } | LoanPolicy[]>(`${libBase(orgSlug)}/loan-policies`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  createPolicy: (orgSlug: string, data: LoanPolicyInput) => apiClient.post<LoanPolicy>(`${libBase(orgSlug)}/loan-policies`, data),
  updatePolicy: (orgSlug: string, id: string, data: Partial<LoanPolicyInput>) => apiClient.put<LoanPolicy>(`${libBase(orgSlug)}/loan-policies/${id}`, data),

  // Membership fees (treasury-settled; reference_type membership_fee)
  listMembershipFees: async (orgSlug: string, status?: string): Promise<MembershipFee[]> => {
    const res = await apiClient.get<{ data?: MembershipFee[] } | MembershipFee[]>(`${libBase(orgSlug)}/membership-fees`, status ? { status } : undefined);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  issueMembershipFee: (orgSlug: string, memberId: string) =>
    apiClient.post<{ intent_id: string; initiate_url: string; amount: string }>(`${libBase(orgSlug)}/members/${memberId}/membership-fee`, {}),
  payMembershipFee: (orgSlug: string, feeId: string) =>
    apiClient.post<{ intent_id: string; initiate_url: string; amount: string }>(`${libBase(orgSlug)}/membership-fees/${feeId}/pay`, {}),
};

export interface MembershipFee {
  id: string;
  member_id: string;
  amount: string | number;
  status: 'PENDING' | 'PAID' | 'WAIVED' | 'CANCELLED';
  period_start?: string;
  period_end?: string;
  created_at?: string;
}
