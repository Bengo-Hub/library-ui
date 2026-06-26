'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useOutletStore, LIBRARY_SELECTED_BRANCH_KEY } from '@/store/outlet';

/**
 * OutletGate — enforces the "log into a branch" step on every dashboard entry. If an
 * authenticated user reaches a dashboard route without having chosen a branch (no selection
 * marker and no active branch in the store), they're sent to the select-outlet gate.
 * "All Branches" (HQ) counts as a choice — it writes the 'all' marker. Renders nothing.
 */
export function OutletGate() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug as string | undefined;
  const status = useAuthStore((s) => s.status);
  const outlet = useOutletStore((s) => s.outlet);

  useEffect(() => {
    if (status !== 'authenticated' || !orgSlug) return;
    if (pathname && pathname.includes('/auth/')) return;

    let hasMarker = false;
    try {
      hasMarker = !!localStorage.getItem(LIBRARY_SELECTED_BRANCH_KEY);
    } catch {
      hasMarker = false;
    }
    if (hasMarker || outlet) return;

    const returnTo = encodeURIComponent(pathname ?? `/${orgSlug}`);
    router.replace(`/${orgSlug}/auth/select-outlet?returnTo=${returnTo}`);
  }, [status, orgSlug, pathname, outlet, router]);

  return null;
}
