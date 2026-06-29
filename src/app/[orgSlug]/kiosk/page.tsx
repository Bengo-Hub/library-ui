'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ScanLine, BookCheck, UserRound, LogOut, CheckCircle2, CreditCard, BookOpen, Sparkles } from 'lucide-react';
import { useCheckout } from '@/hooks/useCirculation';
import { membersApi, type Member } from '@/lib/api/members';
import { Button } from '@/components/ui/base';
import { ScannerInput } from '@/components/library/ScannerInput';
import { apiErrorMessage } from '@/lib/api/error-message';

/**
 * Self-checkout kiosk — patron-facing, scan-driven full-screen flow: scan membership card, then
 * scan each book. Works with a USB/handheld scanner (keyboard-wedge) or the device camera. Modern,
 * responsive, touch-first layout (large targets, gradient hero, live receipt).
 */
export default function KioskPage() {
  const orgSlug = useParams()?.orgSlug as string;
  const checkout = useCheckout(orgSlug);

  const [member, setMember] = useState<Member | null>(null);
  const [items, setItems] = useState<string[]>([]);

  async function handleCard(card: string) {
    try {
      const res = await membersApi.list(orgSlug, { q: card, limit: 5 });
      const found = res.data.find((m) => m.membership_no === card) ?? res.data[0];
      if (!found) { toast.error('Membership card not recognised'); return; }
      if (found.status !== 'active') { toast.error('This membership is not active — please see a librarian'); return; }
      setMember(found);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Could not read card')); }
  }

  async function handleBook(barcode: string) {
    if (!member) return;
    try {
      await checkout.mutateAsync({ member_id: member.id, copy_barcode: barcode });
      setItems((prev) => [barcode, ...prev]);
      toast.success('Checked out');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Could not check out this item')); }
  }

  function reset() { setMember(null); setItems([]); }

  return (
    <div className="min-h-full -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 flex flex-col">
      {/* Hero band */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-purple-700 text-white px-6 py-8 sm:py-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative max-w-4xl mx-auto flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <ScanLine className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Self-Checkout</h1>
            <p className="text-white/80 text-sm sm:text-base">Borrow books in seconds — no queue needed.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: steps / member */}
          <div className="lg:col-span-2 space-y-4">
            {!member ? (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">How it works</h2>
                <ol className="space-y-4">
                  {[
                    { icon: CreditCard, t: 'Scan your card', d: 'Hold your membership card to the scanner.' },
                    { icon: BookOpen, t: 'Scan your books', d: 'Scan each book barcode one by one.' },
                    { icon: Sparkles, t: 'You’re done', d: 'Tap Done and enjoy your books!' },
                  ].map((s, i) => (
                    <li key={s.t} className="flex items-start gap-3">
                      <span className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">{i + 1}</span>
                      <div>
                        <p className="font-semibold flex items-center gap-1.5"><s.icon className="h-4 w-4 text-primary" /> {s.t}</p>
                        <p className="text-sm text-muted-foreground">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><UserRound className="h-7 w-7" /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-lg truncate">{member.full_name ?? `${member.first_name} ${member.last_name}`}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.membership_no}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-primary/5 p-4 text-center">
                  <p className="text-4xl font-black text-primary">{items.length}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">item{items.length === 1 ? '' : 's'} checked out</p>
                </div>
                <Button variant="outline" className="w-full mt-4 gap-1.5 h-12 text-base" onClick={reset}><LogOut className="h-5 w-5" /> Done / Next patron</Button>
              </div>
            )}
          </div>

          {/* Right: scan + receipt */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <label className="block text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                {member ? 'Scan a book' : 'Scan membership card'}
              </label>
              <div className="text-base [&_input]:h-14 [&_input]:text-lg">
                {!member
                  ? <ScannerInput onScan={handleCard} placeholder="Scan membership card…" />
                  : <ScannerInput onScan={handleBook} loading={checkout.isPending} placeholder="Scan a book barcode…" />}
              </div>
              {!member && <p className="mt-3 text-sm text-muted-foreground">Tip: you can also type your membership number and press Enter.</p>}
            </div>

            {member && (
              <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                  <BookCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">Checked out today</h2>
                </div>
                {items.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">Scan your first book to begin.</div>
                ) : (
                  <ul className="divide-y divide-border max-h-[22rem] overflow-y-auto">
                    {items.map((b, i) => (
                      <li key={`${b}-${i}`} className="flex items-center gap-3 px-6 py-3.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="font-mono text-sm truncate flex-1">{b}</span>
                        <span className="text-xs text-muted-foreground">#{items.length - i}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
