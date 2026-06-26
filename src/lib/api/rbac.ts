import { apiClient } from './client';
import { libBase } from './types';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system?: boolean;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  roles: string[];
  status?: string;
}

export const rbacApi = {
  listRoles: async (orgSlug: string): Promise<Role[]> => {
    const res = await apiClient.get<{ data?: Role[] } | Role[]>(`${libBase(orgSlug)}/rbac/roles`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  listPermissions: async (orgSlug: string): Promise<string[]> => {
    const res = await apiClient.get<{ data?: string[] } | string[]>(`${libBase(orgSlug)}/rbac/permissions`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  updateRole: (orgSlug: string, id: string, data: { permissions: string[]; description?: string }) =>
    apiClient.put<Role>(`${libBase(orgSlug)}/rbac/roles/${id}`, data),
  listTeam: async (orgSlug: string): Promise<TeamMember[]> => {
    const res = await apiClient.get<{ data?: TeamMember[] } | TeamMember[]>(`${libBase(orgSlug)}/team`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  assignRole: (orgSlug: string, userId: string, roles: string[]) =>
    apiClient.put<TeamMember>(`${libBase(orgSlug)}/team/${userId}/roles`, { roles }),
};
