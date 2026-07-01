'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Pencil, Plus, Scale, Trash2, X } from 'lucide-react';
import { useCirculationRules, useCreateCirculationRule, useUpdateCirculationRule, useDeleteCirculationRule } from '@/hooks/useCirculationRules';
import { useBranches } from '@/hooks/useBranches';
import { useMemberTiers } from '@/hooks/useMembers';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { type CirculationRule, type CirculationRuleInput, ITEM_FORMATS, DUE_DATE_MODES } from '@/lib/api/circulationRules';
import { apiErrorMessage } from '@/lib/api/error-message';

const inputCls = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

const EMPTY_FORM: CirculationRuleInput = {
  branch_id: null,
  tier_id: null,
  item_format: null,
  loan_period_days: 14,
  loan_period_hours: 0,
  is_hourly: false,
  max_renewals: 2,
  holdable: true,
  fine_per_day: '0',
  grace_days: 0,
  max_fine_cap: '0',
  cap_fine_at_replacement_price: false,
  rental_charge: '0',
  replacement_cost: '0',
  processing_fee: '0',
  due_date_mode: 'DAYS',
  label: '',
};

function labelForFormat(fmt: string | null) {
  return ITEM_FORMATS.find((f) => f.value === (fmt ?? ''))?.label ?? 'All formats';
}

function labelForDueDateMode(mode: string) {
  return DUE_DATE_MODES.find((m) => m.value === mode)?.label ?? mode;
}

