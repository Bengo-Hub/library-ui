'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, ExternalLink, KeyRound, Loader2, ScanLine, UserRound } from 'lucide-react';
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
import { landingPath } from '@/lib/auth/permissions';

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
      // Role-based landing: admins → dashboard, desk staff → circulation.
      const roles = useAuthStore.getState().user?.roles ?? (res.is_admin ? ['library_admin'] : ['library_staff']);
      router.replace(`/${orgSlug}${landingPath(roles as string[])}`);
    } catch (e) {
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setPinDigits([]); setSubmitting(false); }, 500);
      toast.error(await apiErrorMessage(e, 'Incorrect PIN for this branch'));
    }
  }

  // Badge login: a scanned staff-card serial logs the staff member straight in at this branch.
  async function submitCard(card: string) {
    const serial = card.trim();
    if (!branch || submitting || !serial) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await pinApi.identifyByCard(orgSlug, serial, branch.id);
      await hydrate({ accessToken: res.access_token, refreshToken: '', expiresIn: res.expires_in }, orgSlug);
      const bid = res.branch_id ?? branch.id;
      apiClient.setOutletID(bid);
      setOutlet({ id: bid, code: branch.code, name: res.branch_name ?? branch.name, is_hq: !!res.is_admin });
      toast.success(`Welcome, ${res.name || 'staff'}`);
      const roles = useAuthStore.getState().user?.roles ?? (res.is_admin ? ['library_admin'] : ['library_staff']);
      router.replace(`/${orgSlug}${landingPath(roles as string[])}`);
    } catch (e) {
      setError(true);
      setSubmitting(false);
      toast.error(await apiErrorMessage(e, 'Staff card not recognised for this branch'));
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

  function backspace() { setError(false); setPinDigits((d) => d.slice(0, -1)); }
  function clear() { setError(false); setPinDigits([]); }
  function submitCurrent() { if (pinDigits.length > 0) void submitPin(pinDigits.join('')); }

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
          // ── PIN entry step ── two responsive layouts of the SAME handlers (pos-adapted):
          //  • small (<lg): one active keyboard + ABC/?123 toggle
          //  • large (lg+): SSO-login card LEFT · QWERTY CENTER · numeric keypad RIGHT (both shown)
          <>
            {/* Staff badge scan — a USB/handheld scanner types the card serial + Enter to log in. */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20 w-full max-w-xs px-4">
              <div className="flex items-center gap-2 rounded-full bg-card border border-border shadow-md px-3 py-1.5">
                <ScanLine className="h-4 w-4 text-primary shrink-0" />
                <input
                  type="text"
                  inputMode="text"
                  placeholder="Scan staff card…"
                  disabled={submitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = (e.target as HTMLInputElement).value;
                      (e.target as HTMLInputElement).value = '';
                      void submitCard(v);
                    }
                  }}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  aria-label="Scan staff card"
                />
              </div>
            </div>

            {/* SMALL SCREENS */}
            <div className="w-full max-w-md lg:hidden rounded-3xl bg-card border border-border shadow-xl shadow-black/5 p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <KbdLabel text={keyboard === 'numeric' ? 'Enter PIN' : 'Enter passcode'} />
                {keyboard === 'numeric' ? (
                  <PinKeypad
                    onDigit={handleDigit} onBackspace={backspace} onClear={clear}
                    onToggleQwerty={() => setKeyboard('qwerty')} disabled={submitting} isSubmitting={submitting}
                  />
                ) : (
                  <QwertyKeyboard
                    onKey={handleKey} onBackspace={backspace} onEnter={submitCurrent}
                    shift={shift} onToggleShift={() => setShift((s) => !s)} onToggleNumeric={() => setKeyboard('numeric')} disabled={submitting}
                  />
                )}
                {isDemo && <DemoHint />}
                <SSOLink onClick={() => redirectToSSO(orgSlug, `/${orgSlug}`)} />
              </div>
            </div>

            {/* LARGE SCREENS — 3-zone */}
            <div className="hidden lg:flex w-full max-w-6xl rounded-3xl bg-card border border-border shadow-xl shadow-black/5 p-6 flex-col gap-4">
              <div className="flex items-stretch gap-5">
                <div className="w-44 shrink-0">
                  <button
                    onClick={() => redirectToSSO(orgSlug, `/${orgSlug}`)}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl py-5 text-white font-bold shadow-md ring-1 ring-inset ring-white/15 active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(160deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)' }}
                  >
                    <span className="h-12 w-12 rounded-2xl bg-white/20 ring-1 ring-inset ring-white/25 flex items-center justify-center"><UserRound className="h-6 w-6" /></span>
                    <span className="text-sm">SSO Login</span>
                  </button>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-3 rounded-2xl bg-accent/30 border border-border p-4">
                  <KbdLabel text="Enter passcode" />
                  <QwertyKeyboard onKey={handleKey} onBackspace={backspace} onEnter={submitCurrent} shift={shift} onToggleShift={() => setShift((s) => !s)} disabled={submitting} />
                </div>
                <div className="w-64 shrink-0 flex flex-col gap-3 rounded-2xl bg-accent/30 border border-border p-4">
                  <KbdLabel text="Enter PIN" />
                  <PinKeypad onDigit={handleDigit} onBackspace={backspace} onClear={clear} disabled={submitting} isSubmitting={submitting} />
                </div>
              </div>
              {isDemo && <DemoHint />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SSOLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-2 mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <ExternalLink className="h-3.5 w-3.5" /> Sign in with company account (SSO)
    </button>
  );
}

function KbdLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground">
      <KeyRound className="h-3.5 w-3.5" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{text}</span>
    </div>
  );
}

const DEMO_PINS = [
  { pin: '1111', role: 'Librarian', accent: '#ef4444' },
  { pin: '2222', role: 'Desk Assistant', accent: '#3b82f6' },
  { pin: '3333', role: 'Member', accent: '#10b981' },
];

function DemoHint() {
  return (
    <div className="rounded-2xl border border-border bg-accent/30 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 text-center">Demo desk PINs</p>
      <div className="grid grid-cols-3 gap-1.5">
        {DEMO_PINS.map(({ pin, role, accent }) => (
          <div key={pin} className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5" style={{ background: `${accent}14` }}>
            <span className="font-mono text-sm font-black" style={{ color: accent }}>{pin}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
