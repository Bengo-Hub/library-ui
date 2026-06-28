'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookOpen, ScanLine, User, RotateCcw, Undo2, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';
import { enqueue, startOfflineSync, uid, queueSize } from '@/lib/offline-queue';
import { useCheckout, useReturn, useRenew, useLoans } from '@/hooks/useCirculation';
import { useMembers } from '@/hooks/useMembers';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import type { Member } from '@/lib/api/members';
import type { Loan } from '@/lib/api/circulation';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';

type Mode = 'checkout' | 'return';

export default function CirculationPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [mode, setMode] = useState<Mode>('checkout');
  const [member, setMember] = useState<Member | null>(null);
  const [copyBarcode, setCopyBarcode] = useState('');
  const [inHouse, setInHouse] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [scanTarget, setScanTarget] = useState<null | 'member' | 'copy'>(null);
  const [queued, setQueued] = useState(0);

  // Offline circulation: drain the queue when back online + track its size for the badge.
  useEffect(() => {
    startOfflineSync();
    setQueued(queueSize());
    const h = (e: Event) => setQueued((e as CustomEvent).detail ?? queueSize());
    window.addEventListener('library-queue-changed', h);
    return () => window.removeEventListener('library-queue-changed', h);
  }, []);

  const debouncedMember = useDebounce(memberQuery, 300);
  const { data: memberResults } = useMembers(orgSlug, { q: debouncedMember || undefined, status: 'active', limit: 6 });
  const { data: recent, isLoading: loansLoading } = useLoans(orgSlug, { limit: 12 });

  const checkout = useCheckout(orgSlug);
  const returnCopy = useReturn(orgSlug);
  const renew = useRenew(orgSlug);

  function isOffline(e: unknown) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    return (e as { response?: unknown })?.response === undefined; // axios network error has no response
  }

  async function doCheckout() {
    if (!member) { toast.error('Scan or select a member first'); return; }
    if (!copyBarcode.trim()) { toast.error('Scan the copy barcode'); return; }
    const barcode = copyBarcode.trim();
    const clientRef = uid();
    try {
      const res = await checkout.mutateAsync({ member_id: member.id, copy_barcode: barcode, in_house: inHouse, client_reference: clientRef });
      toast.success(`Checked out · due ${formatDate(res.loan.due_date)}`);
      (res.warnings ?? []).forEach((w) => toast.warning(w));
      setCopyBarcode('');
    } catch (e) {
      if (isOffline(e)) {
        enqueue({ id: clientRef, kind: 'checkout', orgSlug, payload: { member_id: member.id, copy_barcode: barcode, in_house: inHouse, client_reference: clientRef }, queuedAt: Date.now() });
        setQueued(queueSize());
        toast.info('Offline — checkout queued and will sync when back online.');
        setCopyBarcode('');
        return;
      }
      toast.error(await apiErrorMessage(e, 'Checkout failed'));
    }
  }

  async function doReturn() {
    if (!copyBarcode.trim()) { toast.error('Scan the copy barcode'); return; }
    const barcode = copyBarcode.trim();
    try {
      const res = await returnCopy.mutateAsync(barcode);
      if (res.fine_amount && res.fine_amount > 0) toast.warning(`Returned with a fine of KES ${res.fine_amount.toFixed(2)}`);
      else toast.success(res.message ?? 'Returned');
      if (res.hold_triggered) toast.info('A waiting hold is now ready for pickup.');
      setCopyBarcode('');
    } catch (e) {
      if (isOffline(e)) {
        enqueue({ id: uid(), kind: 'return', orgSlug, payload: { copy_barcode: barcode }, queuedAt: Date.now() });
        setQueued(queueSize());
        toast.info('Offline — return queued and will sync when back online.');
        setCopyBarcode('');
        return;
      }
      toast.error(await apiErrorMessage(e, 'Return failed'));
    }
  }

  async function doRenew(loan: Loan) {
    try {
      const r = await renew.mutateAsync(loan.id);
      toast.success(`Renewed · new due ${formatDate(r.due_date)}`);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Renewal failed'));
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Circulation Desk"
        subtitle="Scan-driven check-out and returns"
        icon={<BookOpen className="h-5 w-5" />}
        actions={queued > 0 ? (
          <Badge variant="warning" className="gap-1.5"><CloudOff className="h-3.5 w-3.5" />{queued} queued offline</Badge>
        ) : undefined}
      />

      <CapsuleTabs
        className="mb-6"
        value={mode}
        onChange={(v) => { setMode(v); setCopyBarcode(''); }}
        options={[{ value: 'checkout', label: 'Check Out' }, { value: 'return', label: 'Return' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action panel */}
        <Card>
          <div className="p-4 sm:p-6 space-y-5">
            {mode === 'checkout' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">1. Member</p>
                {member ? (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><User className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{member.full_name ?? `${member.first_name} ${member.last_name}`}</p>
                      <p className="text-xs text-muted-foreground">{member.membership_no}{member.tier_name ? ` · ${member.tier_name}` : ''}</p>
                    </div>
                    {(member.outstanding_fines ?? 0) > 0 && <Badge variant="error">Fines due</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => setMember(null)}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                        placeholder="Scan member card or search…"
                        className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                      <Button variant="outline" className="gap-1.5" onClick={() => setScanTarget('member')}><ScanLine className="h-4 w-4" /> Scan</Button>
                    </div>
                    {memberQuery && (
                      <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                        {(memberResults?.data ?? []).map((m) => (
                          <button key={m.id} type="button" onClick={() => { setMember(m); setMemberQuery(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/40">
                            <span className="text-sm font-medium truncate flex-1">{m.full_name ?? `${m.first_name} ${m.last_name}`}</span>
                            <span className="text-xs text-muted-foreground">{m.membership_no}</span>
                          </button>
                        ))}
                        {(memberResults?.data?.length ?? 0) === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No match.</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                {mode === 'checkout' ? '2. Copy' : 'Copy to return'}
              </p>
              <div className="flex gap-2">
                <input
                  value={copyBarcode}
                  onChange={(e) => setCopyBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') mode === 'checkout' ? doCheckout() : doReturn(); }}
                  placeholder="Scan the copy barcode…"
                  className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm font-mono focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <Button variant="outline" className="gap-1.5" onClick={() => setScanTarget('copy')}><ScanLine className="h-4 w-4" /> Scan</Button>
              </div>
            </div>

            {mode === 'checkout' && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={inHouse} onChange={(e) => setInHouse(e.target.checked)} className="h-4 w-4 rounded border-input" />
                In-house use (reading room — does not leave the library)
              </label>
            )}

            {mode === 'checkout' ? (
              <Button className="w-full gap-1.5" disabled={checkout.isPending} onClick={doCheckout}>
                <CheckCircle2 className="h-4 w-4" /> {checkout.isPending ? 'Checking out…' : 'Check out'}
              </Button>
            ) : (
              <Button className="w-full gap-1.5" disabled={returnCopy.isPending} onClick={doReturn}>
                <Undo2 className="h-4 w-4" /> {returnCopy.isPending ? 'Returning…' : 'Return copy'}
              </Button>
            )}
          </div>
        </Card>

        {/* Recent transactions */}
        <Card>
          <div className="px-5 py-4 border-b border-border bg-accent/5">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent Transactions</p>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {loansLoading ? (
              <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (recent?.data?.length ?? 0) === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No recent loans.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent!.data.map((loan) => {
                  const overdue = loan.status !== 'returned' && isOverdue(loan.due_date);
                  return (
                    <li key={loan.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{loan.bib_title ?? loan.copy_barcode}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {loan.member_name ?? loan.membership_no} · {formatDateTime(loan.checked_out_at)}
                        </p>
                      </div>
                      {loan.status === 'returned' ? (
                        <Badge variant="outline">Returned</Badge>
                      ) : overdue ? (
                        <Badge variant="error"><AlertTriangle className="h-3 w-3 mr-0.5 inline" />Overdue</Badge>
                      ) : (
                        <Badge variant="success">Due {formatDate(loan.due_date)}</Badge>
                      )}
                      {loan.status !== 'returned' && (
                        <Button variant="ghost" size="icon" title="Renew" disabled={renew.isPending} onClick={() => doRenew(loan)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!scanTarget} onClose={() => setScanTarget(null)} title={scanTarget === 'member' ? 'Scan member card' : 'Scan copy barcode'}>
        <BarcodeScanner
          hint={scanTarget === 'member' ? 'Point the camera at the member card barcode.' : 'Point the camera at the copy barcode.'}
          onScan={(text) => {
            if (scanTarget === 'member') setMemberQuery(text);
            else setCopyBarcode(text);
            setScanTarget(null);
          }}
        />
      </Dialog>
    </div>
  );
}
