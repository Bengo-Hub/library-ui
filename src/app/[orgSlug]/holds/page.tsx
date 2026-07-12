'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookMarked, Plus, X, BellRing, Loader2 } from 'lucide-react';
import { useHolds, usePlaceHold, useCancelHold, useMarkHoldReady } from '@/hooks/useHolds';
import { useBibCopies } from '@/hooks/useCopies';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Can } from '@/components/auth/Can';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { BibPicker } from '@/components/library/BibPicker';
import { MemberPicker } from '@/components/library/MemberPicker';
import type { Hold, HoldStatus } from '@/lib/api/holds';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';
import { FeatureLock } from '@bengo-hub/shared-ui-lib/subscription';

const STATUS_VARIANT: Record<HoldStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'warning', ready: 'success', fulfilled: 'outline', cancelled: 'outline', expired: 'error',
};

const PAGE_SIZE = 20;

export default function HoldsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [status, setStatus] = useState<HoldStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHolds(orgSlug, { status: status || undefined, page, limit: PAGE_SIZE });
  const placeHold = usePlaceHold(orgSlug);
  const cancelHold = useCancelHold(orgSlug);
  const markReady = useMarkHoldReady(orgSlug);

  async function handleMarkReady(h: Hold) {
    try { await markReady.mutateAsync(h.id); toast.success('Hold marked ready for pickup'); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to mark ready')); }
  }

  const [step, setStep] = useState<'idle' | 'pick-bib' | 'pick-member' | 'pick-copy'>('idle');
  const [pendingBib, setPendingBib] = useState<string | null>(null);
  const [pendingMember, setPendingMember] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<Hold | null>(null);

  const { data: bibCopiesPage } = useBibCopies(orgSlug, pendingBib ?? '');

  const holds = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const columns: Column<Hold>[] = [
    { key: 'title', header: 'Title', primary: true, cell: (h) => <span className="font-medium">{h.bib_title ?? '—'}</span> },
    { key: 'member', header: 'Member', cell: (h) => h.member_name ?? h.membership_no ?? '—' },
    { key: 'queue', header: 'Queue', cell: (h) => h.queue_position != null ? `#${h.queue_position}` : '—' },
    { key: 'placed', header: 'Placed', cell: (h) => <span className="text-muted-foreground">{formatDate(h.placed_at)}</span> },
    { key: 'status', header: 'Status', cell: (h) => <Badge variant={STATUS_VARIANT[h.status]}>{h.status}</Badge> },
    {
      key: 'actions', header: '', actions: true, align: 'right',
      cell: (h) => (h.status === 'pending' || h.status === 'ready') ? (
        <div className="flex items-center justify-end gap-1">
          {h.status === 'pending' && (
            <Can perm="library.holds.change">
              <Button variant="ghost" size="sm" className="gap-1.5 text-primary" disabled={markReady.isPending} onClick={() => handleMarkReady(h)}>
                <BellRing className="h-4 w-4" /> Mark ready
              </Button>
            </Can>
          )}
          <Can perm="library.holds.delete">
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setToCancel(h)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </Can>
        </div>
      ) : null,
    },
  ];

  async function completePlace(copyId?: string) {
    if (!pendingBib || !pendingMember) return;
    try {
      await placeHold.mutateAsync({ bib_record_id: pendingBib, member_id: pendingMember, copy_id: copyId });
      toast.success(copyId ? 'Item-level hold placed' : 'Hold placed');
      setStep('idle');
      setPendingBib(null);
      setPendingMember(null);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to place hold'));
    }
  }

  function onMemberSelected(memberId: string) {
    setPendingMember(memberId);
    setStep('pick-copy');
  }

  async function handleCancel() {
    if (!toCancel) return;
    try {
      await cancelHold.mutateAsync(toCancel.id);
      toast.success('Hold cancelled');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to cancel hold'));
    } finally {
      setToCancel(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Holds & Reservations"
        subtitle="Manage the reservation queue"
        icon={<BookMarked className="h-5 w-5" />}
        actions={<Can perm="library.holds.place"><FeatureLock feature="library_holds" mode="block"><Button className="gap-1.5" onClick={() => setStep('pick-bib')}><Plus className="h-4 w-4" /> Place Hold</Button></FeatureLock></Can>}
      />

      <CapsuleTabs
        className="mb-6"
        value={status || 'all'}
        onChange={(v) => { setStatus(v === 'all' ? '' : (v as HoldStatus)); setPage(1); }}
        options={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'ready', label: 'Ready' },
          { value: 'fulfilled', label: 'Fulfilled' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />

      <Card>
        <DataTable
          columns={columns}
          rows={holds}
          rowKey={(h) => h.id}
          loading={isLoading}
          skeletonRows={5}
          empty={<EmptyState icon={<BookMarked className="h-12 w-12" />} title="No holds" description="There are no reservations matching this filter." />}
        />
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <BibPicker
        open={step === 'pick-bib'}
        orgSlug={orgSlug}
        title="Place a hold — choose the title"
        confirmLabel="Next"
        onSelect={(bibId) => { setPendingBib(bibId); setStep('pick-member'); }}
        onCancel={() => setStep('idle')}
      />
      <MemberPicker
        open={step === 'pick-member'}
        orgSlug={orgSlug}
        title="Place a hold — choose the member"
        confirmLabel="Next"
        onSelect={onMemberSelected}
        onCancel={() => { setStep('idle'); setPendingBib(null); }}
      />

      {/* Optional: pick a specific copy for an item-level hold */}
      <Dialog
        open={step === 'pick-copy'}
        onClose={() => { setStep('idle'); setPendingBib(null); setPendingMember(null); }}
        title="Specific copy (optional)"
      >
        <div className="space-y-4 p-1">
          <p className="text-sm text-muted-foreground">Select a specific copy if the member wants a particular item, or skip to place a bib-level hold.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(bibCopiesPage ?? []).map((copy) => (
              <button
                key={copy.id}
                onClick={() => completePlace(copy.id)}
                disabled={placeHold.isPending}
                className="w-full text-left px-3 py-2.5 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
              >
                <span className="font-mono font-medium">{copy.barcode}</span>
                <span className="text-muted-foreground ml-2">· {copy.branch_name ?? copy.branch_id} · {copy.status}</span>
              </button>
            ))}
            {(bibCopiesPage ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-3 text-center">No copies found for this title.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setStep('idle'); setPendingBib(null); setPendingMember(null); }}>Cancel</Button>
            <Button disabled={placeHold.isPending} onClick={() => completePlace(undefined)} className="gap-1.5">
              {placeHold.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Skip — bib-level hold
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel this hold?"
        description={`The reservation for "${toCancel?.bib_title ?? ''}" will be removed from the queue.`}
        variant="danger"
        confirmLabel="Cancel hold"
        onConfirm={handleCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
