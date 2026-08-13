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
    // `rotate` is deliberately NEVER carried forward from a previous session/page-load, even
    // though it's persisted alongside the other prefs (so it stays in sync within one active
    // session between the bulk dialog and the per-row quick-print button, per this file's own
    // doc comment). A rotate=true left over from an earlier test would otherwise silently flip
    // every future print without the operator re-ticking the checkbox — rotation must always be
    // an explicit, current-session choice, never a remembered default.
    return { ...DEFAULT_PREFS, ...JSON.parse(raw), rotate: false };
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

/** Shape the persisted prefs into the request opts copiesApi.labelPdf/printLabels expect —
 *  for pages (e.g. the title-detail page) that don't run their own live bulk-print dialog and
 *  just want "print using whatever the user last configured" without re-deriving this shape. */
export function toLabelPrintOpts(prefs: LabelPrintPrefs): LabelPrintOpts {
  return {
    format: prefs.format,
    ...(prefs.format === 'thermal_tspl'
      ? {
          template: prefs.template,
          rotate: prefs.rotate,
          ...(prefs.template === 'custom'
            ? {
                custom_label_w_in: prefs.custom_label_w_in,
                custom_label_h_in: prefs.custom_label_h_in,
                custom_lanes: prefs.custom_lanes,
                custom_gap_x_in: prefs.custom_gap_x_in,
                custom_gap_y_in: prefs.custom_gap_y_in,
              }
            : {}),
        }
      : {}),
  };
}
