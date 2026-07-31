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
  user_id: string;
  email: string;
  full_name?: string;
  name?: string;
  roles: string[];
  branch_ids?: string[];
  is_active?: boolean;
  has_pin?: boolean;
}

export interface LibraryBranch {
  id: string;
  name: string;
  code: string;
  is_default?: boolean;
  is_active?: boolean;
}

export const rbacApi = {
  // No paging UI here — the roles list and (especially) the ~70-entry permission catalog are
  // rendered as a full matrix, so request the shared-pagination max explicitly rather than
  // letting them silently shrink to the default page size now that the backend paginates them.
  listRoles: async (orgSlug: string): Promise<Role[]> => {
    const res = await apiClient.get<{ data?: Role[] } | Role[]>(`${libBase(orgSlug)}/rbac/roles`, { limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  // API returns either bare codes or {code,label} objects — normalize to code strings (the
  // matrix groups by code.split('.')). Was the source of the "e.split is not a function" crash.
  listPermissions: async (orgSlug: string): Promise<string[]> => {
    const res = await apiClient.get<{ data?: Array<string | { code: string }> } | Array<string | { code: string }>>(`${libBase(orgSlug)}/rbac/permissions`, { limit: 100 });
    const arr = Array.isArray(res) ? res : (res.data ?? []);
    return arr.map((p) => (typeof p === 'string' ? p : p?.code)).filter((c): c is string => typeof c === 'string' && c.length > 0);
  },
  createRole: (orgSlug: string, data: { name: string; description?: string; permissions?: string[] }) =>
    apiClient.post<Role>(`${libBase(orgSlug)}/rbac/roles`, data),
  updateRole: (orgSlug: string, id: string, data: { permissions: string[]; description?: string }) =>
    apiClient.put<Role>(`${libBase(orgSlug)}/rbac/roles/${id}`, data),
  deleteRole: (orgSlug: string, id: string) =>
    apiClient.delete<void>(`${libBase(orgSlug)}/rbac/roles/${id}`),
  listTeam: async (orgSlug: string): Promise<TeamMember[]> => {
    // No paging UI here — request the shared-pagination max explicitly, same reasoning as
    // listRoles/listPermissions above.
    const res = await apiClient.get<{ data?: TeamMember[] } | TeamMember[]>(`${libBase(orgSlug)}/team`, { limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  assignRole: (orgSlug: string, userId: string, roles: string[]) =>
    apiClient.put<TeamMember>(`${libBase(orgSlug)}/team/${userId}/roles`, { roles }),
  assignBranches: (orgSlug: string, userId: string, branchIds: string[]) =>
    apiClient.put<{ updated: boolean }>(`${libBase(orgSlug)}/team/${userId}/branches`, { branch_ids: branchIds }),
  listBranches: async (orgSlug: string): Promise<LibraryBranch[]> => {
    const res = await apiClient.get<{ data?: LibraryBranch[] } | LibraryBranch[]>(`${libBase(orgSlug)}/branches`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
};
