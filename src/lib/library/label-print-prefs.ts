import type { LabelPrintOpts } from '@/lib/api/copies';

/**
 * Centralized label-print preferences — the physical template/format/rotate/printer choice a
 * user last made in the Copies page's bulk "Print labels" dialog, persisted so it survives a
 * page reload/navigation and so any other single-item print action reuses the same resolved
 * template instead of a hardcoded default (see inventory-ui's identical
 * lib/inventory/label-print-prefs.ts for the sibling implementation and the bug this fixes).
 */
const KEY = 'library.labelPrintPrefs.v1';

export interface LabelPrintPrefs extends LabelPrintOpts {
  printerName?: string;
}

const DEFAULT_PREFS: LabelPrintPrefs = { format: 'avery_a4' };

export function getLabelPrintPrefs(): LabelPrintPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setLabelPrintPrefs(prefs: LabelPrintPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable (private browsing, quota) — prefs just won't persist this session
  }
}
