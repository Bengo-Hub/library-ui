"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import type { SubscriptionInfo } from "@/lib/auth/subscription";
import { fetchSubscriptionInfo } from "@/lib/auth/subscription";
import { useSubscriptionStore } from "@/store/subscription";
import type { SubscriptionEntitlements, FeatureCatalogEntry } from "@bengo-hub/shared-ui-lib/subscription";

/** Shape of one entry in the platform feature-catalog proxy response. */
interface CatalogItem {
  featureCode: string;
  label?: string;
  serviceTag?: string;
  minPlanCode?: string;
  minTierLabel?: string;
  minTierOrder?: number;
}

/**
 * Decode the claims payload of a JWT client-side (no signature verification — purely to read
 * the tenant subscription claims the SSO/PIN token carries). Returns an empty object on any
 * malformed token so callers can safely spread it.
 */
function decodeJwtClaims(token: string | null | undefined): Record<string, unknown> {
  if (!token) return {};
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function useSubscription() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const subscriptionInfo = useAuthStore((s) => s.subscriptionInfo);
  const setSubscriptionInfo = useAuthStore((s) => s.setSubscriptionInfo);

  const subStore = useSubscriptionStore();

  const tenantSlug = user?.tenant_slug as string | undefined;
  const roles = (((user as any)?.roles ?? []) as string[]).map((r) => String(r).toLowerCase());
  const isSuperuser = roles.includes('superuser') || roles.includes('super_admin');
  const isPlatformOwner =
    !!(user as any)?.is_platform_owner ||
    !!(user as any)?.isPlatformOwner ||
    isSuperuser ||
    tenantSlug === 'codevertex';
  const isServiceCharge = (user as any)?.billing_mode === 'service_charge';
  const isDemo = !!(user as any)?.is_demo || tenantSlug === 'codevertex-demo';
  const isExempt = isPlatformOwner || isDemo || isServiceCharge;

  // Hydrate from IndexedDB on auth so gating works offline
  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    const slug = tenantSlug ?? '';
    if (slug) useSubscriptionStore.getState().loadFromIDB(slug);
  }, [status, user, tenantSlug]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken || !user) return;
    if (subscriptionInfo !== undefined) return;

    setSubscriptionInfo(null);

    const tenantId = user.tenant_id;
    const slug = tenantSlug ?? '';

    if (!tenantId || isPlatformOwner) {
      const platformInfo = {
        status: 'active', planCode: 'enterprise', planName: 'Enterprise', features: [], limits: {},
      };
      setSubscriptionInfo(platformInfo as any);
      useSubscriptionStore.getState().setFromRaw(
        { plan: 'ENTERPRISE', status: 'ACTIVE', features: [], limits: {} }, slug,
      );
      return;
    }

    fetchSubscriptionInfo(tenantId, slug, session.accessToken)
      .then((info) => {
        const resolved = info ?? { status: 'none', planCode: '', planName: '', features: [], limits: {} };
        setSubscriptionInfo(resolved as any);
        useSubscriptionStore.getState().setFromRaw(
          {
            plan: resolved.planCode || null, status: resolved.status || null,
            expiresAt: (resolved as any).currentPeriodEnd ?? (resolved as any).trialEndsAt ?? null,
            features: resolved.features, limits: resolved.limits,
          },
          slug,
        );
      })
      .catch(() => setSubscriptionInfo({ status: 'none', planCode: '', planName: '', features: [], limits: {} } as any));
  }, [status, session?.accessToken, user, subscriptionInfo, setSubscriptionInfo, tenantSlug, isPlatformOwner]);

  const info = subscriptionInfo as SubscriptionInfo | null | undefined;
  const subStatus = info?.status ?? null;

  return {
    info,
    status: subStatus,
    plan: info?.planCode ?? null,
    isActive: subStatus === 'active' || subStatus === 'trial' || isExempt,
    isPastDue: subStatus === 'past_due' || subStatus === 'suspended',
    isExpired: subStatus === 'expired' || subStatus === 'cancelled',
    needsSubscription: subStatus === 'none' && !isExempt,
    isLoading: subscriptionInfo === null || subscriptionInfo === undefined,
    isPlatformOwner,
    isServiceCharge,
    isDemo,
    hasFeature: (code: string) => isExempt || (info?.features?.includes(code) ?? false),
    getLimit: (key: string) => (isExempt ? Infinity : ((info?.limits?.[key] ?? Infinity) as number)),
    daysUntilExpiry: subStore.daysUntilExpiry,
    isInGracePeriod: subStore.isInGracePeriod,
    gracePeriodEndsAt: subStore.gracePeriodEndsAt,
    store: subStore,
  };
}

