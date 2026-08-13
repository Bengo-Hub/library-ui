import { toast } from 'sonner';
import { copiesApi, type Copy, type BulkPrintFormat, type LabelPrintOpts } from '@/lib/api/copies';
import { blobToHex, printRawToLocalName } from '@/lib/library/print-agent';

export interface PrintCopyLabelDeps {
  orgSlug: string;
  /** Local print-agent reachable on this machine (see lib/library/print-agent.ts). */
  agentUp: boolean;
  /** Printer name remembered/picked for direct USB printing; '' = none configured. */
  selectedPrinter: string;
  /** From shared-ui-lib's useDocumentPreview() — opens the fallback browser/PDF preview. */
  openPreview: (fetchFn: () => Promise<Blob>, o: { fileName: string; title?: string; orientation?: 'portrait' | 'landscape' }) => Promise<void>;
}

/**
 * Print one copy's spine/barcode label: prefer a silent direct-USB send via the local
 * print-agent, and only fall back to the browser/PDF preview window when no agent/printer is
 * available or the direct send fails. Mirrors pos-ui's printProfileHtml silent-first/
 * browser-fallback ordering (see pos-ui/src/lib/pos/printer-discovery.ts) — the previous
 * behavior here always opened the manual preview first and only OFFERED direct send as a
 * secondary, easy-to-miss toast action, so a librarian had to notice and click a toast every
 * single time even with a known-good printer already selected.
 *
 * Shared by the Copies page's per-row button and the title-detail page's copies table so both
 * stay wired to one fix instead of drifting apart.
 */
export async function printCopyLabel(copy: Copy, opts: Omit<LabelPrintOpts, 'format'> & { format?: BulkPrintFormat }, deps: PrintCopyLabelDeps): Promise<void> {
  const { orgSlug, agentUp, selectedPrinter, openPreview } = deps;
  const isThermal = opts.format === 'thermal_tspl';

  if (isThermal && agentUp && selectedPrinter) {
    try {
      const blob = await copiesApi.labelPdf(orgSlug, copy.id, opts);
      const hex = await blobToHex(blob);
      const ok = await printRawToLocalName(selectedPrinter, hex);
      if (ok) {
        toast.success(`Sent to ${selectedPrinter}`);
        return;
      }
      toast.error('Local print agent rejected the job — opening preview instead');
    } catch {
      toast.error('Failed to reach the local print agent — opening preview instead');
    }
  }

  const previewOpts = isThermal ? { ...opts, format: 'thermal_preview' as const } : opts;
  await openPreview(() => copiesApi.labelPdf(orgSlug, copy.id, previewOpts), {
    fileName: `label-${copy.barcode}.pdf`, title: 'Spine / barcode label', orientation: 'landscape',
  });
}
