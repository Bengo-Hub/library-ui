/**
 * Local print-agent client for direct USB label printing.
 *
 * library-ui doesn't run its own print-agent — it reuses the SAME loopback agent pos-ui/
 * inventory-ui already talk to (`pos-service/pos-api/cmd/print-agent`, a small Windows-service
 * companion the operator runs on the till/terminal). The agent already exposes generic,
 * CORS-open routes that aren't POS-specific (`/health`, `/printers`, `/print`), so no agent-side
 * change was needed to reuse it here. Mirrors
 * `inventory-service/inventory-ui/src/lib/inventory/print-agent.ts` (same minimal subset — no
 * QZ Tray/WebUSB/Bluetooth/network-scan, none of which apply to this direct-USB flow) and the
 * original `pos-service/pos-ui/src/lib/pos/printer-discovery.ts` implementation.
 *
 * `/print` writes the given bytes straight through the Windows spooler in RAW datatype — this
 * bypasses GDI page-size/orientation negotiation entirely, which is what makes this the reliable
 * way to print TSPL bytes correctly (vs. downloading/printing a PDF via a viewer's print dialog
 * and guessing a Windows paper preset, which is what produced the rotated-label bug this feature
 * fixes — see library-api/docs/barcode-labels.md).
 */

const AGENT_PORT =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PRINT_AGENT_PORT) || '9330';
export const AGENT_BASE = `http://127.0.0.1:${AGENT_PORT}`;

/** Is the local print-agent running on this machine? (UI hint before offering direct-print.) */
export async function agentAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${AGENT_BASE}/health`, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** List printers installed in Windows on this machine (via the agent's OS-spooler enumeration). */
export async function listLocalPrinters(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${AGENT_BASE}/printers`, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(t);
    if (!res.ok) return [];
    const body = (await res.json()) as { printers?: string[] };
    return body.printers ?? [];
  } catch {
    return [];
  }
}

/** Send raw bytes (hex-encoded) to a locally-installed printer by name via the agent's OS-spooler
 *  RAW-datatype path. Returns true on success. */
export async function printRawToLocalName(name: string, hex: string): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_BASE}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, format: 'rawhex', data: hex }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Convert a Blob (e.g. the TSPL bytes returned by copiesApi.labelPdf/printLabels with
 *  format=thermal_tspl) to a hex string suitable for printRawToLocalName — byte-safe, unlike a
 *  naive UTF-8 string cast. */
export async function blobToHex(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}
