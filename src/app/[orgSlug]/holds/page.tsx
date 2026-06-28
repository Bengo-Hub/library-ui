'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookMarked, Plus, X } from 'lucide-react';
import { useHolds, usePlaceHold, useCancelHold } from '@/hooks/useHolds';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import { BibPicker } from '@/components/library/BibPicker';
import { MemberPicker } from '@/components/library/MemberPicker';
import type { Hold, HoldStatus } from '@/lib/api/holds';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';
import { FeatureGate } from '@bengo-hub/shared-ui-lib/subscription';

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

  const [step, setStep] = useState<'idle' | 'pick-bib' | 'pick-member'>('idle');
  const [pendingBib, setPendingBib] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<Hold | null>(null);

  const holds = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  async function completePlace(memberId: string) {
    if (!pendingBib) return;
    try {
      await placeHold.mutateAsync({ bib_record_id: pendingBib, member_id: memberId });
      toast.success('Hold placed');
      setStep('idle');
      setPendingBib(null);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to place hold'));
    }
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
        actions={<FeatureGate feature="library_holds"><Button className="gap-1.5" onClick={() => setStep('pick-bib')}><Plus className="h-4 w-4" /> Place Hold</Button></FeatureGate>}
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
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : holds.length === 0 ? (
          <EmptyState icon={<BookMarked className="h-12 w-12" />} title="No holds" description="There are no reservations matching this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Queue</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holds.map((h) => (
                  <tr key={h.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3 font-medium">{h.bib_title ?? '—'}</td>
                    <td className="px-5 py-3">{h.member_name ?? h.membership_no ?? '—'}</td>
                    <td className="px-5 py-3">{h.queue_position != null ? `#${h.queue_position}` : '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(h.placed_at)}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[h.status]}>{h.status}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      {(h.status === 'pending' || h.status === 'ready') && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setToCancel(h)}>
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        confirmLabel="Place hold"
        loading={placeHold.isPending}
        onSelect={completePlace}
        onCancel={() => { setStep('idle'); setPendingBib(null); }}
      />

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
