/**
 * Single source of truth for subscription FEATURE gating in the library UI.
 *
 * Every code here is a *real* library feature code enforced by library-api's per-module
 * feature gates (RequireFeature). The sidebar nav, page tabs, and premium buttons gate
 * against these codes via the shared `useFeature(code)` hook (fed by SubscriptionProvider).
 *
 * Gating rule (see sidebar / FeatureGate): a feature is LOCKED only when its code is present
 * in this catalog AND the tenant's plan does not include it. A `subFeature` that is NOT in
 * this catalog is treated as un-gated (fail-open / visible) — so a typo can never silently
 * hide a real capability, and an item gains gating automatically once its code is seeded.
 */

/** Tier label shown on the lock badge — the lowest plan tier that grants the feature. */
export type RequiredPlanLabel = 'Starter' | 'Growth' | 'Professional';

export interface FeatureCatalogEntry {
  /** Human-readable feature name (for modals / tooltips). */
  label: string;
  /** Lowest tier that includes the feature → drives the lock-badge text. */
  requiredPlanLabel: RequiredPlanLabel;
}

export const FEATURE_CATALOG: Record<string, FeatureCatalogEntry> = {
  // ── Catalog / cataloging / copies / OPAC ──
  library_catalog:     { label: 'Catalog',      requiredPlanLabel: 'Starter' },
  // ── Circulation desk + self-checkout ──
  library_circulation: { label: 'Circulation',  requiredPlanLabel: 'Starter' },
  // ── Holds / reservations queue ──
  library_holds:       { label: 'Holds',        requiredPlanLabel: 'Growth' },
  // ── Members / tiers / loan policies ──
  library_members:     { label: 'Members',      requiredPlanLabel: 'Starter' },
  // ── Fines / membership fees ──
  library_fines:       { label: 'Fines',        requiredPlanLabel: 'Growth' },
  // ── Digital lending shelf ──
  library_ebooks:      { label: 'eBooks',       requiredPlanLabel: 'Professional' },
};

/** True when the code is a recognised, gateable subscription feature. */
export function isKnownFeature(code: string | undefined): code is string {
  return !!code && code in FEATURE_CATALOG;
}

/** Lock-badge label for a feature code (lowest tier that grants it), or undefined if unknown. */
export function requiredPlanLabel(code: string | undefined): RequiredPlanLabel | undefined {
  return code ? FEATURE_CATALOG[code]?.requiredPlanLabel : undefined;
}

/** Human-readable feature name, falling back to the raw code. */
export function featureLabel(code: string | undefined): string {
  if (!code) return '';
  return FEATURE_CATALOG[code]?.label ?? code;
}
