'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Rss } from 'lucide-react';
import {
  useSubscriptions,
  useCreateSubscription,
  useIssues,
} from '@/hooks/useSerials';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import {
  type SubscriptionStatus,
  type SerialFrequency,
  type IssueStatus,
  type SubscriptionInput,
} from '@/lib/api/serials';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const STATUS_TABS: { value: SubscriptionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_VARIANT: Record<SubscriptionStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  ACTIVE: 'success', EXPIRED: 'warning', CANCELLED: 'error',
};

const ISSUE_STATUS_VARIANT: Record<IssueStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  EXPECTED: 'outline', RECEIVED: 'success', LATE: 'error', MISSING: 'warning', CLAIMED: 'default',
};

const FREQUENCIES: SerialFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'];

const EMPTY_FORM: SubscriptionInput = {
  bib_record_id: '',
  frequency: 'MONTHLY',
  price: 0,
  currency_code: 'KES',
};

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge variant={ISSUE_STATUS_VARIANT[status]}>{status}</Badge>;
}

export default function SerialsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const { data, isLoading } = useSubscriptions(orgSlug, statusFilter || undefined);
  const { data: issuesData } = useIssues(orgSlug);
  const createSub = useCreateSubscription(orgSlug);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SubscriptionInput>(EMPTY_FORM);

  const subscriptions = data?.data ?? [];
  const issues = issuesData?.data ?? [];

  function setField(key: keyof SubscriptionInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.bib_record_id.trim()) { toast.error('Bibliographic record ID is required'); return; }
    if (!form.price || form.price <= 0) { toast.error('Price must be greater than 0'); return; }
    try {
      await createSub.mutateAsync({ ...form, price: Number(form.price) });
      toast.success('Subscription created');
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create subscription')); }
  }

  // Build a quick calendar grid: next 12 months, showing expected/received counts
  const today = new Date();
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    };
  });

  const issuesByMonth: Record<string, { expected: number; received: number; late: number }> = {};
  for (const issue of issues) {
    const d = new Date(issue.expected_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!issuesByMonth[key]) issuesByMonth[key] = { expected: 0, received: 0, late: 0 };
    if (issue.status === 'RECEIVED') issuesByMonth[key].received++;
    else if (issue.status === 'LATE' || issue.status === 'MISSING' || issue.status === 'CLAIMED') issuesByMonth[key].late++;
    else issuesByMonth[key].expected++;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Serials"
        subtitle="Manage periodical subscriptions and issue tracking"
        icon={<Rss className="h-5 w-5" />}
        actions={
          <Button className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Subscription
          </Button>
        }
      />

      {/* Issue Calendar Overview */}
      {issues.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Issue Calendar</h3>
          <div className="grid grid-cols-6 gap-2">
            {monthLabels.map((m) => {
              const counts = issuesByMonth[m.key] ?? { expected: 0, received: 0, late: 0 };
              const total = counts.expected + counts.received + counts.late;
              return (
                <div key={m.key} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{m.label}</div>
                  {total === 0 ? (
                    <div className="text-xs text-muted-foreground">—</div>
                  ) : (
                    <div className="space-y-0.5">
                      {counts.received > 0 && <div className="text-xs text-green-600 font-medium">{counts.received} rcvd</div>}
                      {counts.expected > 0 && <div className="text-xs text-muted-foreground">{counts.expected} exp</div>}
                      {counts.late > 0 && <div className="text-xs text-red-600 font-medium">{counts.late} late</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Subscription List */}
      <div>
        <CapsuleTabs
          options={STATUS_TABS}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as SubscriptionStatus | '')}
          className="mb-4"
        />

        {subscriptions.length === 0 && !isLoading ? (
          <Card>
            <EmptyState
              icon={<Rss className="h-12 w-12" />}
              title="No subscriptions"
              description="Add a periodical subscription to track expected and received issues."
              action={
                <Button onClick={() => setOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Subscription
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
                ))}
              </div>
            )}
            {subscriptions.map((sub) => {
              const subIssues = issues.filter((iss) => iss.subscription_id === sub.id);
              const received = subIssues.filter((i) => i.status === 'RECEIVED').length;
              const late = subIssues.filter((i) => i.status === 'LATE' || i.status === 'MISSING').length;
              const expected = subIssues.filter((i) => i.status === 'EXPECTED').length;
              const lastReceived = subIssues
                .filter((i) => i.status === 'RECEIVED' && i.received_date)
                .sort((a, b) => new Date(b.received_date!).getTime() - new Date(a.received_date!).getTime())[0];

              return (
                <Link key={sub.id} href={`/${orgSlug}/serials/${sub.id}`}>
                  <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{sub.bib_record_id}</span>
                          <Badge variant={STATUS_VARIANT[sub.status]}>{sub.status}</Badge>
                          <Badge variant="outline" className="text-xs">{sub.frequency}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span>Started {formatDate(sub.start_date)}</span>
                          {sub.end_date && <span>Ends {formatDate(sub.end_date)}</span>}
                          <span>{formatMoney(parseFloat(sub.price))} {sub.currency_code}/yr</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        {received > 0 && <span className="text-green-600 font-medium">{received} received</span>}
                        {expected > 0 && <span className="text-muted-foreground">{expected} expected</span>}
                        {late > 0 && <span className="text-red-600 font-medium">{late} late</span>}
                        {lastReceived && (
                          <span className="text-muted-foreground hidden sm:block">
                            Last: {formatDate(lastReceived.received_date!)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Subscription Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title="New Subscription">
        <div className="space-y-4">
          <Field label="Bibliographic Record ID *">
            <input
              value={form.bib_record_id}
              onChange={setField('bib_record_id')}
              placeholder="UUID of the bib record (periodical)"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Frequency *">
              <select value={form.frequency} onChange={setField('frequency')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <input value={form.currency_code ?? 'KES'} onChange={setField('currency_code')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Annual Price *">
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date ?? ''} onChange={setField('start_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date ?? ''} onChange={setField('end_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
          <Field label="Vendor ID">
            <input value={form.vendor_id ?? ''} onChange={setField('vendor_id')} placeholder="Optional vendor UUID" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes ?? ''} onChange={setField('notes')} rows={2} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createSub.isPending}>{createSub.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
