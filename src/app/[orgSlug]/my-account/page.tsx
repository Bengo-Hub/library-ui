'use client';

import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { User, BookOpen, BookMarked, CircleDollarSign, RefreshCw } from 'lucide-react';
import { useMyLoans, useMyHolds, useMyFines, useMyRenewLoan, useMyPayFine } from '@/hooks/useMyAccount';
import { PageHeader, StatCard } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { useState } from 'react';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const TABS = [
  { value: 'loans', label: 'My Loans' },
  { value: 'holds', label: 'My Holds' },
  { value: 'fines', label: 'My Fines' },
];

type Loan = {
  id: string;
  status: string;
  due_at: string;
  checkout_at: string;
  renewals_count: number;
  copy_id: string;
};

type Hold = {
  id: string;
  status: string;
  placed_at: string;
  queue_position: number;
  bib_record_id: string;
  expires_at?: string;
};

type Fine = {
  id: string;
  status: string;
  reason: string;
  amount: string;
  amount_paid: string;
  assessed_at?: string;
};

const LOAN_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  ACTIVE: 'success', OVERDUE: 'error', RETURNED: 'outline', LOST: 'warning',
};

const HOLD_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  WAITING: 'outline', READY: 'success', EXPIRED: 'error', CANCELLED: 'warning',
};

const FINE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  UNPAID: 'error', PARTIAL: 'warning', PAID: 'success', WAIVED: 'outline',
};

export default function MyAccountPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [tab, setTab] = useState('loans');

  const { data: loansData, isLoading: loansLoading } = useMyLoans(orgSlug);
  const { data: holdsData, isLoading: holdsLoading } = useMyHolds(orgSlug);
  const { data: finesData, isLoading: finesLoading } = useMyFines(orgSlug);
  const renewLoan = useMyRenewLoan(orgSlug);
  const payFine = useMyPayFine(orgSlug);

  const loans = (loansData?.data ?? []) as Loan[];
  const holds = (holdsData?.data ?? []) as Hold[];
  const fines = (finesData?.data ?? []) as Fine[];

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  const pendingFines = fines.filter((f) => f.status === 'UNPAID' || f.status === 'PARTIAL');
  const totalOwed = pendingFines.reduce((sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.amount_paid)), 0);

  async function handleRenew(loanId: string) {
    try {
      await renewLoan.mutateAsync(loanId);
      toast.success('Loan renewed successfully');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Could not renew')); }
  }

  async function handlePay(fineId: string) {
    try {
      const intent = await payFine.mutateAsync(fineId);
      const typed = intent as { initiate_url?: string };
      if (typed?.initiate_url) {
        window.open(typed.initiate_url, '_blank');
      } else {
        toast.success('Payment initiated');
      }
    } catch (e) { toast.error(await apiErrorMessage(e, 'Payment failed')); }
  }

  const now = new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader
        title="My Library Account"
        subtitle="Manage your loans, holds and fines"
        icon={<User className="h-5 w-5" />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Active Loans"
          value={activeLoans.length.toString()}
          icon={<BookOpen className="h-5 w-5" />}
          accent="bg-blue-500/15 text-blue-500"
        />
        <StatCard
          label="Holds"
          value={holds.length.toString()}
          icon={<BookMarked className="h-5 w-5" />}
          accent="bg-amber-500/15 text-amber-500"
        />
        <StatCard
          label="Fines Owed"
          value={formatMoney(totalOwed)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          accent={totalOwed > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-muted text-muted-foreground'}
        />
      </div>

      <CapsuleTabs options={TABS} value={tab} onChange={setTab} />

      {/* ── LOANS ───────────────────────────────────────────────────── */}
      {tab === 'loans' && (
        <>
          {loansLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />)}</div>}
          {!loansLoading && loans.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">You have no loans on record.</Card>
          )}
          {loans.map((loan) => {
            const due = new Date(loan.due_at);
            const isOverdue = loan.status === 'ACTIVE' && due < now;
            return (
              <Card key={loan.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isOverdue ? 'error' : LOAN_VARIANT[loan.status] ?? 'outline'}>
                        {isOverdue ? 'OVERDUE' : loan.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{loan.copy_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>Checked out {formatDate(loan.checkout_at)}</span>
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>Due {formatDate(loan.due_at)}</span>
                      {loan.renewals_count > 0 && <span>{loan.renewals_count} renewal{loan.renewals_count > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && (
                    <Button
                      size="sm" variant="outline"
                      className="gap-1 shrink-0"
                      onClick={() => handleRenew(loan.id)}
                      disabled={renewLoan.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </>
      )}

      {/* ── HOLDS ───────────────────────────────────────────────────── */}
      {tab === 'holds' && (
        <>
          {holdsLoading && <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />)}</div>}
          {!holdsLoading && holds.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">You have no active holds.</Card>
          )}
          {holds.map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={HOLD_VARIANT[h.status] ?? 'outline'}>{h.status}</Badge>
                    {h.status === 'WAITING' && (
                      <span className="text-xs text-muted-foreground">Position #{h.queue_position} in queue</span>
                    )}
                    {h.status === 'READY' && (
                      <span className="text-xs text-green-600 font-medium">Ready for pickup!</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>Placed {formatDate(h.placed_at)}</span>
                    {h.expires_at && <span>Expires {formatDate(h.expires_at)}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* ── FINES ───────────────────────────────────────────────────── */}
      {tab === 'fines' && (
        <>
          {finesLoading && <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />)}</div>}
          {!finesLoading && fines.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">You have no outstanding fines.</Card>
          )}
          {fines.map((f) => {
            const owed = parseFloat(f.amount) - parseFloat(f.amount_paid);
            return (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={FINE_VARIANT[f.status] ?? 'outline'}>{f.status}</Badge>
                      <span className="text-sm font-medium">{f.reason}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      {f.assessed_at && <span>Assessed {formatDate(f.assessed_at)}</span>}
                      <span>{formatMoney(parseFloat(f.amount))} total</span>
                      {parseFloat(f.amount_paid) > 0 && <span>{formatMoney(parseFloat(f.amount_paid))} paid</span>}
                    </div>
                  </div>
                  {(f.status === 'UNPAID' || f.status === 'PARTIAL') && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-bold text-red-600">{formatMoney(owed)}</span>
                      <Button
                        size="sm"
                        onClick={() => handlePay(f.id)}
                        disabled={payFine.isPending}
                      >
                        Pay Now
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
