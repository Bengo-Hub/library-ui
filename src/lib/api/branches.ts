import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_hq?: boolean;
  status?: string;
  opening_hours?: string;
}

export interface BranchInput {
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_hq?: boolean;
  opening_hours?: string;
}

export const branchesApi = {
  list: async (orgSlug: string): Promise<Paginated<Branch>> => {
    const res = await apiClient.get<Paginated<Branch> | Branch[]>(`${libBase(orgSlug)}/branches`);
    return normalizePage<Branch>(res);
  },
  create: (orgSlug: string, data: BranchInput) => apiClient.post<Branch>(`${libBase(orgSlug)}/branches`, data),
  update: (orgSlug: string, id: string, data: Partial<BranchInput>) => apiClient.put<Branch>(`${libBase(orgSlug)}/branches/${id}`, data),
};
