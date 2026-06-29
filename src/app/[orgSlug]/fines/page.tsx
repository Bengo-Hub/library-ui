'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { CircleDollarSign, Plus, Loader2 } from 'lucide-react';
import { useFines, useWaiveFine, usePayFine, useAssessMembershipFee } from '@/hooks/useFines';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { MemberPicker } from '@/components/library/MemberPicker';
import { MembershipPaymentModal, type PaymentIntent } from '@/components/library/MembershipPaymentModal';
import { type Fine, type FineStatus } from '@/lib/api/fines';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';
import { FeatureGate } from '@bengo-hub/shared-ui-lib/subscription';
import { Can } from '@/components/auth/Can';

const STATUS_VARIANT: Record<FineStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  outstanding: 'error', partial: 'warning', paid: 'success', waived: 'outline',
};

const PAGE_SIZE = 20;

export default function FinesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [status, setStatus] = useState<FineStatus | ''>('outstanding');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFines(orgSlug, { status: status || undefined, page, limit: PAGE_SIZE });
  const waiveFine = useWaiveFine(orgSlug);
  const payFine = usePayFine(orgSlug);
  const assessFee = useAssessMembershipFee(orgSlug);

  const [toWaive, setToWaive] = useState<Fine | null>(null);
  const [feeMember, setFeeMember] = useState<string | null>(null);
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [payIntent, setPayIntent] = useState<PaymentIntent | null>(null);

  const fines = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const columns: Column<Fine>[] = [
    {
      key: 'member', header: 'Member', primary: true,
      cell: (f) => f.member_id
        ? <Link href={`/${orgSlug}/members/${f.member_id}`} className="font-medium hover:text-primary">{f.member_name ?? f.membership_no}</Link>
        : (f.member_name ?? '—'),
    },
    { key: 'type', header: 'Type', cell: (f) => <span className="capitalize">{f.type}</span> },
    { key: 'reason', header: 'Reason', cell: (f) => <span className="text-muted-foreground line-clamp-2 md:truncate md:max-w-56 block">{f.bib_title ?? f.reason ?? '—'}</span> },
    { key: 'assessed', header: 'Assessed', cell: (f) => <span className="text-muted-foreground">{formatDate(f.assessed_at)}</span> },
    { key: 'balance', header: 'Balance', cell: (f) => <span className="font-medium">{formatMoney(f.balance ?? f.amount)}</span> },
    { key: 'status', header: 'Status', cell: (f) => <Badge variant={STATUS_VARIANT[f.status]}>{f.status}</Badge> },
    {
      key: 'actions', header: '', actions: true, align: 'right',
      cell: (f) => (f.status === 'outstanding' || f.status === 'partial') ? (
        <div className="flex items-center justify-end gap-1">
          <Can perm="library.fines.waive"><Button variant="ghost" size="sm" onClick={() => setToWaive(f)}>Waive</Button></Can>
          <Can perm="library.fines.pay"><Button variant="outline" size="sm" disabled={payFine.isPending} onClick={() => handlePay(f)}>Pay</Button></Can>
        </div>
      ) : null,
    },
  ];

  async function handleWaive() {
    if (!toWaive) return;
    try { await waiveFine.mutateAsync({ id: toWaive.id }); toast.success('Fine waived'); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to waive fine')); }
    finally { setToWaive(null); }
  }

  async function handlePay(fine: Fine) {
    try {
      const res = await payFine.mutateAsync(fine.id);
      if (res.intent_id) setPayIntent(res); // in-app treasury payment modal
      else toast.error('No payment intent returned');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to start payment')); }
  }

  async function chargeFee() {
    if (!feeMember) { toast.error('Select a member'); return; }
    const amount = Number(feeAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await assessFee.mutateAsync({ member_id: feeMember, amount, reason: 'Membership fee' });
      toast.success('Membership fee charged');
      setFeeOpen(false); setFeeMember(null); setFeeAmount('');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to charge fee')); }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Fines & Fees"
        subtitle="Outstanding balances and membership fees"
        icon={<CircleDollarSign className="h-5 w-5" />}
        actions={<Can perm="library.membership_fees.add"><FeatureGate feature="library_fines"><Button variant="outline" className="gap-1.5" onClick={() => setFeeOpen(true)}><Plus className="h-4 w-4" /> Charge Membership Fee</Button></FeatureGate></Can>}
      />

      <CapsuleTabs
        className="mb-6"
        value={status || 'all'}
        onChange={(v) => { setStatus(v === 'all' ? '' : (v as FineStatus)); setPage(1); }}
        options={[
          { value: 'outstanding', label: 'Outstanding' },
          { value: 'partial', label: 'Partial' },
          { value: 'paid', label: 'Paid' },
          { value: 'waived', label: 'Waived' },
          { value: 'all', label: 'All' },
        ]}
      />

      <Card>
        <DataTable
          columns={columns}
          rows={fines}
          rowKey={(f) => f.id}
          loading={isLoading}
          empty={<EmptyState icon={<CircleDollarSign className="h-12 w-12" />} title="No fines" description="There are no fines matching this filter." />}
        />
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={!!toWaive}
        title="Waive this fine?"
        description={`Waiving ${formatMoney(toWaive?.balance ?? toWaive?.amount)} for ${toWaive?.member_name ?? 'this member'}. This is a sensitive, audited action.`}
        variant="warning"
        confirmLabel="Waive fine"
        onConfirm={handleWaive}
        onCancel={() => setToWaive(null)}
      />

      {/* Membership fee: pick member then enter amount */}
      <MemberPicker
        open={feeOpen && !feeMember}
        orgSlug={orgSlug}
        title="Charge membership fee — choose member"
        confirmLabel="Next"
        onSelect={(id) => setFeeMember(id)}
        onCancel={() => { setFeeOpen(false); setFeeMember(null); }}
      />
      <Dialog
        open={feeOpen && !!feeMember}
        onClose={() => { setFeeOpen(false); setFeeMember(null); setFeeAmount(''); }}
        title="Membership fee amount"
        footer={<><Button variant="outline" onClick={() => { setFeeOpen(false); setFeeMember(null); }}>Cancel</Button><Button onClick={chargeFee} disabled={assessFee.isPending} className="gap-1.5">{assessFee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Charge fee</Button></>}
      >
        <Field label="Amount (KES)" required>
          <input type="number" step="0.01" autoFocus value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
      </Dialog>

      <MembershipPaymentModal
        open={!!payIntent}
        orgSlug={orgSlug}
        intent={payIntent}
        description="Library fine payment"
        referenceType="library_fine"
        onClose={() => setPayIntent(null)}
        onPaid={() => toast.success('Fine paid')}
      />
    </div>
  );
}