/**
 * useSubscriptionEntitlements produces the store-agnostic SubscriptionEntitlements snapshot
 * the shared `<SubscriptionProvider>` consumes (and `useFeature` / `useLimit` / `<FeatureGate>`
 * read from). Wrap the authenticated app shell with the provider, feeding it this value.
 *
 * Features/limits are sourced (in priority order) from:
 *   1. the access-token JWT claims (`subscription_features`, `tier_limits`/`subscription_limits`)
 *      — the authoritative tenant entitlements the SSO/PIN token carries;
 *   2. the lazily-fetched subscriptionInfo (pricing-api proxy);
 *   3. the offline-hydrated subscription store.
 *
 * `isExempt` mirrors the backend IsGatingExempt funnel: platform owner OR demo OR
 * billing_mode === 'service_charge'. When exempt, the shared provider reads every feature as
 * enabled and every limit as Infinity, so the UI never hides a control the backend allows.
 */
export function useSubscriptionEntitlements(): SubscriptionEntitlements {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const subscriptionInfo = useAuthStore((s) => s.subscriptionInfo) as SubscriptionInfo | null | undefined;
  const storeFeatures = useSubscriptionStore((s) => s.features);
  const storeLimits = useSubscriptionStore((s) => s.limits);
  const storeStatus = useSubscriptionStore((s) => s.status);
  const storePlan = useSubscriptionStore((s) => s.plan);
  const storeHydrated = useSubscriptionStore((s) => s.hydrated);

  const accessToken = session?.accessToken;
  const claims = useMemo(() => decodeJwtClaims(accessToken), [accessToken]);

  // The platform feature catalog (minPlanCode/minTierLabel/minTierOrder per feature) is static-ish →
  // fetch once, long cache. Drives the tier-aware upgrade prompt in the shared <FeatureLock>.
  const { data: catalogData } = useQuery({
    queryKey: ["features-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/features-catalog");
      if (!res.ok) return { features: [] as CatalogItem[] };
      return (await res.json()) as { features: CatalogItem[] };
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const catalog = useMemo<Record<string, FeatureCatalogEntry>>(() => {
    const map: Record<string, FeatureCatalogEntry> = {};
    for (const f of catalogData?.features ?? []) {
      map[f.featureCode] = {
        minPlanCode: f.minPlanCode,
        minTierLabel: f.minTierLabel,
        minTierOrder: f.minTierOrder,
        serviceTag: f.serviceTag,
        label: f.label,
      };
    }
    return map;
  }, [catalogData]);

  return useMemo<SubscriptionEntitlements>(() => {
    const tenantClaims = (claims.tenant as Record<string, unknown> | undefined) ?? claims;

    const tenantSlug = (user?.tenant_slug as string | undefined) ?? (tenantClaims.tenant_slug as string | undefined);
    const isPlatformOwner =
      !!(user as { isPlatformOwner?: boolean } | null)?.isPlatformOwner ||
      tenantClaims.is_platform_owner === true ||
      tenantSlug === "codevertex";
    const isDemo = tenantClaims.is_demo === true || tenantSlug === "codevertex-demo";
    const isServiceCharge = tenantClaims.billing_mode === "service_charge";
    const isExempt = isPlatformOwner || isDemo || isServiceCharge;

    // Features: JWT claim → fetched info → offline store.
    const claimFeatures = tenantClaims.subscription_features;
    const features: string[] = Array.isArray(claimFeatures)
      ? (claimFeatures as string[])
      : (subscriptionInfo?.features ?? storeFeatures ?? []);

    // Limits: JWT claim (tier_limits or subscription_limits) → fetched info → offline store.
    const claimLimits = (tenantClaims.tier_limits ?? tenantClaims.subscription_limits) as
      | Record<string, number>
      | undefined;
    const limits: Record<string, number> =
      claimLimits ?? subscriptionInfo?.limits ?? storeLimits ?? {};

    const status =
      (tenantClaims.subscription_status as string | undefined)?.toLowerCase() ??
      subscriptionInfo?.status ??
      storeStatus ??
      null;

    // Loading until either entitlements have resolved from the proxy or the offline store hydrated.
    const isLoading = subscriptionInfo === undefined && !storeHydrated && !isExempt;

    // planCode / tierOrder feed the shared tier-aware FeatureLock ("Upgrade to <tier>").
    const planCode =
      (tenantClaims.subscription_plan as string | undefined) ??
      subscriptionInfo?.planCode ??
      storePlan ??
      null;
    const tierOrder =
      (typeof tenantClaims.tier_order === "number" ? tenantClaims.tier_order : undefined) ??
      subscriptionInfo?.tierOrder ??
      null;

    return { features, limits, isExempt, status, isLoading, planCode, tierOrder, catalog };
  }, [claims, user, subscriptionInfo, storeFeatures, storeLimits, storeStatus, storePlan, storeHydrated, catalog]);
}
