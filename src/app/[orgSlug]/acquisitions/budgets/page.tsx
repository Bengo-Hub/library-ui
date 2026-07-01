'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown, ChevronRight, Landmark, Plus } from 'lucide-react';
import {
  useBudgets, useCreateBudget, useUpdateBudget,
  useFunds, useCreateFund,
} from '@/hooks/useAcquisitions';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type AcquisitionBudget, type BudgetInput, type FundInput } from '@/lib/api/acquisitions';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatMoney } from '@/lib/format';

const EMPTY_BUDGET: BudgetInput = { name: '', fiscal_year: new Date().getFullYear(), total_amount: 0 };
const EMPTY_FUND: FundInput = { name: '', allocated_amount: 0 };

function FundRow({ orgSlug, budgetId }: { orgSlug: string; budgetId: string }) {
  const { data, isLoading } = useFunds(orgSlug, budgetId);
  const createFund = useCreateFund(orgSlug, budgetId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FundInput>(EMPTY_FUND);

  const funds = data?.data ?? [];

  async function save() {
    if (!form.name.trim()) { toast.error('Fund name is required'); return; }
    try {
      await createFund.mutateAsync(form);
      toast.success('Fund created');
      setOpen(false);
      setForm(EMPTY_FUND);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create fund')); }
  }

  if (isLoading) return <p className="text-xs text-muted-foreground px-4 pb-2">Loading funds…</p>;

  return (
    <div className="px-4 pb-3 space-y-1">
      {funds.map((f) => (
        <div key={f.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
          <span>{f.name}{f.code ? <span className="ml-1 text-xs text-muted-foreground">({f.code})</span> : null}</span>
          <span className="text-muted-foreground">{formatMoney(parseFloat(f.allocated_amount))} allocated · {formatMoney(parseFloat(f.spent))} spent</span>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 mt-1" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> Add Fund
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="New Fund">
        <div className="space-y-4">
          <Field label="Name *">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Code">
            <input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. GEN-2026" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Allocated Amount">
            <input type="number" min="0" step="0.01" value={form.allocated_amount} onChange={(e) => setForm((f) => ({ ...f, allocated_amount: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Description">
            <input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createFund.isPending}>{createFund.isPending ? 'Saving…' : 'Create Fund'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function BudgetCard({ budget, orgSlug }: { budget: AcquisitionBudget; orgSlug: string }) {
  const [expanded, setExpanded] = useState(false);
  const updateBudget = useUpdateBudget(orgSlug);

  const total = parseFloat(budget.total_amount) || 0;
  const spent = parseFloat(budget.spent) || 0;
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  async function toggleStatus() {
    const next = budget.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await updateBudget.mutateAsync({ id: budget.id, data: { name: budget.name } });
      toast.success(`Budget ${next === 'OPEN' ? 'reopened' : 'closed'}`);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to update budget')); }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{budget.name}</p>
            <Badge variant={budget.status === 'OPEN' ? 'success' : 'outline'} className="text-xs shrink-0">{budget.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">FY {budget.fiscal_year}</p>
        </div>
        <button onClick={() => setExpanded((x) => !x)} className="text-muted-foreground hover:text-foreground shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-4 pb-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatMoney(parseFloat(budget.spent))} spent</span>
          <span>{formatMoney(parseFloat(budget.total_amount))} total</span>
        </div>
      </div>

      {expanded && <div className="mt-2 border-t border-border/50"><FundRow orgSlug={orgSlug} budgetId={budget.id} /></div>}
    </Card>
  );
}

export default function BudgetsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const { data, isLoading } = useBudgets(orgSlug);
  const createBudget = useCreateBudget(orgSlug);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BudgetInput>(EMPTY_BUDGET);

  const budgets = data?.data ?? [];

  async function save() {
    if (!form.name.trim()) { toast.error('Budget name is required'); return; }
    try {
      await createBudget.mutateAsync(form);
      toast.success('Budget created');
      setOpen(false);
      setForm(EMPTY_BUDGET);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create budget')); }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/acquisitions/orders`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Acquisitions
      </Link>
      <PageHeader
        title="Budgets & Funds"
        subtitle="Track acquisition spending by budget and fund"
        icon={<Landmark className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={() => { setForm(EMPTY_BUDGET); setOpen(true); }}><Plus className="h-4 w-4" /> New Budget</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState icon={<Landmark className="h-12 w-12" />} title="No budgets" description="Create a budget to track acquisition spending." action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Budget</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => <BudgetCard key={b.id} budget={b} orgSlug={orgSlug} />)}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="New Budget">
        <div className="space-y-4">
          <Field label="Name *">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Acquisitions 2026" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Fiscal Year">
            <input type="number" value={form.fiscal_year} onChange={(e) => setForm((f) => ({ ...f, fiscal_year: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Total Amount">
            <input type="number" min="0" step="0.01" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Notes">
            <input value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createBudget.isPending}>{createBudget.isPending ? 'Saving…' : 'Create Budget'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
