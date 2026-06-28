import { apiClient } from './client';
import { libBase } from './types';

export interface StaffProfile {
  user_id: string;
  name: string;
  roles?: string[];
  has_pin: boolean;
  is_admin?: boolean;
}

export interface PinBranch {
  id: string;
  name: string;
  code: string;
  is_default?: boolean;
}

export interface PinLoginResult {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
  roles: string[];
  is_admin?: boolean;
  branch_id?: string;
  branch_name?: string;
  expires_in: number;
}

export const pinApi = {
  /** Public — active branches for the branch picker (desk/kiosk chooses a branch first). */
  branches: async (orgSlug: string): Promise<PinBranch[]> => {
    const res = await apiClient.get<{ data?: PinBranch[] } | PinBranch[]>(`${libBase(orgSlug)}/auth/pin/branches`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  /** Public — staff who have a PIN set, optionally scoped to a branch, for the keypad picker. */
  profiles: async (orgSlug: string, branchId?: string): Promise<StaffProfile[]> => {
    const q = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    const res = await apiClient.get<{ data?: StaffProfile[] } | StaffProfile[]>(`${libBase(orgSlug)}/auth/pin/profiles${q}`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  /** Public — validate a profile's PIN at a branch, returns a short-lived terminal JWT. */
  login: (orgSlug: string, userId: string, pin: string, branchId?: string) =>
    apiClient.post<PinLoginResult>(`${libBase(orgSlug)}/auth/pin`, { user_id: userId, pin, branch_id: branchId }),
  /** Public — PIN-first login: identify the staff member by PIN at a branch (no profile picker). */
  identify: (orgSlug: string, pin: string, branchId: string) =>
    apiClient.post<PinLoginResult>(`${libBase(orgSlug)}/auth/pin/identify`, { pin, branch_id: branchId }),
  /** SSO-authed — manager sets/replaces a staff member's PIN. */
  setPin: (orgSlug: string, userId: string, pin: string) =>
    apiClient.post<{ updated: boolean }>(`${libBase(orgSlug)}/auth/pin/set`, { user_id: userId, pin }),
};
