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
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>
      <PageHeader title="Member Tiers" subtitle="Borrowing entitlements per membership tier" icon={<ListChecks className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Tier</Button>} />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : tiers.length === 0 ? (
        <Card><EmptyState icon={<ListChecks className="h-12 w-12" />} title="No tiers" description="Create a tier to define loan limits and fine rates." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Tier</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((t) => {
            const tier = t as MemberTier & { is_default?: boolean; is_global?: boolean };
            return (
              <Card key={t.id} className="p-5 hover:border-primary/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base truncate">{t.name}</h3>
                      {tier.is_default && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase">Default</span>}
                      {tier.is_global && <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase">Shared</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatMoney(t.membership_fee)} / year</p>
                  </div>
                  <Button variant="ghost" size="icon" title="Edit tier" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Max loans</dt><dd className="font-semibold">{t.max_loans}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Loan period</dt><dd className="font-semibold">{t.loan_period_days} days</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Renewals</dt><dd className="font-semibold">{t.max_renewals}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Holds</dt><dd className="font-semibold">{t.max_holds}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Daily fine</dt><dd className="font-semibold">{formatMoney(t.daily_fine_rate)}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Annual fee</dt><dd className="font-semibold">{formatMoney(t.membership_fee)}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}

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
