'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ScanLine, BookCheck, UserRound, LogOut, CheckCircle2 } from 'lucide-react';
import { useCheckout } from '@/hooks/useCirculation';
import { membersApi, type Member } from '@/lib/api/members';
import { Button, Card } from '@/components/ui/base';
import { ScannerInput } from '@/components/library/ScannerInput';
import { apiErrorMessage } from '@/lib/api/error-message';

/**
 * Self-checkout kiosk — patron-facing. The same scan-driven checkout the staff desk uses,
 * in a simplified full-screen flow: scan membership card, then scan each book. Works with a
 * USB/handheld scanner (keyboard-wedge) or the device camera (ScannerInput).
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
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-xl">
        <div className="p-6 sm:p-10 space-y-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <ScanLine className="h-8 w-8" />
          </div>

          {!member ? (
            <>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Self-Checkout</h1>
                <p className="text-sm text-muted-foreground mt-1">Scan your membership card to begin.</p>
              </div>
              <ScannerInput onScan={handleCard} placeholder="Scan membership card…" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-sm">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="font-semibold">{member.full_name ?? `${member.first_name} ${member.last_name}`}</span>
                <span className="text-muted-foreground font-mono text-xs">{member.membership_no}</span>
              </div>
              <ScannerInput onScan={handleBook} loading={checkout.isPending} placeholder="Scan a book barcode…" />

              {items.length > 0 && (
                <div className="text-left space-y-2 max-h-60 overflow-y-auto">
                  {items.map((b, i) => (
                    <div key={`${b}-${i}`} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <BookCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs truncate">{b}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} checked out</span>
                <Button className="gap-1.5" onClick={reset}><LogOut className="h-4 w-4" /> Done</Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
