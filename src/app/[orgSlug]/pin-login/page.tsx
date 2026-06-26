'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { UserRound, ArrowLeft, KeyRound } from 'lucide-react';
import { pinApi, type StaffProfile } from '@/lib/api/pin';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/providers/branding-provider';
import { Card } from '@/components/ui/base';
import { PinKeypad } from '@/components/library/PinKeypad';
import { apiErrorMessage } from '@/lib/api/error-message';

/**
 * PIN login — supplements SSO for fast desk/kiosk staff switching. Pick a staff member,
 * enter the PIN, and the backend returns a short-lived terminal JWT that the apiClient uses
 * exactly like an SSO token (RequireAnyAuth on the API accepts both).
 */
export default function PinLoginPage() {
  const orgSlug = useParams()?.orgSlug as string;
  const router = useRouter();
  const { tenant } = useBranding();
  const hydrate = useAuthStore((s) => s.hydrateFromWebAuthn);

  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    pinApi.profiles(orgSlug).then(setProfiles).catch(() => setProfiles([]));
  }, [orgSlug]);

  async function handlePin(pin: string) {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await pinApi.login(orgSlug, selected.user_id, pin);
      await hydrate({ accessToken: res.access_token, refreshToken: '', expiresIn: res.expires_in }, orgSlug);
      toast.success(`Welcome, ${res.name || 'staff'}`);
      router.replace(`/${orgSlug}/circulation`);
    } catch (e) {
      setError('Incorrect PIN');
      toast.error(await apiErrorMessage(e, 'PIN login failed'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
        <div className="p-8 space-y-6">
          <div className="text-center">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name ?? orgSlug} className="h-12 mx-auto object-contain mb-3" />
            ) : (
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3"><KeyRound className="h-7 w-7" /></div>
            )}
            <h1 className="text-xl font-black tracking-tight">{selected ? `Hi, ${selected.name}` : 'Staff PIN Login'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{selected ? 'Enter your PIN to continue' : 'Select your profile'}</p>
          </div>

          {!selected ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {profiles.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No staff PINs set yet. A manager can set PINs from Team &amp; Roles.</p>
              ) : (
                profiles.map((p) => (
                  <button key={p.user_id} onClick={() => setSelected(p)} className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/50 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><UserRound className="h-5 w-5" /></div>
                    <span className="text-sm font-semibold">{p.name || p.user_id.slice(0, 8)}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <PinKeypad onConfirm={handlePin} loading={loading} error={error} />
              <button onClick={() => { setSelected(null); setError(''); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Choose a different profile</button>
            </>
          )}

          <Link href={`/${orgSlug}`} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Use SSO sign-in instead
          </Link>
        </div>
      </Card>
    </div>
  );
}
