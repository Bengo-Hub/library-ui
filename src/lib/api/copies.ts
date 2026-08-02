import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

export type CopyStatus = 'available' | 'on_loan' | 'on_hold' | 'in_transit' | 'lost' | 'damaged' | 'withdrawn' | 'reference';

export const COPY_STATUSES: { value: CopyStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'on_loan', label: 'On Loan' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'reference', label: 'Reference Only' },
  { value: 'lost', label: 'Lost' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export interface Copy {
  id: string;
  bib_record_id: string;
  bib_title?: string;
  barcode: string;
  call_number?: string;
  status: CopyStatus;
  branch_id?: string;
  branch_name?: string;
  shelf_location?: string;
  acquisition_date?: string;
  price?: number | null;
  condition?: string;
  notes?: string;
  current_loan_id?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Label-print format/template options (mirrors library-api's LabelTemplateByName/resolveTemplate
// — see library-api/docs/barcode-labels.md). format defaults to "avery_a4" server-side when
// omitted, so old callers with no opinion keep getting the pre-existing Avery-sheet PDF.
export type LabelFormat = 'avery_a4' | 'thermal_tspl';
// Internal-only pseudo-format for copiesApi.printLabels — NOT a user-facing choice (see the
// Format radio in copies/page.tsx, which only offers LabelFormat above). Renders a PDF matching
// EXACTLY what thermal_tspl would print (same template, per-label pages, rotation) instead of
// printer command bytes, so the bulk dialog can always preview the actual thermal layout before
// dispatching anything to the printer — see docs/barcode-labels.md.
export type BulkPrintFormat = LabelFormat | 'thermal_preview';
export type LabelTemplateName = '1row_29x62' | '2row_35x29' | '3row_23x29' | '4row_17x29' | 'custom';

export interface LabelPrintOpts {
  format?: LabelFormat;
  template?: LabelTemplateName;
  rotate?: boolean;
  custom_label_w_in?: number;
  custom_label_h_in?: number;
  custom_lanes?: number;
  custom_gap_x_in?: number;
  custom_gap_y_in?: number;
}

export interface CopyInput {
  bib_record_id: string;
  barcode?: string;
  call_number?: string;
  status?: CopyStatus;
  branch_id?: string;
  shelf_location?: string;
  acquisition_date?: string;
  price?: number;
  condition?: string;
  notes?: string;
}

export const copiesApi = {
  listForBib: async (orgSlug: string, bibId: string): Promise<Copy[]> => {
    // No paging UI for a single title's copy list — pass the shared-pagination max explicitly
    // so titles with many copies/branches aren't silently truncated to the default page size.
    const res = await apiClient.get<{ data?: Copy[] } | Copy[]>(`${libBase(orgSlug)}/catalog/bibs/${bibId}/copies`, { limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },

  list: async (orgSlug: string, params?: { status?: CopyStatus | ''; branch_id?: string; q?: string; page?: number; limit?: number }): Promise<Paginated<Copy>> => {
    const res = await apiClient.get<Paginated<Copy> | Copy[]>(`${libBase(orgSlug)}/catalog/copies`, params);
    return normalizePage<Copy>(res);
  },

  getByBarcode: (orgSlug: string, barcode: string) =>
    apiClient.get<Copy>(`${libBase(orgSlug)}/catalog/copies/by-barcode/${encodeURIComponent(barcode)}`),

  create: (orgSlug: string, data: CopyInput) =>
    apiClient.post<Copy>(`${libBase(orgSlug)}/catalog/copies`, data),

  update: (orgSlug: string, id: string, data: Partial<CopyInput>) =>
    apiClient.put<Copy>(`${libBase(orgSlug)}/catalog/copies/${id}`, data),

  delete: (orgSlug: string, id: string) =>
    apiClient.delete<void>(`${libBase(orgSlug)}/catalog/copies/${id}`),

  /** Direct link to the spine/barcode label PDF (carries auth via the apiClient blob fetch). */
  labelUrl: (orgSlug: string, id: string) => `${libBase(orgSlug)}/catalog/copies/${id}/label.pdf`,

  // format/template/rotate select thermal-native TSPL output, or a PDF preview of the exact same
  // thermal layout (format=thermal_preview) instead of the default Avery-sheet-shaped PDF — see
  // library-api/docs/barcode-labels.md.
  labelPdf: (orgSlug: string, id: string, opts?: Omit<LabelPrintOpts, 'format'> & { format?: BulkPrintFormat }) =>
    apiClient.getBlob(`${libBase(orgSlug)}/catalog/copies/${id}/label.pdf`, opts),

  /** Bulk print: renders an Avery-sheet PDF (format=avery_a4, default), a PDF preview matching
   *  the actual thermal layout (format=thermal_preview), or raw TSPL text for the printer
   *  (format=thermal_tspl) of holding labels for many copies at once. */
  printLabels: (orgSlug: string, body: { copy_ids?: string[]; bib_id?: string; branch_id?: string; status?: string; sheet?: string } & Omit<LabelPrintOpts, 'format'> & { format?: BulkPrintFormat }) =>
    apiClient.postBlob(`${libBase(orgSlug)}/catalog/copies/labels/print`, body),

  // Inter-branch transfers
  listTransfers: async (orgSlug: string, status?: string): Promise<CopyTransfer[]> => {
    // No paging UI here — request the shared-pagination max explicitly so the transfers list
    // doesn't silently shrink to the default page size now that the backend paginates it.
    const res = await apiClient.get<{ data?: CopyTransfer[] } | CopyTransfer[]>(`${libBase(orgSlug)}/catalog/transfers`, { ...(status ? { status } : {}), limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  createTransfer: (orgSlug: string, data: { copy_id: string; to_branch_id: string; notes?: string }) =>
    apiClient.post<CopyTransfer>(`${libBase(orgSlug)}/catalog/transfers`, data),
  receiveTransfer: (orgSlug: string, id: string) =>
    apiClient.post<CopyTransfer>(`${libBase(orgSlug)}/catalog/transfers/${id}/receive`, {}),
};

export interface CopyTransfer {
  id: string;
  copy_id: string;
  from_branch_id: string;
  to_branch_id: string;
  status: 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  received_at?: string | null;
  notes?: string;
  created_at?: string;
}

export interface StockCount {
  id: string;
  branch_id: string;
  reference?: string;
  status: 'COUNTING' | 'COMPLETED' | 'CANCELLED';
  expected_count: number;
  scanned_count: number;
  missing_count: number;
  completed_at?: string | null;
  created_at?: string;
}

export const stocktakeApi = {
  list: async (orgSlug: string): Promise<StockCount[]> => {
    // No paging UI here — request the shared-pagination max explicitly so the session list
    // doesn't silently shrink to the default page size now that the backend paginates it.
    const res = await apiClient.get<{ data?: StockCount[] } | StockCount[]>(`${libBase(orgSlug)}/catalog/stocktake`, { limit: 100 });
    return Array.isArray(res) ? res : (res.data ?? []);
  },
  start: (orgSlug: string, data: { branch_id: string; reference?: string }) =>
    apiClient.post<StockCount>(`${libBase(orgSlug)}/catalog/stocktake`, data),
  scan: (orgSlug: string, id: string, barcode: string) =>
    apiClient.post<{ stocktake: StockCount; copy: Copy }>(`${libBase(orgSlug)}/catalog/stocktake/${id}/scan`, { barcode }),
  finalize: (orgSlug: string, id: string) =>
    apiClient.post<{ stocktake: StockCount; missing: number }>(`${libBase(orgSlug)}/catalog/stocktake/${id}/finalize`, {}),
};
