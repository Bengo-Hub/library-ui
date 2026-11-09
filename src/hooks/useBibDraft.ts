'use client';

/**
 * useBibDraft — cataloging autosave for BibForm, mirroring pos-ui's proven "Sale tabs" pattern
 * (store/sale-sessions.ts + hooks/useSaleSessions.ts): a debounced autosave keyed off the live form
 * snapshot via a ref (so the timer/beforeunload handler never sees a stale closure), plus a
 * beforeunload leave-guard. Storage is IndexedDB (Dexie, lib/db/library-db.ts) rather than pos-ui's
 * localStorage, since a picked cover image (a File/Blob) needs to survive a reload too.
 *
 * Unlike the multi-tab Sale-session store, there is exactly one draft per scope here — so instead of
 * auto-restoring on mount (which could clobber a form the user already started retyping after a
 * discard), an existing draft is only OFFERED via `pendingDraft`; the caller decides whether to apply
 * it (Restore) or drop it (discardDraft).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebouncedCallback } from '@bengo-hub/shared-ui-lib/search';
import { getFormDraft, saveFormDraft, clearFormDraft, type FormDraftRow } from '@/lib/db/library-db';

const AUTOSAVE_MS = 700;

interface UseBibDraftArgs<T extends Record<string, unknown>> {
  /** Autosave/offer-restore only makes sense for a fresh, not-yet-created record. */
  enabled: boolean;
  /** Scope key, e.g. `${tenantSlug}:${userId}:bib:new` — empty string while not yet resolvable (hook is inert). */
  scopeKey: string;
  /** The form's current data, recomputed each render. */
  snapshot: T;
  /** True when `snapshot` has nothing worth persisting yet (so a blank form doesn't spam IndexedDB or the leave-guard). */
  isEmpty: (s: T) => boolean;
}

export function useBibDraft<T extends Record<string, unknown>>({ enabled, scopeKey, snapshot, isEmpty }: UseBibDraftArgs<T>) {
  const [pendingDraft, setPendingDraft] = useState<FormDraftRow | null>(null);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const coversRef = useRef<{ cover?: File | null; coverBack?: File | null }>({});
  // Reads the live snapshot and covers through refs when it fires, so a save never writes stale data.
  const scheduleSave = useDebouncedCallback((key: string) => {
    saveFormDraft(key, snapshotRef.current, coversRef.current);
  }, AUTOSAVE_MS);
  const checkedKeyRef = useRef('');

  // ── Offer a draft once per scope (never auto-applies it) ────────────────────
  useEffect(() => {
    if (!enabled || !scopeKey || checkedKeyRef.current === scopeKey) return;
    checkedKeyRef.current = scopeKey;
    let active = true;
    getFormDraft(scopeKey).then((row) => {
      if (active && row) setPendingDraft(row);
    });
    return () => { active = false; };
  }, [enabled, scopeKey]);

  // ── Debounced autosave ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !scopeKey) return;
    scheduleSave.cancel();
    if (isEmpty(snapshotRef.current)) return;
    scheduleSave(scopeKey);
    return () => scheduleSave.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeKey, snapshot, scheduleSave]);

  // ── Leave guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!isEmpty(snapshotRef.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** Record the currently-picked cover files so the next autosave tick captures them too. */
  const setCovers = useCallback((covers: { cover?: File | null; coverBack?: File | null }) => {
    coversRef.current = { ...coversRef.current, ...covers };
  }, []);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

  const discardDraft = useCallback(async () => {
    if (scopeKey) await clearFormDraft(scopeKey);
    setPendingDraft(null);
  }, [scopeKey]);

  /** Call after a confirmed successful save — never on failure, so a dropped connection doesn't lose the draft twice. */
  const clear = useCallback(async () => {
    scheduleSave.cancel();
    if (scopeKey) await clearFormDraft(scopeKey);
  }, [scopeKey, scheduleSave]);

  return { pendingDraft, dismissDraft, discardDraft, clear, setCovers };
}
