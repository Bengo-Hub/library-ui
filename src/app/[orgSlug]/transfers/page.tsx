'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeftRight, PackageCheck, X } from 'lucide-react';
import { useTransfers, useCreateTransfer, useReceiveTransfer } from '@/hooks/useCopies';
import { useBranches } from '@/hooks/useBranches';
import { copiesApi, type Copy, type CopyTransfer } from '@/lib/api/copies';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { ScannerInput } from '@/components/library/ScannerInput';
import { apiErrorMessage } from '@/lib/api/error-message';

export default function TransfersPage() {
  const orgSlug = useParams()?.orgSlug as string;
  const { data: transfers = [], isLoading } = useTransfers(orgSlug);
  const { data: branches } = useBranches(orgSlug);
  const branchList = (branches as { data?: { id: string; name: string }[] })?.data ?? [];
  const create = useCreateTransfer(orgSlug);
  const receive = useReceiveTransfer(orgSlug);

  const [copy, setCopy] = useState<Copy | null>(null);
  const [toBranch, setToBranch] = useState('');

  const branchName = (id?: string) => (id ? (branchList.find((b) => b.id === id)?.name ?? id.slice(0, 8)) : '—');

  async function handleScan(barcode: string) {
    try {
      const c = await copiesApi.getByBarcode(orgSlug, barcode);
      setCopy(c);
    } catch (e) { toast.error(await apiErrorMessage(e, 'No available copy with that barcode')); }
  }

  async function handleCreate() {
    if (!copy || !toBranch) { toast.error('Scan a copy and pick a destination branch'); return; }
    try {
      await create.mutateAsync({ copy_id: copy.id, to_branch_id: toBranch });
      toast.success('Transfer started — copy is now in transit');
      setCopy(null); setToBranch('');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to start transfer')); }
  }

  async function handleReceive(t: CopyTransfer) {
    try {
      await receive.mutateAsync(t.id);
      toast.success('Received — copy is now available at the destination');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to receive')); }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Branch Transfers" subtitle="Move copies between library branches" icon={<ArrowLeftRight className="h-5 w-5" />} />

      {/* New transfer */}
      <Card className="mb-6">
        <div className="p-5 space-y-4">
          <p className="text-sm font-bold">New transfer</p>
          {copy ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{copy.call_number || copy.barcode}</p>
                <p className="text-xs text-muted-foreground font-mono">{copy.barcode} · at {branchName(copy.branch_id)}</p>
              </div>
              <button onClick={() => setCopy(null)} className="text-muted-foreground hover:text-foreground" aria-label="Clear"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <ScannerInput onScan={handleScan} placeholder="Scan the copy barcode to transfer…" />
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={toBranch} onChange={(e) => setToBranch(e.target.value)} className="flex-1 h-11 rounded-xl border border-input bg-card px-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
              <option value="">Destination branch…</option>
              {branchList.filter((b) => b.id !== copy?.branch_id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Button className="gap-1.5" disabled={!copy || !toBranch || create.isPending} onClick={handleCreate}><ArrowLeftRight className="h-4 w-4" /> Start transfer</Button>
          </div>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : transfers.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight className="h-12 w-12" />} title="No transfers" description="Scan a copy above to move it to another branch." />
      ) : (
        <div className="space-y-2">
          {(transfers as CopyTransfer[]).map((t) => (
            <Card key={t.id}>
              <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm">
                  <span className="font-semibold">{branchName(t.from_branch_id)}</span>
                  <ArrowLeftRight className="inline h-3.5 w-3.5 mx-2 text-muted-foreground" />
                  <span className="font-semibold">{branchName(t.to_branch_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === 'RECEIVED' ? 'success' : t.status === 'IN_TRANSIT' ? 'warning' : 'outline'}>{t.status.replace('_', ' ')}</Badge>
                  {t.status === 'IN_TRANSIT' && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={receive.isPending} onClick={() => handleReceive(t)}><PackageCheck className="h-4 w-4" /> Receive</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
