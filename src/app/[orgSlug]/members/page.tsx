'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Plus, Search, Pencil, Eye, CircleDollarSign, Ban, CheckCircle2, Trash2, CreditCard } from 'lucide-react';
import { useMembers, useCreateMember, useUpdateMember, useIssueMembershipFee, useDeleteMember } from '@/hooks/useMembers';
import { membersApi } from '@/lib/api/members';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MemberFormDialog } from '@/components/library/MemberFormDialog';
import { MembershipPaymentModal, type PaymentIntent } from '@/components/library/MembershipPaymentModal';
import { useDocumentPreview, PdfPreview } from '@bengo-hub/shared-ui-lib';
import { type Member, type MemberInput, type MemberStatus } from '@/lib/api/members';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatMoney } from '@/lib/format';
import { FeatureLock } from '@bengo-hub/shared-ui-lib/subscription';
import { Can } from '@/components/auth/Can';

const STATUS_VARIANT: Record<MemberStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  active: 'success', suspended: 'error', expired: 'warning', pending: 'outline',
};

const PAGE_SIZE = 20;

export default function MembersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MemberStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 300);

  const { data, isLoading } = useMembers(orgSlug, { q: debouncedQ || undefined, status: status || undefined, page, limit: PAGE_SIZE });
  const createMember = useCreateMember(orgSlug);
  const updateMember = useUpdateMember(orgSlug);
  const issueFee = useIssueMembershipFee(orgSlug);
  const deleteMember = useDeleteMember(orgSlug);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | undefined>();
  const [payIntent, setPayIntent] = useState<PaymentIntent | null>(null);
  const [toDelete, setToDelete] = useState<Member | null>(null);

  async function chargeFee(m: Member) {
    try { setPayIntent(await issueFee.mutateAsync(m.id)); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to issue membership fee')); }
  }
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });
  function downloadCard(m: Member) {
    void openPreview(() => membersApi.cardPdf(orgSlug, m.id), {
      fileName: `member-card-${m.membership_no}.pdf`, title: 'Membership card', orientation: 'landscape',
    });
  }
  async function toggleStatus(m: Member) {
    const next: MemberStatus = m.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateMember.mutateAsync({ id: m.id, data: { first_name: m.first_name, last_name: m.last_name, status: next } });
      toast.success(next === 'suspended' ? 'Member suspended' : 'Member reactivated');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to update status')); }
  }
  async function confirmDeleteMember() {
    if (!toDelete) return;
    try { await deleteMember.mutateAsync(toDelete.id); toast.success('Member deleted'); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to delete member')); }
    finally { setToDelete(null); }
  }

  const members = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const columns: Column<Member>[] = [
    {
      key: 'member', header: 'Member', primary: true,
      cell: (m) => (
        <>
          <Link href={`/${orgSlug}/members/${m.id}`} className="font-medium hover:text-primary">{m.full_name ?? `${m.first_name} ${m.last_name}`}</Link>
          {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
        </>
      ),
    },
    { key: 'no', header: 'No.', mobileLabel: 'Member No.', cell: (m) => <span className="font-mono text-xs">{m.membership_no}</span> },
    { key: 'tier', header: 'Tier', cell: (m) => m.tier_name ?? '—' },
    { key: 'loans', header: 'Loans', cell: (m) => m.active_loans ?? 0 },
    { key: 'fines', header: 'Fines', cell: (m) => (m.outstanding_fines ?? 0) > 0 ? <span className="text-destructive font-medium">{formatMoney(m.outstanding_fines)}</span> : '—' },
    { key: 'status', header: 'Status', cell: (m) => <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge> },
    {
      key: 'actions', header: '', actions: true, align: 'right',
      cell: (m) => (
        <div className="flex items-center justify-end gap-0.5">
          <Link href={`/${orgSlug}/members/${m.id}`}>
            <Button variant="ghost" size="icon" title="View"><Eye className="h-4 w-4" /></Button>
          </Link>
          <Button variant="ghost" size="icon" title="Download membership card" onClick={() => downloadCard(m)}><CreditCard className="h-4 w-4" /></Button>
          <Can perm="library.membership_fees.add">
            <Button variant="ghost" size="icon" title="Charge fee" disabled={issueFee.isPending} onClick={() => chargeFee(m)}><CircleDollarSign className="h-4 w-4" /></Button>
          </Can>
          <Can perm="library.members.change">
            <Button variant="ghost" size="icon" title={m.status === 'suspended' ? 'Reactivate' : 'Suspend'} disabled={updateMember.isPending} onClick={() => toggleStatus(m)}>
              {m.status === 'suspended' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4" />}
            </Button>
          </Can>
          <Can perm="library.members.change">
            <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          </Can>
          <Can perm="library.members.delete">
            <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Can>
        </div>
      ),
    },
  ];

  async function handleSubmit(input: MemberInput) {
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, data: input });
        toast.success('Member updated');
      } else {
        await createMember.mutateAsync(input);
        toast.success('Member created');
      }
      setDialogOpen(false);
      setEditing(undefined);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save member'));
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Members"
        subtitle="Library patrons"
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/${orgSlug}/members/tiers`}><Button variant="outline">Tiers</Button></Link>
            <Link href={`/${orgSlug}/members/policies`}><Button variant="outline">Policies</Button></Link>
            <Can perm="library.members.add">
              <FeatureLock feature="library_members" mode="block">
                <Button className="gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4" /> New Member</Button>
              </FeatureLock>
            </Can>
          </div>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, membership no. or phone…" className="w-full h-11 rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
      </div>

      <CapsuleTabs
        className="mb-6"
        value={status || 'all'}
        onChange={(v) => { setStatus(v === 'all' ? '' : (v as MemberStatus)); setPage(1); }}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'expired', label: 'Expired' },
          { value: 'pending', label: 'Pending' },
        ]}
      />

      <Card>
        <DataTable
          columns={columns}
          rows={members}
          rowKey={(m) => m.id}
          loading={isLoading}
          empty={<EmptyState icon={<Users className="h-12 w-12" />} title="No members" description={debouncedQ ? 'No members matched your search.' : 'Add your first member.'} action={<Button className="gap-1.5" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Member</Button>} />}
        />
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <MemberFormDialog
        open={dialogOpen}
        orgSlug={orgSlug}
        initial={editing}
        saving={createMember.isPending || updateMember.isPending}
        onSubmit={handleSubmit}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
      />

      <PdfPreview {...previewProps} />

      <MembershipPaymentModal
        open={!!payIntent}
        orgSlug={orgSlug}
        intent={payIntent}
        onClose={() => setPayIntent(null)}
        onPaid={() => toast.success('Membership fee paid')}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this member?"
        description={`Permanently remove ${toDelete?.full_name ?? 'this patron'}. Blocked if they have active loans or unpaid fines.`}
        variant="danger"
        confirmLabel="Delete member"
        onConfirm={confirmDeleteMember}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
