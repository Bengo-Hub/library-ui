'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Camera, ExternalLink, KeyRound, LayoutDashboard, ScanLine, Store } from 'lucide-react';
import {
  PinLoginLayout, PinLoginHeader, PinLoginBrandPanel, PasscodeField, PinKeypad, QwertyKeyboard,
  OutletCard, DemoHints,
} from '@bengo-hub/shared-ui-lib/pin-login';
import { Dialog } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { pinApi, type PinBranch } from '@/lib/api/pin';
import { useAuthStore } from '@/store/auth';
import { useOutletStore } from '@/store/outlet';
import { useBranding } from '@/providers/branding-provider';
import { apiClient } from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/api/error-message';
import { landingPath } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 4; // numeric PINs auto-submit at 4; alphanumeric PINs submit via Enter/Login

const WORKFLOW_STEPS = [
  { icon: Store, label: 'Select branch' },
  { icon: KeyRound, label: 'Enter PIN' },
  { icon: LayoutDashboard, label: 'Start work' },
];

const DEMO_PINS = [
  { pin: '1111', role: 'Librarian', accent: '#ef4444' },
  { pin: '2222', role: 'Desk Assistant', accent: '#3b82f6' },
  { pin: '3333', role: 'Member', accent: '#10b981' },
];

/**
 * PIN login — the DEFAULT desk/kiosk landing, on the shared platform PIN-login shell
 * (@bengo-hub/shared-ui-lib/pin-login). Flow: pick a branch (auto-selected when there's only
 * one) → enter a PIN. PIN-first identify resolves the staff member at that branch (branch
 * scoping enforced server-side); the terminal JWT is then used like SSO. No attendance/clock-in
 * flow (library does not use it). Adds the library-only "scan staff card" login (USB/handheld
 * scanner or camera) as an extra slot the shared shell doesn't need to know about.
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
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    pinApi.branches(orgSlug)
      .then((bs) => { setBranches(bs); if (bs.length === 1) setBranch(bs[0]); })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, [orgSlug]);

  const tenantDisplayName = useMemo(() => tenant?.orgName ?? tenant?.name ?? 'Library', [tenant]);
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

  function handleDigit(d: string) {
    if (submitting) return;
    setError(false);
    const next = [...pinDigits, d].slice(0, PIN_LENGTH);
    setPinDigits(next);
    if (next.length === PIN_LENGTH) void submitPin(next.join(''));
  }

  function handleKey(char: string) {
    if (submitting) return;
    setError(false);
    setPinDigits((d) => [...d, char]);
  }

  function backspace() { setError(false); setPinDigits((d) => d.slice(0, -1)); }
  function clear() { setError(false); setPinDigits([]); }
  function submitCurrent() { if (pinDigits.length > 0) void submitPin(pinDigits.join('')); }

  const SSOButton = ({ tall }: { tall?: boolean }) => (
    <button
      type="button"
      onClick={() => redirectToSSO(orgSlug, `/${orgSlug}`)}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl',
        'text-primary-foreground font-bold shadow-md ring-1 ring-inset ring-white/15',
        'active:scale-[0.98] transition-all duration-150 hover:brightness-105',
        tall ? 'flex-1 py-6' : 'w-full py-4'
      )}
      style={{ background: 'linear-gradient(160deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark, var(--primary))) 100%)' }}
    >
      <span className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/20 ring-1 ring-inset ring-white/25 flex items-center justify-center">
        <ExternalLink className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <span className="text-sm">SSO Login</span>
    </button>
  );

  const ScanCardBar = () => (
    <div className="flex items-center gap-2 rounded-full bg-muted/50 border border-border pl-3 pr-1.5 py-1">
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
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        disabled={submitting}
        className="shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Scan staff card with camera"
        title="Scan with camera"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  );

  const header = (
    <PinLoginHeader
      serviceName="Codevertex Library"
      tenantName={tenantDisplayName}
      outletName={branch ? branch.name : (branches.length > 1 ? 'Select your branch to sign in' : undefined)}
      isHQ={branch?.is_default}
      showSwitchOutlet={!!branch && branches.length > 1}
      onSwitchOutlet={() => { setBranch(null); setPinDigits([]); setError(false); }}
      isOnline
    />
  );
  const brandPanel = (
    <PinLoginBrandPanel tenantName={tenantDisplayName} tenantLogoUrl={tenant?.logoUrl} workflowSteps={WORKFLOW_STEPS} />
  );

  if (!branch) {
    return (
      <PinLoginLayout
        header={header}
        brandPanel={brandPanel}
        card={
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto">
            {loadingBranches ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse" />)}
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm my-auto">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No branches available</p>
                <p className="mt-1 text-sm text-muted-foreground">Ask an administrator to add a branch.</p>
              </div>
            ) : (
              <div className={branches.length <= 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
                {branches.map((b, i) => (
                  <OutletCard key={b.id} outlet={{ ...b, is_hq: b.is_default }} index={i} onSelect={() => { setBranch(b); setError(false); }} />
                ))}
              </div>
            )}
            <div className="w-full max-w-xs mx-auto mt-6">
              <SSOButton />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <>
    <PinLoginLayout
      header={header}
      brandPanel={brandPanel}
      footer={isDemo && <DemoHints title="Demo desk PINs" hints={DEMO_PINS} />}
      card={
        <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full max-w-xs">
              <ScanCardBar />
            </div>
            <PasscodeField
              value={pinDigits.join('')}
              error={error}
              shake={shake}
              onSubmit={submitCurrent}
              isSubmitting={submitting}
            />
          </div>

          {/* ── SMALL SCREENS (< lg) ── */}
          <div className="flex-1 min-h-0 flex flex-col gap-4 lg:hidden overflow-y-auto">
            <SSOButton />
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 border border-border p-3 sm:p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {keyboard === 'numeric' ? 'Enter PIN' : 'Enter passcode'}
                </span>
              </div>
              {keyboard === 'numeric' ? (
                <div className="mx-auto w-full max-w-xs">
                  <PinKeypad
                    onDigit={handleDigit} onBackspace={backspace} onClear={clear}
                    onToggleQwerty={() => setKeyboard('qwerty')} disabled={submitting} isSubmitting={submitting}
                    digitsLength={pinDigits.length} pinLength={PIN_LENGTH}
                  />
                </div>
              ) : (
                <QwertyKeyboard
                  onKey={handleKey} onBackspace={backspace} onEnter={submitCurrent}
                  shift={shift} onToggleShift={() => setShift((s) => !s)} onToggleNumeric={() => setKeyboard('numeric')} disabled={submitting}
                />
              )}
            </div>
          </div>

          {/* ── LARGE SCREENS (lg+) — 3-zone ── */}
          <div className="hidden lg:flex flex-1 min-h-0 items-stretch gap-5">
            <div className="w-44 shrink-0 flex flex-col">
              <SSOButton tall />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-3 rounded-2xl bg-muted/40 border border-border p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Enter passcode</span>
              </div>
              <QwertyKeyboard onKey={handleKey} onBackspace={backspace} onEnter={submitCurrent} shift={shift} onToggleShift={() => setShift((s) => !s)} disabled={submitting} showToggle={false} />
            </div>
            <div className="w-64 shrink-0 flex flex-col gap-3 rounded-2xl bg-muted/40 border border-border p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Enter PIN</span>
              </div>
              <PinKeypad onDigit={handleDigit} onBackspace={backspace} onClear={clear} disabled={submitting} isSubmitting={submitting} digitsLength={pinDigits.length} pinLength={PIN_LENGTH} showToggle={false} />
            </div>
          </div>
        </div>
      }
    />
    <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan staff card">
      <BarcodeScanner
        hint="Point your camera at the barcode on your staff card."
        onScan={(text) => { setScanOpen(false); void submitCard(text); }}
      />
    </Dialog>
    </>
  );
}
