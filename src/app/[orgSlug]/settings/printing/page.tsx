'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Download, Printer, RefreshCw, Usb } from 'lucide-react';
import { PageHeader } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Select } from '@/components/ui/form';
import { getAgentInfo, listLocalPrinters } from '@/lib/library/print-agent';
import { getLabelPrintPrefs, setLabelPrintPrefs } from '@/lib/library/label-print-prefs';

// pos-service hosts the print-agent installer + its download redirect (public, no auth — a plain
// browser <a> navigation, so no CORS/cross-origin auth is needed here). No equivalent exists in
// library-api because the agent itself is shared platform-wide, not per-service — see
// library-api/docs/barcode-labels.md's "Direct USB printing" section.
const POS_API_BASE = process.env.NEXT_PUBLIC_POS_API_URL ?? 'https://posapi.codevertexafrica.com';
const AGENT_DOWNLOAD_URL = `${POS_API_BASE}/api/v1/pos/print-agent/download?os=windows`;

/**
 * Settings > Printing — background print-agent status/download + local printer detection.
 * Promotes what used to be an inline banner buried inside the "Print labels" dialog into a
 * persistent settings page, so staff can install/verify the agent and pick a default printer
 * BEFORE they need to print, instead of discovering "agent not detected" only mid-print-job.
 */
export default function PrintingSettingsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [reachable, setReachable] = useState(false);
  const [version, setVersion] = useState<string | undefined>();
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => getLabelPrintPrefs().printerName ?? '');
  const [detecting, setDetecting] = useState(false);

  const detect = useCallback(async () => {
    setDetecting(true);
    try {
      const [info, list] = await Promise.all([getAgentInfo(), listLocalPrinters()]);
      setReachable(info.reachable);
      setVersion(info.version);
      setPrinters(list);
      setSelectedPrinter((prev) => prev || list[0] || '');
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => { void detect(); }, [detect]);

  // Saving the selected printer here is what "connect" means for direct-USB printing — no
  // pairing step exists (or is needed): the print dialogs already read this same saved
  // preference (see lib/library/label-print-prefs.ts) so picking it here is enough to make
  // both the bulk and per-row "Print via Local Agent" actions default to it.
  function saveSelectedPrinter(name: string) {
    setSelectedPrinter(name);
    setLabelPrintPrefs({ ...getLabelPrintPrefs(), printerName: name });
    toast.success(`${name} set as the default label printer`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader title="Printing" subtitle="Direct USB label printing via the local print agent" icon={<Printer className="h-5 w-5" />} />

      <Card className="p-5 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Usb className="h-4 w-4" /> Background Printing (Print Agent)</h3>
          <div className="flex items-center gap-2">
            {reachable ? (
              <Badge variant="success">Agent running{version ? ` v${version}` : ''}</Badge>
            ) : (
              <Badge variant="outline">Agent not detected</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          A small Windows service that runs on this terminal so labels print directly via USB —
          bypassing the print dialog entirely (no paper-preset guessing, no rotated labels).
          It&apos;s shared platform-wide: if it&apos;s already installed/running for POS on this
          machine, it works here too with no separate install.
        </p>
        <div className="flex items-center gap-2">
          <a href={AGENT_DOWNLOAD_URL} className="inline-flex">
            <Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Download print agent</Button>
          </a>
          <Button variant="outline" className="gap-1.5" onClick={detect} disabled={detecting}>
            <RefreshCw className={`h-4 w-4 ${detecting ? 'animate-spin' : ''}`} /> {detecting ? 'Checking…' : 'Refresh status'}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Local Printers</h3>
          <Button variant="outline" className="gap-1.5" onClick={detect} disabled={detecting}>
            <RefreshCw className={`h-4 w-4 ${detecting ? 'animate-spin' : ''}`} /> Detect Printers
          </Button>
        </div>
        {!reachable ? (
          <p className="text-sm text-muted-foreground">
            Install/start the print agent above, then click Detect Printers.
          </p>
        ) : printers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Print agent detected, but no installed printers found. Install the printer&apos;s Windows driver first, then Detect Printers again.
          </p>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Default label printer</label>
            <Select value={selectedPrinter} onChange={(e) => saveSelectedPrinter(e.target.value)}>
              {printers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Used by &quot;Print via Local Agent&quot; on the Copies page&apos;s label-print actions.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
