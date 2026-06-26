'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Plus, Search, Pencil } from 'lucide-react';
import { useMembers, useCreateMember, useUpdateMember } from '@/hooks/useMembers';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { MemberFormDialog } from '@/components/library/MemberFormDialog';
import { type Member, type MemberInput, type MemberStatus } from '@/lib/api/members';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatMoney } from '@/lib/format';

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | undefined>();

  const members = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

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
            <Button className="gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4" /> New Member</Button>
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
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : members.length === 0 ? (
          <EmptyState icon={<Users className="h-12 w-12" />} title="No members" description={debouncedQ ? 'No members matched your search.' : 'Add your first member.'} action={<Button className="gap-1.5" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New Member</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">No.</th>
                  <th className="px-5 py-3 font-semibold">Tier</th>
                  <th className="px-5 py-3 font-semibold">Loans</th>
                  <th className="px-5 py-3 font-semibold">Fines</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3">
                      <Link href={`/${orgSlug}/members/${m.id}`} className="font-medium hover:text-primary">{m.full_name ?? `${m.first_name} ${m.last_name}`}</Link>
                      {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{m.membership_no}</td>
                    <td className="px-5 py-3">{m.tier_name ?? '—'}</td>
                    <td className="px-5 py-3">{m.active_loans ?? 0}</td>
                    <td className="px-5 py-3">{(m.outstanding_fines ?? 0) > 0 ? <span className="text-destructive font-medium">{formatMoney(m.outstanding_fines)}</span> : '—'}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(m); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
}
