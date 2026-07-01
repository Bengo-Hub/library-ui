'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Rss, Send, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import {
  useSubscription,
  useIssues,
  useRoutingList,
  useReceiveIssue,
  useClaimIssue,
  useCreateIssue,
  useAddRouting,
  usePredictIssues,
} from '@/hooks/useSerials';
import { PageHeader } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import {
  type SerialIssue,
  type IssueStatus,
  type IssueInput,
  type SerialRoutingEntry,
} from '@/lib/api/serials';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const ISSUE_STATUS_TABS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'EXPECTED', label: 'Expected' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'LATE', label: 'Late' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'CLAIMED', label: 'Claimed' },
];

const ISSUE_VARIANT: Record<IssueStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  EXPECTED: 'outline', RECEIVED: 'success', LATE: 'error', MISSING: 'warning', CLAIMED: 'default',
};

const SUB_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  ACTIVE: 'success', EXPIRED: 'warning', CANCELLED: 'error',
};

const EMPTY_ISSUE: IssueInput = { subscription_id: '' };

export default function SubscriptionDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const subId = params?.id as string;

  const { data: sub, isLoading: subLoading } = useSubscription(orgSlug, subId);
  const { data: issueData, isLoading: issuesLoading } = useIssues(orgSlug, { subscription_id: subId });
  const { data: routingData } = useRoutingList(orgSlug, subId);
  const { data: predicted } = usePredictIssues(orgSlug, subId);

  const receiveIssue = useReceiveIssue(orgSlug);
  const claimIssue = useClaimIssue(orgSlug);
  const createIssue = useCreateIssue(orgSlug);
  const addRouting = useAddRouting(orgSlug, subId);

  const [issueStatusFilter, setIssueStatusFilter] = useState<IssueStatus | ''>('');
  const [addIssueOpen, setAddIssueOpen] = useState(false);
  const [addRoutingOpen, setAddRoutingOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueInput>({ ...EMPTY_ISSUE, subscription_id: subId });
  const [routingForm, setRoutingForm] = useState({ member_id: '', position: 1 });
  const [showPredict, setShowPredict] = useState(false);

  const issues = issueData?.data ?? [];
  const routing = routingData?.data ?? [];
  const filteredIssues = issueStatusFilter
    ? issues.filter((i) => i.status === issueStatusFilter)
    : issues;

  function setIssueField(key: keyof IssueInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setIssueForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function saveIssue() {
    try {
      await createIssue.mutateAsync({ ...issueForm, subscription_id: subId });
      toast.success('Issue created');
      setAddIssueOpen(false);
      setIssueForm({ ...EMPTY_ISSUE, subscription_id: subId });
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create issue')); }
  }

  async function handleReceive(issueId: string) {
    try {
      await receiveIssue.mutateAsync(issueId);
      toast.success('Issue received — copy created');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to receive issue')); }
  }

  async function handleClaim(issueId: string) {
    try {
      await claimIssue.mutateAsync(issueId);
      toast.success('Issue claimed as missing');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to claim issue')); }
  }

  async function saveRouting() {
    if (!routingForm.member_id.trim()) { toast.error('Member ID is required'); return; }
    try {
      await addRouting.mutateAsync(routingForm);
      toast.success('Routing entry added');
      setAddRoutingOpen(false);
      setRoutingForm({ member_id: '', position: routing.length + 1 });
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to add routing entry')); }
  }

  const issueColumns: Column<SerialIssue>[] = [
    {
      key: 'volume', header: 'Vol/No',
      cell: (i) => <span className="font-mono text-sm">{[i.volume, i.issue_no].filter(Boolean).join('/') || '—'}</span>,
    },
    { key: 'expected_date', header: 'Expected', cell: (i) => <span className="text-muted-foreground">{formatDate(i.expected_date)}</span> },
    {
      key: 'received_date', header: 'Received',
      cell: (i) => i.received_date
        ? <span className="text-green-600">{formatDate(i.received_date)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    { key: 'status', header: 'Status', cell: (i) => <Badge variant={ISSUE_VARIANT[i.status]}>{i.status}</Badge> },
    {
      key: 'actions', header: '', actions: true, align: 'right',
      cell: (i) => (
        <div className="flex gap-1.5 justify-end">
          {(i.status === 'EXPECTED' || i.status === 'LATE') && (
            <Button
              size="sm" variant="outline"
              className="gap-1"
              onClick={() => handleReceive(i.id)}
              disabled={receiveIssue.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Receive
            </Button>
          )}
          {(i.status === 'LATE' || i.status === 'MISSING') && (
            <Button
              size="sm" variant="outline"
              className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={() => handleClaim(i.id)}
              disabled={claimIssue.isPending}
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Claim
            </Button>
          )}
        </div>
      ),
    },
  ];

  const routingColumns: Column<SerialRoutingEntry>[] = [
    { key: 'position', header: '#', cell: (r) => <span className="font-medium">{r.position}</span> },
    { key: 'member_id', header: 'Member', cell: (r) => <span className="font-mono text-xs">{r.member_id}</span> },
  ];

  if (subLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-8 w-64 rounded bg-muted animate-pulse mb-6" />
        <div className="h-40 rounded-xl border border-border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16 text-muted-foreground">
        Subscription not found.{' '}
        <Link href={`/${orgSlug}/serials`} className="text-primary underline">Back to Serials</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/${orgSlug}/serials`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="h-4 w-4" /> Serials
      </Link>
      <PageHeader
        title={sub.bib_record_id}
        subtitle={`${sub.frequency} subscription · ${formatMoney(parseFloat(sub.price))} ${sub.currency_code}`}
        icon={<Rss className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Badge variant={SUB_STATUS_VARIANT[sub.status]}>{sub.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => setShowPredict(!showPredict)}>
              {showPredict ? 'Hide Forecast' : 'Forecast Issues'}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddIssueOpen(true)}>
              <Send className="h-4 w-4" /> Add Issue
            </Button>
          </div>
        }
      />

      {/* Subscription Details */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Start Date</div>
            <div className="font-medium">{formatDate(sub.start_date)}</div>
          </div>
          {sub.end_date && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">End Date</div>
              <div className="font-medium">{formatDate(sub.end_date)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Issues Received</div>
            <div className="font-medium">{issues.filter((i) => i.status === 'RECEIVED').length} / {issues.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Late / Missing</div>
            <div className="font-medium text-red-600">
              {issues.filter((i) => i.status === 'LATE' || i.status === 'MISSING').length}
            </div>
          </div>
        </div>
        {sub.notes && (
          <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">{sub.notes}</p>
        )}
      </Card>

      {/* Predicted Issues Forecast */}
      {showPredict && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Next 12 Expected Issues</h3>
          {!predicted || predicted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No predictions available yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {predicted.map((p, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                  <div className="text-xs text-muted-foreground">{formatDate(p.expected_date)}</div>
                  {(p.volume || p.issue_no) && (
                    <div className="text-xs font-mono mt-0.5">{[p.volume, p.issue_no].filter(Boolean).join('/')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Issue History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Issue History</h2>
        </div>
        <CapsuleTabs
          options={ISSUE_STATUS_TABS}
          value={issueStatusFilter}
          onChange={(v) => setIssueStatusFilter(v as IssueStatus | '')}
          className="mb-3"
        />
        <DataTable
          columns={issueColumns}
          rows={filteredIssues}
          rowKey={(i) => i.id}
          loading={issuesLoading}
        />
      </div>

      {/* Routing List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Routing List
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddRoutingOpen(true)}>
            <Users className="h-4 w-4" /> Add Member
          </Button>
        </div>
        {routing.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No routing list configured. Add members to route issues in order.
          </Card>
        ) : (
          <DataTable
            columns={routingColumns}
            rows={routing}
            rowKey={(r) => r.id}
          />
        )}
      </div>

      {/* Add Issue Dialog */}
      <Dialog open={addIssueOpen} onClose={() => setAddIssueOpen(false)} title="Add Issue">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Volume">
              <input value={issueForm.volume ?? ''} onChange={setIssueField('volume')} placeholder="e.g. 12" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Issue No">
              <input value={issueForm.issue_no ?? ''} onChange={setIssueField('issue_no')} placeholder="e.g. 3" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
          <Field label="Expected Date">
            <input type="date" value={issueForm.expected_date ?? ''} onChange={setIssueField('expected_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Notes">
            <textarea value={issueForm.notes ?? ''} onChange={setIssueField('notes')} rows={2} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddIssueOpen(false)}>Cancel</Button>
            <Button onClick={saveIssue} disabled={createIssue.isPending}>{createIssue.isPending ? 'Adding…' : 'Add Issue'}</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Routing Dialog */}
      <Dialog open={addRoutingOpen} onClose={() => setAddRoutingOpen(false)} title="Add to Routing List">
        <div className="space-y-4">
          <Field label="Member ID *">
            <input
              value={routingForm.member_id}
              onChange={(e) => setRoutingForm((f) => ({ ...f, member_id: e.target.value }))}
              placeholder="Member UUID"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>
          <Field label="Position">
            <input
              type="number" min="1"
              value={routingForm.position}
              onChange={(e) => setRoutingForm((f) => ({ ...f, position: Number(e.target.value) }))}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddRoutingOpen(false)}>Cancel</Button>
            <Button onClick={saveRouting} disabled={addRouting.isPending}>{addRouting.isPending ? 'Adding…' : 'Add to List'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