export default function CirculationRulesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CirculationRule | undefined>();
  const [form, setForm] = useState<CirculationRuleInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<CirculationRule | undefined>();

  const { data: rulesPage, isLoading } = useCirculationRules(orgSlug, branchFilter);
  const { data: branchesPage } = useBranches(orgSlug);
  const { data: tiers = [] } = useMemberTiers(orgSlug);

  const createRule = useCreateCirculationRule(orgSlug);
  const updateRule = useUpdateCirculationRule(orgSlug);
  const deleteRule = useDeleteCirculationRule(orgSlug);

  const rules = rulesPage?.data ?? [];
  const branches = branchesPage?.data ?? [];

  function openNew() {
    setEditing(undefined);
    setForm({ ...EMPTY_FORM, branch_id: branchFilter ?? null });
    setOpen(true);
  }

  function openEdit(rule: CirculationRule) {
    setEditing(rule);
    setForm({
      branch_id: rule.branch_id,
      tier_id: rule.tier_id,
      item_format: rule.item_format,
      loan_period_days: rule.loan_period_days,
      loan_period_hours: rule.loan_period_hours,
      is_hourly: rule.is_hourly,
      max_renewals: rule.max_renewals,
      holdable: rule.holdable,
      fine_per_day: rule.fine_per_day ?? '0',
      grace_days: rule.grace_days,
      max_fine_cap: rule.max_fine_cap ?? '0',
      cap_fine_at_replacement_price: rule.cap_fine_at_replacement_price,
      rental_charge: rule.rental_charge ?? '0',
      replacement_cost: rule.replacement_cost ?? '0',
      processing_fee: rule.processing_fee ?? '0',
      due_date_mode: rule.due_date_mode,
      label: rule.label ?? '',
    });
    setOpen(true);
  }

  async function save() {
    if (form.loan_period_days <= 0 && !form.is_hourly) {
      toast.error('Loan period must be at least 1 day');
      return;
    }
    try {
      if (editing) {
        await updateRule.mutateAsync({ id: editing.id, data: form });
        toast.success('Rule updated');
      } else {
        await createRule.mutateAsync(form);
        toast.success('Rule created');
      }
      setOpen(false);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save rule'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRule.mutateAsync(deleteTarget.id);
      toast.success('Rule deleted');
      setDeleteTarget(undefined);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to delete rule'));
    }
  }

  function setField<K extends keyof CirculationRuleInput>(key: K, value: CirculationRuleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function branchName(id: string | null) {
    if (!id) return 'All branches';
    return branches.find((b) => b.id === id)?.name ?? id.slice(0, 8);
  }

  function tierName(id: string | null) {
    if (!id) return 'All tiers';
    return (tiers as { id: string; name: string }[]).find((t) => t.id === id)?.name ?? id.slice(0, 8);
  }

  const saving = createRule.isPending || updateRule.isPending;

  return (
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader
        title="Circulation Rules"
        subtitle="3D matrix: Branch × Patron Tier × Item Format — most specific rule wins"
        icon={<Scale className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Rule</Button>}
      />

      {/* Branch filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setBranchFilter(undefined)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${!branchFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          All branches
        </button>
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setBranchFilter(b.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${branchFilter === b.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Scale className="h-12 w-12" />}
            title="No circulation rules"
            description="Add a rule to override the 14-day / 2-renewal system default for specific branch, tier, or format combinations."
            action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Rule</Button>}
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Branch</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patron Tier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Format</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Loan days</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Renewals</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fine/day</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rental</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Label</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={rule.branch_id ? 'default' : 'outline'}>{branchName(rule.branch_id)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.tier_id ? 'default' : 'outline'}>{tierName(rule.tier_id)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.item_format ? 'default' : 'outline'}>{labelForFormat(rule.item_format)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {rule.is_hourly ? `${rule.loan_period_hours}h` : `${rule.loan_period_days}d`}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{rule.max_renewals}</td>
                  <td className="px-4 py-3 text-right font-mono">{rule.fine_per_day ?? '0'}</td>
                  <td className="px-4 py-3 text-right font-mono">{rule.rental_charge ?? '0'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{rule.label ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(rule)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Specificity legend */}
      <div className="mt-6 rounded-xl border p-4 bg-muted/30 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Rule resolution order (most specific wins)</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Branch + Patron Tier + Format</li>
          <li>Branch + Patron Tier + All formats</li>
          <li>Branch + All tiers + Format</li>
          <li>Branch + All tiers + All formats</li>
          <li>All branches + Patron Tier + Format</li>
          <li>All branches + Patron Tier + All formats</li>
          <li>All branches + All tiers + Format</li>
          <li>All branches + All tiers + All formats (global default)</li>
        </ol>
        <p className="mt-2">Rows with <Badge variant="outline" className="text-xs">All …</Badge> act as fallbacks; a <Badge variant="default" className="text-xs">specific</Badge> value narrows the scope.</p>
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Circulation Rule' : 'New Circulation Rule'}>
        <div className="space-y-4 p-1">
          {/* Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Branch (null = all)">
              <Select value={form.branch_id ?? ''} onChange={(e) => setField('branch_id', e.target.value || null)}>
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Patron Tier (null = all)">
              <Select value={form.tier_id ?? ''} onChange={(e) => setField('tier_id', e.target.value || null)}>
                <option value="">All tiers</option>
                {(tiers as { id: string; name: string }[]).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Item Format (null = all)">
              <Select value={form.item_format ?? ''} onChange={(e) => setField('item_format', e.target.value || null)}>
                {ITEM_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
            </Field>
          </div>

          {/* Loan parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Loan days">
              <input type="number" min={0} className={inputCls} value={form.loan_period_days} onChange={(e) => setField('loan_period_days', Number(e.target.value))} />
            </Field>
            <Field label="Loan hours (hourly)">
              <input type="number" min={0} className={inputCls} value={form.loan_period_hours} onChange={(e) => setField('loan_period_hours', Number(e.target.value))} />
            </Field>
            <Field label="Max renewals">
              <input type="number" min={0} className={inputCls} value={form.max_renewals} onChange={(e) => setField('max_renewals', Number(e.target.value))} />
            </Field>
            <Field label="Grace days">
              <input type="number" min={0} className={inputCls} value={form.grace_days ?? 0} onChange={(e) => setField('grace_days', Number(e.target.value))} />
            </Field>
          </div>

          {/* Boolean flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_hourly ?? false} onChange={(e) => setField('is_hourly', e.target.checked)} className="rounded" />
              Hourly loan
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.holdable ?? true} onChange={(e) => setField('holdable', e.target.checked)} className="rounded" />
              Holdable
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.cap_fine_at_replacement_price ?? false} onChange={(e) => setField('cap_fine_at_replacement_price', e.target.checked)} className="rounded" />
              Cap fine at replacement price
            </label>
          </div>

          {/* Financial parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Fine per day">
              <input className={inputCls} value={form.fine_per_day ?? '0'} onChange={(e) => setField('fine_per_day', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Max fine cap">
              <input className={inputCls} value={form.max_fine_cap ?? '0'} onChange={(e) => setField('max_fine_cap', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Rental charge">
              <input className={inputCls} value={form.rental_charge ?? '0'} onChange={(e) => setField('rental_charge', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Replacement cost">
              <input className={inputCls} value={form.replacement_cost ?? '0'} onChange={(e) => setField('replacement_cost', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Processing fee">
              <input className={inputCls} value={form.processing_fee ?? '0'} onChange={(e) => setField('processing_fee', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Due date mode">
              <Select value={form.due_date_mode ?? 'DAYS'} onChange={(e) => setField('due_date_mode', e.target.value)}>
                {DUE_DATE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Admin label (optional)">
            <input className={inputCls} value={form.label ?? ''} onChange={(e) => setField('label', e.target.value)} placeholder="e.g. Student physical books — main library" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={save} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Create rule'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Delete Rule">
        <div className="space-y-4 p-1">
          <p className="text-sm text-muted-foreground">
            Delete the rule for{' '}
            <strong>{branchName(deleteTarget?.branch_id ?? null)}</strong> /{' '}
            <strong>{tierName(deleteTarget?.tier_id ?? null)}</strong> /{' '}
            <strong>{labelForFormat(deleteTarget?.item_format ?? null)}</strong>?
            Loans will fall back to the next broader rule.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteRule.isPending} onClick={confirmDelete} className="gap-1.5">
              {deleteRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
