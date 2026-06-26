'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ListChecks, Loader2, Pencil, Plus } from 'lucide-react';
import { useMemberTiers, useCreateTier, useUpdateTier } from '@/hooks/useMembers';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type MemberTier, type MemberTierInput } from '@/lib/api/members';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatMoney } from '@/lib/format';

const EMPTY: MemberTierInput = { name: '', max_loans: 5, loan_period_days: 14, max_renewals: 2, max_holds: 3, daily_fine_rate: 10, membership_fee: 0 };

export default function MemberTiersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: tiers = [], isLoading } = useMemberTiers(orgSlug);
  const createTier = useCreateTier(orgSlug);
  const updateTier = useUpdateTier(orgSlug);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberTier | undefined>();
  const [form, setForm] = useState<MemberTierInput>(EMPTY);

  function openNew() { setEditing(undefined); setForm(EMPTY); setOpen(true); }
  function openEdit(t: MemberTier) {
    setEditing(t);
    setForm({ name: t.name, max_loans: t.max_loans, loan_period_days: t.loan_period_days, max_renewals: t.max_renewals, max_holds: t.max_holds, daily_fine_rate: t.daily_fine_rate, membership_fee: t.membership_fee, description: t.description });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Tier name is required'); return; }
    try {
      if (editing) { await updateTier.mutateAsync({ id: editing.id, data: form }); toast.success('Tier updated'); }
      else { await createTier.mutateAsync(form); toast.success('Tier created'); }
      setOpen(false);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to save tier')); }
  }

  function numField(label: string, key: keyof MemberTierInput, step = '1') {
    return (
      <Field label={label}>
        <input type="number" step={step} value={(form[key] as number) ?? 0} onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
      </Field>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/${orgSlug}/members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>
      <PageHeader title="Member Tiers" subtitle="Borrowing entitlements per membership tier" icon={<ListChecks className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Tier</Button>} />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : tiers.length === 0 ? (
          <EmptyState icon={<ListChecks className="h-12 w-12" />} title="No tiers" description="Create a tier to define loan limits and fine rates." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Tier</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Tier</th>
                  <th className="px-5 py-3 font-semibold">Max loans</th>
                  <th className="px-5 py-3 font-semibold">Loan period</th>
                  <th className="px-5 py-3 font-semibold">Renewals</th>
                  <th className="px-5 py-3 font-semibold">Holds</th>
                  <th className="px-5 py-3 font-semibold">Daily fine</th>
                  <th className="px-5 py-3 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tiers.map((t) => (
                  <tr key={t.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3 font-medium">{t.name}</td>
                    <td className="px-5 py-3">{t.max_loans}</td>
                    <td className="px-5 py-3">{t.loan_period_days} days</td>
                    <td className="px-5 py-3">{t.max_renewals}</td>
                    <td className="px-5 py-3">{t.max_holds}</td>
                    <td className="px-5 py-3">{formatMoney(t.daily_fine_rate)}</td>
                    <td className="px-5 py-3">{formatMoney(t.membership_fee)}</td>
                    <td className="px-5 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit tier' : 'New tier'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={createTier.isPending || updateTier.isPending} className="gap-1.5">{(createTier.isPending || updateTier.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tier name" required className="col-span-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          {numField('Max loans', 'max_loans')}
          {numField('Loan period (days)', 'loan_period_days')}
          {numField('Max renewals', 'max_renewals')}
          {numField('Max holds', 'max_holds')}
          {numField('Daily fine rate', 'daily_fine_rate', '0.01')}
          {numField('Membership fee', 'membership_fee', '0.01')}
        </div>
      </Dialog>
    </div>
  );
}
