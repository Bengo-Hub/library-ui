import { apiClient } from './client';
import { libBase } from './types';

export interface StaffProfile {
  user_id: string;
  name: string;
  roles?: string[];
  has_pin: boolean;
}

export interface PinLoginResult {
  access_token: string;
  token_type: string;
  user_id: string;
  name: string;
  roles: string[];
  expires_in: number;
}

export const pinApi = {
  /** Public — staff who have a PIN set, for the keypad picker. */
  profiles: async (orgSlug: string): Promise<StaffProfile[]> => {
    const res = await apiClient.get<{ data?: StaffProfile[] } | StaffProfile[]>(`${libBase(orgSlug)}/auth/pin/profiles`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  /** Public — validate a PIN, returns a short-lived terminal JWT. */
  login: (orgSlug: string, userId: string, pin: string) =>
    apiClient.post<PinLoginResult>(`${libBase(orgSlug)}/auth/pin`, { user_id: userId, pin }),
  /** SSO-authed — manager sets/replaces a staff member's PIN. */
  setPin: (orgSlug: string, userId: string, pin: string) =>
    apiClient.post<{ updated: boolean }>(`${libBase(orgSlug)}/auth/pin/set`, { user_id: userId, pin }),
};
