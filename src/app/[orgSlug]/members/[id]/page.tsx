'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Ban, CheckCircle2, CircleDollarSign, Mail, MapPin, Pencil, Phone, RotateCcw, Trash2, User } from 'lucide-react';
import { useMember, useUpdateMember, useIssueMembershipFee, useDeleteMember } from '@/hooks/useMembers';
import { useMemberLoans, useRenew } from '@/hooks/useCirculation';
import { useMemberFines, useWaiveFine, usePayFine } from '@/hooks/useFines';
import { PageHeader, Skeleton, StatCard } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MemberFormDialog } from '@/components/library/MemberFormDialog';
import { MembershipPaymentModal, type PaymentIntent } from '@/components/library/MembershipPaymentModal';
import { Can } from '@/components/auth/Can';
import type { MemberInput } from '@/lib/api/members';
import type { Fine } from '@/lib/api/fines';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney, isOverdue } from '@/lib/format';

type Tab = 'loans' | 'fines';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;

  const { data: member, isLoading } = useMember(orgSlug, id);
  const { data: loans = [], isLoading: loansLoading } = useMemberLoans(orgSlug, id);
  const { data: fines = [], isLoading: finesLoading } = useMemberFines(orgSlug, id);
  const updateMember = useUpdateMember(orgSlug);
  const deleteMember = useDeleteMember(orgSlug);
  const renew = useRenew(orgSlug);
  const waiveFine = useWaiveFine(orgSlug);
  const payFine = usePayFine(orgSlug);
  const issueFee = useIssueMembershipFee(orgSlug);

  const [tab, setTab] = useState<Tab>('loans');
  const [editOpen, setEditOpen] = useState(false);
  const [toWaive, setToWaive] = useState<Fine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [payIntent, setPayIntent] = useState<PaymentIntent | null>(null);
  const [payRefType, setPayRefType] = useState<'membership_fee' | 'library_fine'>('membership_fee');

  const outstanding = fines.filter((f) => f.status === 'outstanding' || f.status === 'partial');

  async function handleEdit(data: MemberInput) {
    try {
      await updateMember.mutateAsync({ id, data });
      toast.success('Member updated');
      setEditOpen(false);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to update member'));
    }
  }

  async function handleWaive() {
    if (!toWaive) return;
    try {
      await waiveFine.mutateAsync({ id: toWaive.id });
      toast.success('Fine waived');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to waive fine'));
    } finally {
      setToWaive(null);
    }
  }

  async function handlePay(fine: Fine) {
    try {
      const res = await payFine.mutateAsync(fine.id);
      if (res.intent_id) { setPayRefType('library_fine'); setPayIntent(res); }
      else toast.error('No payment intent returned');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to start payment'));
    }
  }

  async function handleChargeMembership() {
    try {
      const res = await issueFee.mutateAsync(id);
      setPayRefType('membership_fee'); setPayIntent(res); // open the in-app treasury payment modal
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to issue membership fee'));
    }
  }

  async function handleToggleStatus() {
    if (!member) return;
    const next = member.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateMember.mutateAsync({ id, data: { first_name: member.first_name, last_name: member.last_name, status: next } });
      toast.success(next === 'suspended' ? 'Member suspended' : 'Member reactivated');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to update status'));
    }
  }

  async function handleDelete() {
    try {
      await deleteMember.mutateAsync(id);
      toast.success('Member deleted');
      router.replace(`/${orgSlug}/members`);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to delete member'));
    } finally {
      setConfirmDelete(false);
    }
  }

  if (isLoading) {
    return <div className="max-w-4xl mx-auto space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-40" /></div>;
  }
  if (!member) {
    return <div className="max-w-4xl mx-auto p-8 text-center text-muted-foreground">Member not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/${orgSlug}/members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      <Card>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><User className="h-8 w-8" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black tracking-tight">{member.full_name ?? `${member.first_name} ${member.last_name}`}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="font-mono">{member.membership_no}</span>
              {member.tier_name && <Badge variant="outline">{member.tier_name}</Badge>}
              <Badge variant={member.status === 'active' ? 'success' : member.status === 'suspended' ? 'error' : 'warning'}>{member.status}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {member.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{member.email}</span>}
              {member.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{member.phone}</span>}
              {member.expires_at && <span>Expires {formatDate(member.expires_at)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Can perm="library.membership_fees.add">
              <Button variant="outline" className="gap-1.5" disabled={issueFee.isPending} onClick={handleChargeMembership}><CircleDollarSign className="h-4 w-4" /> Charge fee</Button>
            </Can>
            <Can perm="library.members.change">
              <Button variant="outline" className="gap-1.5" disabled={updateMember.isPending} onClick={handleToggleStatus}>
                {member.status === 'suspended' ? <><CheckCircle2 className="h-4 w-4" /> Reactivate</> : <><Ban className="h-4 w-4" /> Suspend</>}
              </Button>
            </Can>
            <Can perm="library.members.change">
              <Button variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
            </Can>
            <Can perm="library.members.delete">
              <Button variant="destructive" size="icon" title="Delete member" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /></Button>
            </Can>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <StatCard label="Active Loans" value={loans.filter((l) => l.status !== 'returned').length} icon={<BookOpen className="h-5 w-5" />} accent="bg-blue-500/15 text-blue-500" />
        <StatCard label="Outstanding Fines" value={formatMoney(outstanding.reduce((s, f) => s + (f.balance ?? f.amount), 0))} icon={<CircleDollarSign className="h-5 w-5" />} accent="bg-rose-500/15 text-rose-500" />
      </div>

      <CapsuleTabs
        className="mt-6 mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'loans', label: 'Loans', count: loans.length },
          { value: 'fines', label: 'Fines', count: fines.length },
        ]}
      />

      {tab === 'loans' ? (
        <Card>
          {loansLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : loans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No loan history.</div>
          ) : (
            <ul className="divide-y divide-border">
              {loans.map((loan) => {
                const overdue = loan.status !== 'returned' && isOverdue(loan.due_date);
                return (
                  <li key={loan.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{loan.bib_title ?? loan.copy_barcode}</p>
                      <p className="text-xs text-muted-foreground">Out {formatDate(loan.checked_out_at)} · due {formatDate(loan.due_date)}</p>
                    </div>
                    {loan.status === 'returned' ? <Badge variant="outline">Returned</Badge>
                      : overdue ? <Badge variant="error">Overdue</Badge>
                      : <Badge variant="success">On loan</Badge>}
                    {loan.status !== 'returned' && (
                      <Button variant="ghost" size="icon" title="Renew" disabled={renew.isPending} onClick={() => renew.mutate(loan.id)}><RotateCcw className="h-4 w-4" /></Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          {finesLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : fines.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No fines on record.</div>
          ) : (
            <ul className="divide-y divide-border">
              {fines.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatMoney(f.balance ?? f.amount)} <span className="font-normal text-muted-foreground">· {f.type}</span></p>
                    <p className="text-xs text-muted-foreground truncate">{f.bib_title ?? f.reason ?? 'Fine'} · {formatDate(f.assessed_at)}</p>
                  </div>
                  <Badge variant={f.status === 'paid' ? 'success' : f.status === 'waived' ? 'outline' : 'error'}>{f.status}</Badge>
                  {(f.status === 'outstanding' || f.status === 'partial') && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setToWaive(f)}>Waive</Button>
                      <Button variant="outline" size="sm" disabled={payFine.isPending} onClick={() => handlePay(f)}>Pay</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <MemberFormDialog open={editOpen} orgSlug={orgSlug} initial={member} saving={updateMember.isPending} onSubmit={handleEdit} onClose={() => setEditOpen(false)} />

      <MembershipPaymentModal
        open={!!payIntent}
        orgSlug={orgSlug}
        intent={payIntent}
        referenceType={payRefType}
        description={payRefType === 'library_fine' ? 'Library fine payment' : 'Library membership fee'}
        onClose={() => setPayIntent(null)}
        onPaid={() => toast.success(payRefType === 'library_fine' ? 'Fine paid' : 'Membership fee paid')}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this member?"
        description="This permanently removes the patron record. Blocked if they have active loans or unpaid fines."
        variant="danger"
        confirmLabel="Delete member"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={!!toWaive}
        title="Waive this fine?"
        description={`Waiving ${formatMoney(toWaive?.balance ?? toWaive?.amount)} for this member. This is a sensitive action and is audited.`}
        variant="warning"
        confirmLabel="Waive fine"
        onConfirm={handleWaive}
        onCancel={() => setToWaive(null)}
      />
    </div>
  );
}
