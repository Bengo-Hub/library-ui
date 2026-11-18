/**
 * Access-token refresh for library-ui, built on the shared cross-tab-safe refresher
 * (@bengo-hub/shared-ui-lib/auth createSessionRefresher). Before spending the refresh token it
 * picks up a newer session another tab saved, tabs take turns refreshing, and an enrolment-only
 * answer counts as signed out. See the shared module for the full story.
 */

import { createSessionRefresher } from '@bengo-hub/shared-ui-lib/auth';
import { useAuthStore } from '@/store/auth';
import { refreshTokens } from '@/lib/auth/api';
import { cookieMode } from '@/lib/auth/session-mode';
import { isTerminalSession } from '@/lib/auth/session-kind';

/** The persisted store key; also names the cross-tab refresh lock and the storage watcher. */
export const AUTH_STORAGE_KEY = 'library-auth-storage';

const refreshSession = createSessionRefresher({
  lockName: AUTH_STORAGE_KEY,
  getSession: () => useAuthStore.getState().session,
  reloadSession: () => useAuthStore.persist.rehydrate(),
  saveSession: (session) => useAuthStore.setState({ session }),
  refresh: refreshTokens,
});

/**
 * Returns a usable access token, or null when the session is over (or auth-api could not be
 * reached; callers here treat both the same way). Pass the token the server just rejected
 * when it is known.
 */
export async function refreshAccessToken(failedToken?: string | null): Promise<string | null> {
  // The cookie session refreshes through auth-api's HttpOnly cookie (lib/auth/cookie-session.ts).
  // A PIN or badge desk JWT has no refresh path, as before: the sso cookie may belong to someone else.
  if (cookieMode()) {
    if (isTerminalSession(useAuthStore.getState().session?.accessToken)) return null;
    const { getCookieSession } = await import('@/lib/auth/cookie-session');
    const renewed = await getCookieSession().refresh(failedToken);
    return 'token' in renewed ? renewed.token : null;
  }
  const outcome = await refreshSession(failedToken);
  return 'token' in outcome ? outcome.token : null;
}
