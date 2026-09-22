'use client';

/**
 * Small localStorage-backed "remember the last value picked" helper, scoped per tenant (orgSlug)
 * + a field-specific scope string. Cataloging/copy-add happen in batches (one shipment or one
 * cataloging session usually shares the same format, language, publisher, branch, shelf, etc.) —
 * this lets a dropdown default to whatever was picked last instead of resetting to a blank/generic
 * value every time. Callers own validating the remembered value still makes sense (e.g. still
 * exists in a dynamic options list) before using it as a default.
 *
 * Key format matches the two original per-field implementations this replaces
 * (`library:catalog:lastPlace:{orgSlug}`, `library:copies:lastAcquisitionDate:{orgSlug}`) so
 * existing remembered values in a staff member's browser keep working after the refactor.
 */
function storageKey(scope: string, orgSlug: string): string {
  return `library:${scope}:${orgSlug}`;
}

export function getLastSelected(scope: string, orgSlug: string): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(storageKey(scope, orgSlug)) ?? ''; } catch { return ''; }
}

/** No-op on an empty value — a deliberately cleared field shouldn't erase a remembered default. */
export function setLastSelected(scope: string, orgSlug: string, value: string): void {
  if (typeof window === 'undefined' || !value) return;
  try { localStorage.setItem(storageKey(scope, orgSlug), value); } catch { /* storage disabled */ }
}
