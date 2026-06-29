import { apiClient } from './client';
import { libBase } from './types';

export interface DocumentSequence {
  id: string;
  kind: string;
  label: string;
  prefix: string;
  format: string;
  pad_width: number;
  reset_period: 'none' | 'yearly' | 'monthly';
  next_value: number;
  preview: string;
}

export interface SequenceUpdate {
  prefix?: string;
  format?: string;
  pad_width?: number;
  reset_period?: string;
  next_value?: number;
}

export const RESET_PERIODS: { value: string; label: string }[] = [
  { value: 'none', label: 'Never (continuous)' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
];

/** Render a sequence template client-side for a live preview (mirrors the backend Render()). */
export function renderSequence(format: string, prefix: string, padWidth: number, value = 1): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const tmpl = format || '{prefix}{seq}';
  return tmpl
    .replaceAll('{prefix}', prefix)
    .replaceAll('{seq}', String(value).padStart(Math.max(1, padWidth || 1), '0'))
    .replaceAll('{yy}', yyyy.slice(-2))
    .replaceAll('{yyyy}', yyyy)
    .replaceAll('{mm}', String(now.getMonth() + 1).padStart(2, '0'));
}

export const sequencesApi = {
  list: async (orgSlug: string): Promise<DocumentSequence[]> => {
    const res = await apiClient.get<{ data?: DocumentSequence[] } | DocumentSequence[]>(`${libBase(orgSlug)}/settings/sequences`);
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  update: (orgSlug: string, kind: string, data: SequenceUpdate) =>
    apiClient.put<DocumentSequence>(`${libBase(orgSlug)}/settings/sequences/${kind}`, data),
};
