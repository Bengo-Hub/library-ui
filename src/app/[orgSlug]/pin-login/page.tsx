'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, ExternalLink, Loader2 } from 'lucide-react';
import { pinApi, type PinBranch } from '@/lib/api/pin';
import { useAuthStore } from '@/store/auth';
import { useOutletStore } from '@/store/outlet';
import { useBranding } from '@/providers/branding-provider';
import { apiClient } from '@/lib/api/client';
import { LoginHero } from '@/components/library/pin/LoginHero';
import { BranchCard } from '@/components/library/pin/BranchCard';
import { PinKeypad } from '@/components/library/pin/PinKeypad';
import { QwertyKeyboard } from '@/components/library/pin/QwertyKeyboard';
import { apiErrorMessage } from '@/lib/api/error-message';

const PIN_LENGTH = 4; // numeric PINs auto-submit at 4; alphanumeric PINs submit via Enter/Login

/**
 * PIN login — the DEFAULT desk/kiosk landing, adapting the pos-ui PIN design (brand hero band,
 * branch cards, masked passcode on the hero curve, numeric keypad). Flow: pick a branch (auto-
 * selected when there's only one) → enter a PIN. PIN-first identify resolves the staff member at
 * that branch (branch scoping enforced server-side); the terminal JWT is then used like SSO.
 * No attendance/clock-in flow (library does not use it).
 */
export default function PinLoginPage() {
  const orgSlug = useParams()?.orgSlug as string;
  const router = useRouter();
  const { tenant } = useBranding();
  const hydrate = useAuthStore((s) => s.hydrateFromWebAuthn);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);
  const setOutlet = useOutletStore((s) => s.setOutlet);

  const [branches, setBranches] = useState<PinBranch[]>([]);
  const [branch, setBranch] = useState<PinBranch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [keyboard, setKeyboard] = useState<'numeric' | 'qwerty'>('numeric');
  const [shift, setShift] = useState(false);

  useEffect(() => {
    pinApi.branches(orgSlug)
      .then((bs) => { setBranches(bs); if (bs.length === 1) setBranch(bs[0]); })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, [orgSlug]);

  const heading = useMemo(() => tenant?.orgName ?? tenant?.name ?? 'Library', [tenant]);
  const initials = (tenant?.orgName ?? orgSlug ?? 'LB').slice(0, 2).toUpperCase();
  const isDemo = orgSlug === 'codevertex-demo';

  async function submitPin(pin: string) {
    if (!branch || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await pinApi.identify(orgSlug, pin, branch.id);
      await hydrate({ accessToken: res.access_token, refreshToken: '', expiresIn: res.expires_in }, orgSlug);
      const bid = res.branch_id ?? branch.id;
      apiClient.setOutletID(bid);
      setOutlet({ id: bid, code: branch.code, name: res.branch_name ?? branch.name, is_hq: !!res.is_admin });
      toast.success(`Welcome, ${res.name || 'staff'}`);
      router.replace(`/${orgSlug}/circulation`);
    } catch (e) {
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setPinDigits([]); setSubmitting(false); }, 500);
      toast.error(await apiErrorMessage(e, 'Incorrect PIN for this branch'));
    }
  }

  // Numeric keypad: append a digit; auto-submit a 4-digit PIN (the common case).
  function handleDigit(d: string) {
    if (submitting) return;
    setError(false);
    const next = [...pinDigits, d].slice(0, PIN_LENGTH);
    setPinDigits(next);
    if (next.length === PIN_LENGTH) void submitPin(next.join(''));
  }

  // QWERTY: append a character for alphanumeric PINs — no auto-submit (Enter / Login submits).
  function handleKey(char: string) {
    if (submitting) return;
    setError(false);
    setPinDigits((d) => [...d, char]);
  }

  return (
    <div className="relative min-h-dvh flex flex-col bg-background">
      <LoginHero
        eyebrow="Library System"
        heading={heading}
        subline={branch ? branch.name : (branches.length > 1 ? 'Select your branch to sign in' : heading)}
        logoUrl={tenant?.logoUrl}
        fallbackInitials={initials}
        isHQ={branch?.is_default}
        showSwitchBranch={!!branch && branches.length > 1}
        onSwitchBranch={() => { setBranch(null); setPinDigits([]); setError(false); }}
        passcode={branch ? {
          length: pinDigits.length,
          error,
          shake,
          isSubmitting: submitting,
          onSubmit: () => pinDigits.length === PIN_LENGTH && submitPin(pinDigits.join('')),
        } : undefined}
      />

      <div className="relative z-10 flex-1 flex items-start justify-center px-4 sm:px-6 pt-4 pb-10 overflow-y-auto">
        {!branch ? (
          // ── Branch selection step ──
          <div className="w-full max-w-2xl">
            {loadingBranches ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse" />)}
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No branches available</p>
                <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to add a branch.</p>
              </div>
            ) : (
              <div className={branches.length <= 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
                {branches.map((b, i) => <BranchCard key={b.id} branch={b} index={i} onSelect={() => { setBranch(b); setError(false); }} />)}
              </div>
            )}
            <SSOLink onClick={() => redirectToSSO(orgSlug, `/${orgSlug}`)} />
          </div>
        ) : (
          // ── PIN entry step (numeric or QWERTY for alphanumeric PINs) ──
          <div className={`w-full ${keyboard === 'qwerty' ? 'max-w-2xl' : 'max-w-sm'} rounded-3xl bg-card border border-border shadow-xl shadow-black/5 p-5 sm:p-6`}>
            <div className="flex flex-col gap-4">
              {keyboard === 'numeric' ? (
                <PinKeypad
                  onDigit={handleDigit}
                  onBackspace={() => { setError(false); setPinDigits((d) => d.slice(0, -1)); }}
                  onClear={() => { setError(false); setPinDigits([]); }}
                  onToggleQwerty={() => setKeyboard('qwerty')}
                  disabled={submitting}
                  isSubmitting={submitting}
                />
              ) : (
                <QwertyKeyboard
                  onKey={handleKey}
                  onBackspace={() => { setError(false); setPinDigits((d) => d.slice(0, -1)); }}
                  onEnter={() => pinDigits.length > 0 && submitPin(pinDigits.join(''))}
                  shift={shift}
                  onToggleShift={() => setShift((s) => !s)}
                  onToggleNumeric={() => setKeyboard('numeric')}
                  disabled={submitting}
                />
              )}
              {isDemo && <p className="text-center text-[11px] text-muted-foreground">Demo desk PIN: <span className="font-mono font-semibold">1234</span></p>}
              <SSOLink onClick={() => redirectToSSO(orgSlug, `/${orgSlug}`)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SSOLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-8 mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <ExternalLink className="h-3.5 w-3.5" /> Sign in with company account (SSO)
    </button>
  );
}
