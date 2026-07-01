'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acquisitionsApi,
  type VendorInput,
  type BudgetInput,
  type FundInput,
  type POInput,
  type POLineInput,
  type ReceiveLineInput,
  type InvoiceInput,
  type POStatus,
  type InvoiceStatus,
} from '@/lib/api/acquisitions';

const VENDORS = 'acq-vendors';
const BUDGETS = 'acq-budgets';
const FUNDS = 'acq-funds';
const ORDERS = 'acq-orders';
const INVOICES = 'acq-invoices';

// ── Vendors ───────────────────────────────────────────────────────────────────

export function useVendors(orgSlug: string, active?: boolean) {
  return useQuery({
    queryKey: [VENDORS, orgSlug, active],
    queryFn: () => acquisitionsApi.listVendors(orgSlug, active ? { active: true } : undefined),
    enabled: !!orgSlug,
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VendorInput) => acquisitionsApi.createVendor(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VENDORS, orgSlug] }),
  });
}

export function useUpdateVendor(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorInput> }) =>
      acquisitionsApi.updateVendor(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VENDORS, orgSlug] }),
  });
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export function useBudgets(orgSlug: string, fiscalYear?: number) {
  return useQuery({
    queryKey: [BUDGETS, orgSlug, fiscalYear],
    queryFn: () => acquisitionsApi.listBudgets(orgSlug, fiscalYear),
    enabled: !!orgSlug,
    staleTime: 2 * 60_000,
  });
}

export function useCreateBudget(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetInput) => acquisitionsApi.createBudget(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BUDGETS, orgSlug] }),
  });
}

export function useUpdateBudget(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetInput> }) =>
      acquisitionsApi.updateBudget(orgSlug, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BUDGETS, orgSlug] }),
  });
}

// ── Funds ─────────────────────────────────────────────────────────────────────

export function useFunds(orgSlug: string, budgetId: string) {
  return useQuery({
    queryKey: [FUNDS, orgSlug, budgetId],
    queryFn: () => acquisitionsApi.listFunds(orgSlug, budgetId),
    enabled: !!orgSlug && !!budgetId,
    staleTime: 2 * 60_000,
  });
}

export function useCreateFund(orgSlug: string, budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FundInput) => acquisitionsApi.createFund(orgSlug, budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FUNDS, orgSlug, budgetId] });
      qc.invalidateQueries({ queryKey: [BUDGETS, orgSlug] });
    },
  });
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export function useOrders(orgSlug: string, params?: { status?: POStatus; vendor_id?: string }) {
  return useQuery({
    queryKey: [ORDERS, orgSlug, params],
    queryFn: () => acquisitionsApi.listOrders(orgSlug, params),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useOrder(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [ORDERS, orgSlug, id],
    queryFn: () => acquisitionsApi.getOrder(orgSlug, id),
    enabled: !!orgSlug && !!id,
    staleTime: 30_000,
  });
}

export function useCreateOrder(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: POInput) => acquisitionsApi.createOrder(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ORDERS, orgSlug] }),
  });
}

export function useUpdateOrder(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<POInput> }) =>
      acquisitionsApi.updateOrder(orgSlug, id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug, id] });
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug] });
    },
  });
}

export function useSubmitOrder(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acquisitionsApi.submitOrder(orgSlug, id),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug, id] });
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug] });
    },
  });
}

export function useAddLine(orgSlug: string, orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: POLineInput) => acquisitionsApi.addLine(orgSlug, orderId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ORDERS, orgSlug, orderId] }),
  });
}

export function useReceiveLine(orgSlug: string, orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: ReceiveLineInput }) =>
      acquisitionsApi.receiveLine(orgSlug, orderId, lineId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug, orderId] });
      qc.invalidateQueries({ queryKey: [ORDERS, orgSlug] });
      qc.invalidateQueries({ queryKey: [BUDGETS, orgSlug] });
    },
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function useInvoices(orgSlug: string, params?: { status?: InvoiceStatus; vendor_id?: string }) {
  return useQuery({
    queryKey: [INVOICES, orgSlug, params],
    queryFn: () => acquisitionsApi.listInvoices(orgSlug, params),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useCreateInvoice(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvoiceInput) => acquisitionsApi.createInvoice(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [INVOICES, orgSlug] }),
  });
}
