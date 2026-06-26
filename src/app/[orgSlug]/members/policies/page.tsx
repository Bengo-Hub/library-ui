'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ListChecks, Loader2, Pencil, Plus } from 'lucide-react';
import { useLoanPolicies, useCreatePolicy, useUpdatePolicy, useMemberTiers } from '@/hooks/useMembers';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { BIB_FORMATS } from '@/lib/api/catalog';
import { type LoanPolicy, type LoanPolicyInput } from '@/lib/api/members';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatMoney } from '@/lib/format';

const EMPTY: LoanPolicyInput = { name: '', loan_period_days: 14, max_renewals: 2, daily_fine_rate: 10, grace_period_days: 0, max_fine_cap: 0 };

export default function LoanPoliciesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: policies = [], isLoading } = useLoanPolicies(orgSlug);
  const { data: tiers = [] } = useMemberTiers(orgSlug);
  const createPolicy = useCreatePolicy(orgSlug);
  const updatePolicy = useUpdatePolicy(orgSlug);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoanPolicy | undefined>();
  const [form, setForm] = useState<LoanPolicyInput>(EMPTY);

  function openNew() { setEditing(undefined); setForm(EMPTY); setOpen(true); }
  function openEdit(p: LoanPolicy) {
    setEditing(p);
    setForm({ name: p.name, format: p.format, tier_id: p.tier_id, loan_period_days: p.loan_period_days, max_renewals: p.max_renewals, daily_fine_rate: p.daily_fine_rate, grace_period_days: p.grace_period_days, max_fine_cap: p.max_fine_cap });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Policy name is required'); return; }
    try {
      if (editing) { await updatePolicy.mutateAsync({ id: editing.id, data: form }); toast.success('Policy updated'); }
      else { await createPolicy.mutateAsync(form); toast.success('Policy created'); }
      setOpen(false);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to save policy')); }
  }

  function numField(label: string, key: keyof LoanPolicyInput, step = '1') {
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
      <PageHeader title="Loan Policies" subtitle="Loan periods and fine rules by format and tier" icon={<ListChecks className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Policy</Button>} />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : policies.length === 0 ? (
          <EmptyState icon={<ListChecks className="h-12 w-12" />} title="No policies" description="Define how long items can be borrowed and the fine rules." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Policy</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Policy</th>
                  <th className="px-5 py-3 font-semibold">Format</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Renewals</th>
                  <th className="px-5 py-3 font-semibold">Daily fine</th>
                  <th className="px-5 py-3 font-semibold">Grace</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-5 py-3">{p.format ?? 'Any'}</td>
                    <td className="px-5 py-3">{p.loan_period_days} days</td>
                    <td className="px-5 py-3">{p.max_renewals}</td>
                    <td className="px-5 py-3">{formatMoney(p.daily_fine_rate)}</td>
                    <td className="px-5 py-3">{p.grace_period_days ?? 0} days</td>
                    <td className="px-5 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit policy' : 'New policy'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={createPolicy.isPending || updatePolicy.isPending} className="gap-1.5">{(createPolicy.isPending || updatePolicy.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Policy name" required className="col-span-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Format">
            <Select value={form.format ?? ''} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value || undefined }))}>
              <option value="">Any format</option>
              {BIB_FORMATS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Tier">
            <Select value={form.tier_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, tier_id: e.target.value || undefined }))}>
              <option value="">Any tier</option>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          {numField('Loan period (days)', 'loan_period_days')}
          {numField('Max renewals', 'max_renewals')}
          {numField('Daily fine rate', 'daily_fine_rate', '0.01')}
          {numField('Grace period (days)', 'grace_period_days')}
          {numField('Max fine cap', 'max_fine_cap', '0.01')}
        </div>
      </Dialog>
    </div>
  );
}
