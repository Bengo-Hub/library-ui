'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { useStocktakes, useStartStocktake, useScanStocktake, useFinalizeStocktake } from '@/hooks/useCopies';
import { useBranches } from '@/hooks/useBranches';
import { PageHeader, EmptyState, Skeleton, StatCard } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScannerInput } from '@/components/library/ScannerInput';
import { apiErrorMessage } from '@/lib/api/error-message';
import type { StockCount } from '@/lib/api/copies';

export default function StocktakePage() {
  const orgSlug = useParams()?.orgSlug as string;
  const { data: sessions = [], isLoading } = useStocktakes(orgSlug);
  const { data: branches } = useBranches(orgSlug);
  const branchList = Array.isArray(branches) ? branches : ((branches as { data?: { id: string; name: string }[] })?.data ?? []);
  const start = useStartStocktake(orgSlug);
  const scan = useScanStocktake(orgSlug);
  const finalize = useFinalizeStocktake(orgSlug);

  const [branchId, setBranchId] = useState('');
  const [active, setActive] = useState<StockCount | null>(null);
  const [toFinalize, setToFinalize] = useState<StockCount | null>(null);
  const [lastScan, setLastScan] = useState<string>('');

  const counting = (sessions as StockCount[]).filter((s) => s.status === 'COUNTING');

  async function handleStart() {
    if (!branchId) { toast.error('Select a branch'); return; }
    try {
      const s = await start.mutateAsync({ branch_id: branchId });
      setActive(s);
      toast.success('Stocktake started');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to start stocktake')); }
  }

  async function handleScan(barcode: string) {
    if (!active) return;
    try {
      const res = await scan.mutateAsync({ id: active.id, barcode });
      setActive(res.stocktake);
      setLastScan(barcode);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Scan rejected')); }
  }

  async function handleFinalize(s: StockCount) {
    try {
      const res = await finalize.mutateAsync(s.id);
      toast.success(`Stocktake complete — ${res.missing} item(s) flagged missing`);
      if (active?.id === s.id) setActive(null);
      setToFinalize(null);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to finalize')); }
  }

  const branchName = (id: string) => branchList.find((b) => b.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Stocktake" subtitle="Scan-driven cycle count — unscanned copies are flagged missing" icon={<ClipboardCheck className="h-5 w-5" />} />

      {/* Active counting session */}
      {active && active.status === 'COUNTING' ? (
        <Card className="mb-6 border-primary/40">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold">Counting · {branchName(active.branch_id)}</p>
                <p className="text-xs text-muted-foreground">Scan every copy on the shelf, then finalize.</p>
              </div>
              <Button variant="outline" className="gap-1.5" onClick={() => setToFinalize(active)}><CheckCircle2 className="h-4 w-4" /> Finalize</Button>
            </div>
            <ScannerInput onScan={handleScan} loading={scan.isPending} placeholder="Scan copy barcode…" />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Expected" value={active.expected_count} />
              <StatCard label="Scanned" value={active.scanned_count} />
              <StatCard label="Outstanding" value={Math.max(0, active.expected_count - active.scanned_count)} />
            </div>
            {lastScan && <p className="text-xs text-muted-foreground">Last scanned: <span className="font-mono">{lastScan}</span></p>}
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="p-5 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
                <option value="">Select a branch…</option>
                {branchList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <Button className="gap-1.5" disabled={start.isPending} onClick={handleStart}><Play className="h-4 w-4" /> Start stocktake</Button>
          </div>
        </Card>
      )}

      {/* History */}
      <h2 className="text-sm font-bold text-muted-foreground mb-3">Sessions</h2>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-12 w-12" />} title="No stocktakes yet" description="Start a branch stocktake to reconcile shelf copies." />
      ) : (
        <div className="space-y-2">
          {(sessions as StockCount[]).map((s) => (
            <Card key={s.id}>
              <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{branchName(s.branch_id)}</p>
                  <p className="text-xs text-muted-foreground">{s.scanned_count}/{s.expected_count} scanned{s.status === 'COMPLETED' ? ` · ${s.missing_count} missing` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === 'COMPLETED' && s.missing_count > 0 && <Badge variant="error" className="gap-1"><AlertTriangle className="h-3 w-3" />{s.missing_count} missing</Badge>}
                  <Badge variant={s.status === 'COMPLETED' ? 'success' : s.status === 'COUNTING' ? 'warning' : 'outline'}>{s.status}</Badge>
                  {s.status === 'COUNTING' && active?.id !== s.id && <Button size="sm" variant="outline" onClick={() => setActive(s)}>Resume</Button>}
                  {s.status === 'COUNTING' && <Button size="sm" variant="outline" onClick={() => setToFinalize(s)}>Finalize</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toFinalize}
        onCancel={() => setToFinalize(null)}
        onConfirm={() => toFinalize && handleFinalize(toFinalize)}
        title="Finalize stocktake?"
        description="Copies at this branch that were not scanned will be flagged LOST. This cannot be undone."
        confirmLabel="Finalize"
        variant="warning"
      />
    </div>
  );
}
