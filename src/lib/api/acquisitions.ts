import { apiClient } from './client';
import { libBase, normalizePage, type Paginated } from './types';

// ── Vendors ──────────────────────────────────────────────────────────────────

export type PaymentTerms = 'NET_30' | 'NET_60' | 'COD' | 'PREPAID';

export interface Vendor {
  id: string;
  name: string;
  code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  account_number: string | null;
  payment_terms: PaymentTerms;
  notes: string | null;
  is_active: boolean;
}

export interface VendorInput {
  name: string;
  code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  account_number?: string;
  payment_terms?: PaymentTerms;
  notes?: string;
  is_active?: boolean;
}

// ── Budgets & Funds ───────────────────────────────────────────────────────────

export type BudgetStatus = 'OPEN' | 'CLOSED';

export interface AcquisitionBudget {
  id: string;
  name: string;
  fiscal_year: number;
  total_amount: string;
  allocated: string;
  spent: string;
  status: BudgetStatus;
  notes: string | null;
}

export interface BudgetInput {
  name: string;
  fiscal_year: number;
  total_amount: number;
  notes?: string;
}

export interface AcquisitionFund {
  id: string;
  budget_id: string;
  name: string;
  code: string | null;
  allocated_amount: string;
  spent: string;
  description: string | null;
}

export interface FundInput {
  name: string;
  code?: string;
  allocated_amount: number;
  description?: string;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export type POStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
export type POLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  po_id: string;
  bib_record_id: string | null;
  title: string;
  isbn: string | null;
  author: string | null;
  unit_price: string;
  quantity: number;
  received_qty: number;
  status: POLineStatus;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string | null;
  vendor_id: string;
  fund_id: string | null;
  status: POStatus;
  order_date: string | null;
  expected_date: string | null;
  notes: string | null;
  subtotal: string;
  tax: string;
  total: string;
  currency_code: string;
  edges?: { lines?: PurchaseOrderLine[] };
}

export interface POInput {
  vendor_id: string;
  fund_id?: string;
  order_date?: string;
  expected_date?: string;
  notes?: string;
  currency_code?: string;
  tax?: number;
}

export interface POLineInput {
  title: string;
  isbn?: string;
  author?: string;
  unit_price: number;
  quantity: number;
  bib_record_id?: string;
  notes?: string;
}

