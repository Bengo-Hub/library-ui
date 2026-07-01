'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  serialsApi,
  type SubscriptionInput,
  type IssueInput,
  type IssueStatus,
  type SubscriptionStatus,
} from '@/lib/api/serials';

const SUBS = 'serial-subscriptions';
const ISSUES = 'serial-issues';
const ROUTING = 'serial-routing';

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function useSubscriptions(orgSlug: string, status?: SubscriptionStatus) {
  return useQuery({
    queryKey: [SUBS, orgSlug, status],
    queryFn: () => serialsApi.listSubscriptions(orgSlug, status),
    enabled: !!orgSlug,
    staleTime: 2 * 60_000,
  });
}

export function useSubscription(orgSlug: string, id: string) {
  return useQuery({
    queryKey: [SUBS, orgSlug, id],
    queryFn: () => serialsApi.getSubscription(orgSlug, id),
    enabled: !!orgSlug && !!id,
    staleTime: 60_000,
  });
}

export function useCreateSubscription(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionInput) => serialsApi.createSubscription(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUBS, orgSlug] }),
  });
}

export function useUpdateSubscription(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionInput> }) =>
      serialsApi.updateSubscription(orgSlug, id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [SUBS, orgSlug, id] });
      qc.invalidateQueries({ queryKey: [SUBS, orgSlug] });
    },
  });
}

export function usePredictIssues(orgSlug: string, subId: string) {
  return useQuery({
    queryKey: [SUBS, orgSlug, subId, 'predict'],
    queryFn: () => serialsApi.predictIssues(orgSlug, subId),
    enabled: !!orgSlug && !!subId,
    staleTime: 5 * 60_000,
  });
}

// ── Routing ───────────────────────────────────────────────────────────────────

export function useRoutingList(orgSlug: string, subId: string) {
  return useQuery({
    queryKey: [ROUTING, orgSlug, subId],
    queryFn: () => serialsApi.listRouting(orgSlug, subId),
    enabled: !!orgSlug && !!subId,
    staleTime: 2 * 60_000,
  });
}

export function useAddRouting(orgSlug: string, subId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { member_id: string; position: number }) =>
      serialsApi.addRouting(orgSlug, subId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROUTING, orgSlug, subId] }),
  });
}

// ── Issues ────────────────────────────────────────────────────────────────────

export function useIssues(orgSlug: string, params?: { subscription_id?: string; status?: IssueStatus }) {
  return useQuery({
    queryKey: [ISSUES, orgSlug, params],
    queryFn: () => serialsApi.listIssues(orgSlug, params),
    enabled: !!orgSlug,
    staleTime: 60_000,
  });
}

export function useCreateIssue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IssueInput) => serialsApi.createIssue(orgSlug, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ISSUES, orgSlug] }),
  });
}

export function useReceiveIssue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serialsApi.receiveIssue(orgSlug, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ISSUES, orgSlug] });
      qc.invalidateQueries({ queryKey: [SUBS, orgSlug] });
    },
  });
}

export function useClaimIssue(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serialsApi.claimIssue(orgSlug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ISSUES, orgSlug] }),
  });
}
