'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { CircleDollarSign, Plus, Loader2 } from 'lucide-react';
import { useFines, useWaiveFine, usePayFine, useAssessMembershipFee } from '@/hooks/useFines';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { MemberPicker } from '@/components/library/MemberPicker';
import { type Fine, type FineStatus } from '@/lib/api/fines';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

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

  const fines = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  async function handleWaive() {
    if (!toWaive) return;
    try { await waiveFine.mutateAsync({ id: toWaive.id }); toast.success('Fine waived'); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to waive fine')); }
    finally { setToWaive(null); }
  }

  async function handlePay(fine: Fine) {
    try {
      const res = await payFine.mutateAsync(fine.id);
      if (res.initiate_url) window.location.href = res.initiate_url;
      else toast.error('No payment URL returned');
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
        actions={<Button variant="outline" className="gap-1.5" onClick={() => setFeeOpen(true)}><Plus className="h-4 w-4" /> Charge Membership Fee</Button>}
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
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : fines.length === 0 ? (
          <EmptyState icon={<CircleDollarSign className="h-12 w-12" />} title="No fines" description="There are no fines matching this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Assessed</th>
                  <th className="px-5 py-3 font-semibold">Balance</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fines.map((f) => (
                  <tr key={f.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3">
                      {f.member_id ? <Link href={`/${orgSlug}/members/${f.member_id}`} className="font-medium hover:text-primary">{f.member_name ?? f.membership_no}</Link> : (f.member_name ?? '—')}
                    </td>
                    <td className="px-5 py-3 capitalize">{f.type}</td>
                    <td className="px-5 py-3 text-muted-foreground truncate max-w-[14rem]">{f.bib_title ?? f.reason ?? '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(f.assessed_at)}</td>
                    <td className="px-5 py-3 font-medium">{formatMoney(f.balance ?? f.amount)}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[f.status]}>{f.status}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      {(f.status === 'outstanding' || f.status === 'partial') && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setToWaive(f)}>Waive</Button>
                          <Button variant="outline" size="sm" disabled={payFine.isPending} onClick={() => handlePay(f)}>Pay</Button>
                        </div>
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
    </div>
  );
}