export interface ReceiveLineInput {
  quantity: number;
  branch_id?: string;
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface AcquisitionInvoice {
  id: string;
  vendor_id: string;
  po_id: string | null;
  invoice_no: string | null;
  reference_id: string | null;
  treasury_invoice_id: string | null;
  invoice_date: string | null;
  amount: string;
  status: InvoiceStatus;
  notes: string | null;
}

export interface InvoiceInput {
  vendor_id: string;
  po_id?: string;
  invoice_no?: string;
  invoice_date?: string;
  amount: number;
  notes?: string;
}

// ── API object ────────────────────────────────────────────────────────────────

export const acquisitionsApi = {
  // Vendors
  listVendors: async (orgSlug: string, params?: { active?: boolean }): Promise<Paginated<Vendor>> => {
    const qs = params?.active ? '?active=true' : '';
    const res = await apiClient.get<Paginated<Vendor> | Vendor[]>(`${libBase(orgSlug)}/acquisitions/vendors${qs}`);
    return normalizePage<Vendor>(res);
  },
  getVendor: (orgSlug: string, id: string) =>
    apiClient.get<Vendor>(`${libBase(orgSlug)}/acquisitions/vendors/${id}`),
  createVendor: (orgSlug: string, data: VendorInput) =>
    apiClient.post<Vendor>(`${libBase(orgSlug)}/acquisitions/vendors`, data),
  updateVendor: (orgSlug: string, id: string, data: Partial<VendorInput>) =>
    apiClient.put<Vendor>(`${libBase(orgSlug)}/acquisitions/vendors/${id}`, data),

  // Budgets
  listBudgets: async (orgSlug: string, fiscalYear?: number): Promise<Paginated<AcquisitionBudget>> => {
    const qs = fiscalYear ? `?fiscal_year=${fiscalYear}` : '';
    const res = await apiClient.get<Paginated<AcquisitionBudget> | AcquisitionBudget[]>(
      `${libBase(orgSlug)}/acquisitions/budgets${qs}`
    );
    return normalizePage<AcquisitionBudget>(res);
  },
  createBudget: (orgSlug: string, data: BudgetInput) =>
    apiClient.post<AcquisitionBudget>(`${libBase(orgSlug)}/acquisitions/budgets`, data),
  updateBudget: (orgSlug: string, id: string, data: Partial<BudgetInput>) =>
    apiClient.put<AcquisitionBudget>(`${libBase(orgSlug)}/acquisitions/budgets/${id}`, data),

  // Funds
  listFunds: async (orgSlug: string, budgetId: string): Promise<Paginated<AcquisitionFund>> => {
    const res = await apiClient.get<Paginated<AcquisitionFund> | AcquisitionFund[]>(
      `${libBase(orgSlug)}/acquisitions/budgets/${budgetId}/funds`
    );
    return normalizePage<AcquisitionFund>(res);
  },
  createFund: (orgSlug: string, budgetId: string, data: FundInput) =>
    apiClient.post<AcquisitionFund>(`${libBase(orgSlug)}/acquisitions/budgets/${budgetId}/funds`, data),

  // Purchase Orders
  listOrders: async (orgSlug: string, params?: { status?: POStatus; vendor_id?: string }): Promise<Paginated<PurchaseOrder>> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.vendor_id) qs.set('vendor_id', params.vendor_id);
    const query = qs.toString() ? `?${qs}` : '';
    const res = await apiClient.get<Paginated<PurchaseOrder> | PurchaseOrder[]>(
      `${libBase(orgSlug)}/acquisitions/orders${query}`
    );
    return normalizePage<PurchaseOrder>(res);
  },
  getOrder: (orgSlug: string, id: string) =>
    apiClient.get<PurchaseOrder>(`${libBase(orgSlug)}/acquisitions/orders/${id}`),
  createOrder: (orgSlug: string, data: POInput) =>
    apiClient.post<PurchaseOrder>(`${libBase(orgSlug)}/acquisitions/orders`, data),
  updateOrder: (orgSlug: string, id: string, data: Partial<POInput>) =>
    apiClient.put<PurchaseOrder>(`${libBase(orgSlug)}/acquisitions/orders/${id}`, data),
  submitOrder: (orgSlug: string, id: string) =>
    apiClient.post<PurchaseOrder>(`${libBase(orgSlug)}/acquisitions/orders/${id}/submit`),
  addLine: (orgSlug: string, orderId: string, data: POLineInput) =>
    apiClient.post<PurchaseOrderLine>(`${libBase(orgSlug)}/acquisitions/orders/${orderId}/lines`, data),
  receiveLine: (orgSlug: string, orderId: string, lineId: string, data: ReceiveLineInput) =>
    apiClient.post<PurchaseOrderLine>(
      `${libBase(orgSlug)}/acquisitions/orders/${orderId}/lines/${lineId}/receive`,
      data
    ),

  // Invoices
  listInvoices: async (orgSlug: string, params?: { status?: InvoiceStatus; vendor_id?: string }): Promise<Paginated<AcquisitionInvoice>> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.vendor_id) qs.set('vendor_id', params.vendor_id);
    const query = qs.toString() ? `?${qs}` : '';
    const res = await apiClient.get<Paginated<AcquisitionInvoice> | AcquisitionInvoice[]>(
      `${libBase(orgSlug)}/acquisitions/invoices${query}`
    );
    return normalizePage<AcquisitionInvoice>(res);
  },
  getInvoice: (orgSlug: string, id: string) =>
    apiClient.get<AcquisitionInvoice>(`${libBase(orgSlug)}/acquisitions/invoices/${id}`),
  createInvoice: (orgSlug: string, data: InvoiceInput) =>
    apiClient.post<AcquisitionInvoice>(`${libBase(orgSlug)}/acquisitions/invoices`, data),
};
