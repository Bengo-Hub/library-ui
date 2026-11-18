import { apiClient } from '@/lib/api/client';
import { buildAuthorizeUrl, exchangeCodeForTokens, fetchLibraryProfile, revokeServerSession } from '@/lib/auth/api';
import {
    consumeVerifier,
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
    storeState,
    storeVerifier
} from '@/lib/auth/pkce';
import { cookieMode } from '@/lib/auth/session-mode';
import { isTerminalSession } from '@/lib/auth/session-kind';
import { scrubStoredSession } from '@bengo-hub/shared-ui-lib/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'library-auth-storage';

/** True when the stored session is a PIN or badge desk's terminal JWT (kept across reloads). */
function storedTerminalSession(): boolean {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as { state?: { session?: { accessToken?: string } } }) : null;
        return isTerminalSession(parsed?.state?.session?.accessToken);
    } catch {
        return false;
    }
}

// Cookie session (fleet plan G11): sso tokens an earlier build stored are dropped before the store
// loads; from here on an sso sign-in persists only the profile. A PIN or badge desk's terminal JWT
// has no sso cookie behind it, so it stays stored and the desk stays signed in across reloads.
if (cookieMode() && !storedTerminalSession()) scrubStoredSession(AUTH_STORAGE_KEY);

export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
    permissions: string[];
    tenant_id: string;
    tenant_slug: string;
    isPlatformOwner?: boolean;
    isSuperUser?: boolean;
}

interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

interface AuthState {
    status: 'idle' | 'loading' | 'authenticated' | 'error' | 'syncing' | 'subscription_required';
    user: UserProfile | null;
    session: Session | null;
    error: string | null;
    lastAuthenticatedAt: number | null;

    /** Subscription info fetched lazily after login (undefined = not started, null = loading). */
    subscriptionInfo: Record<string, unknown> | null | undefined;
    setSubscriptionInfo: (info: Record<string, unknown> | null) => void;

    initialize: () => Promise<void>;
    redirectToSSO: (orgSlug: string, returnTo?: string) => Promise<void>;
    handleSSOCallback: (orgSlug: string, code: string, callbackUrl: string) => Promise<void>;
    hydrateFromWebAuthn: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }, tenantSlug?: string) => Promise<void>;
    logout: () => Promise<void>;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            status: 'idle',
            subscriptionInfo: undefined,
            setSubscriptionInfo: (info: Record<string, unknown> | null) => set({ subscriptionInfo: info }),
            user: null,
            session: null,
            error: null,
            lastAuthenticatedAt: null,

            initialize: async () => {
                // A stored desk session takes the stored-token path below, as before.
                if (cookieMode() && !isTerminalSession(get().session?.accessToken)) {
                    // No sso token is stored: a known profile gets its first token through the sso cookie.
                    const known = get().user;
                    if (!known) {
                        set({ status: 'idle' });
                        return;
                    }
                    set({ status: 'loading' });
                    const { getCookieSession } = await import('@/lib/auth/cookie-session');
                    const token = await getCookieSession().getAccessToken();
                    if (!token) {
                        set({ status: 'idle', session: null, user: null });
                        return;
                    }
                    apiClient.setTenantInfo(known.tenant_id, known.tenant_slug);
                    set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
                    return;
                }
                const { session, user } = get();
                if (!session) {
                    set({ status: 'idle' });
                    return;
                }

                apiClient.setAccessToken(session.accessToken);
                if (user) {
                    apiClient.setTenantInfo(user.tenant_id, user.tenant_slug);
                }

                // Hydrate from storage if user profile exists and token hasn't expired.
                if (user && session.expiresAt) {
                    const expiresAt = new Date(session.expiresAt).getTime();
                    if (Date.now() < expiresAt - 60_000) {
                        set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
                        return;
                    }
                }

                set({ status: 'loading' });

                // Fetch fresh profile from library-api (syncs local RBAC roles and permissions).
                const storedSlug = user?.tenant_slug
                    ?? (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null)
                    ?? '';
                // Expired token on reload: renew it with the refresh token (one small call) instead of a
                // full SSO sign-in; a known profile is kept. Dynamic import: token-refresh imports this store.
                const expiringOnLoad = !session.expiresAt || Date.now() >= new Date(session.expiresAt).getTime() - 60_000;
                const renewedOnLoad = session.refreshToken && expiringOnLoad
                  ? await (await import('@/lib/auth/token-refresh')).refreshAccessToken(session.accessToken)
                  : null;
                if (renewedOnLoad) {
                  apiClient.setAccessToken(renewedOnLoad);
                  if (user) {
                    set({ status: 'authenticated', lastAuthenticatedAt: Date.now() });
                    return;
                  }
                }
                try {
                    const freshUser = await fetchLibraryProfile(storedSlug);
                    apiClient.setTenantInfo(freshUser.tenant_id, freshUser.tenant_slug);
                    set({ user: freshUser, status: 'authenticated', lastAuthenticatedAt: Date.now() });
                } catch (error) {
                    console.error('Failed to initialize auth:', error);
                    set({ status: 'idle', session: null, user: null });
                }
            },

            redirectToSSO: async (orgSlug: string, returnTo?: string) => {
                set({ status: 'loading', error: null });
                try {
                    const verifier = generateCodeVerifier();
                    const challenge = await generateCodeChallenge(verifier);
                    const state = generateState();

                    storeVerifier(verifier);
                    storeState(state);

                    if (returnTo && typeof window !== 'undefined') {
                        sessionStorage.setItem('sso_return_to', returnTo);
                    }

                    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;
                    const authorizeUrl = buildAuthorizeUrl({
                        codeChallenge: challenge,
                        state,
                        redirectUri: callbackUrl,
                        tenant: orgSlug,
                    });

                    window.location.href = authorizeUrl;
                } catch (error) {
                    set({ status: 'error', error: 'Failed to start sign-in' });
                    throw error;
                }
            },

            handleSSOCallback: async (orgSlug: string, code: string, callbackUrl: string) => {
                set({ status: 'syncing', error: null });
                const verifier = consumeVerifier();

                if (!verifier) {
                    set({ status: 'error', error: 'Session expired' });
                    return;
                }

                try {
                    const tokens = await exchangeCodeForTokens({
                        code,
                        codeVerifier: verifier,
                        redirectUri: callbackUrl,
                    });

                    const session: Session = {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token || '',
                        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    };

                    if (!(await adoptSession(session))) {
                        set({ status: 'error', error: 'Sign-in failed' });
                        return;
                    }

                    // Call library-api /auth/me to sync local RBAC roles and permissions.
                    let attempts = 0;
                    while (attempts < 5) {
                        try {
                            const user = await fetchLibraryProfile(orgSlug);
                            apiClient.setTenantInfo(user.tenant_id, user.tenant_slug);
                            if (typeof window !== 'undefined' && user?.email) {
                                localStorage.setItem('sso_last_email', user.email);
                            }
                            set({ user, status: 'authenticated', lastAuthenticatedAt: Date.now() });
                            return;
                        } catch (err: unknown) {
                            const status = (err as { response?: { status?: number } })?.response?.status;
                            if (status === 401 || status === 403) break;
                            attempts++;
                            await new Promise(r => setTimeout(r, 1200));
                        }
                    }

                    set({ status: 'error', error: 'Sign-in failed — could not verify identity' });
                } catch {
                    set({ status: 'error', error: 'Sign-in failed' });
                }
            },

            hydrateFromWebAuthn: async (tokens: { accessToken: string; refreshToken: string; expiresIn: number }, tenantSlug?: string) => {
                set({ status: 'syncing', error: null });
                try {
                    const session: Session = {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken || '',
                        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
                    };

                    if (!(await adoptSession(session))) {
                        set({ status: 'error', error: 'Biometric sign-in failed' });
                        return;
                    }

                    const slug = tenantSlug ?? (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null) ?? '';
                    let attempts = 0;
                    while (attempts < 5) {
                        try {
                            const user = await fetchLibraryProfile(slug);
                            apiClient.setTenantInfo(user.tenant_id, user.tenant_slug);
                            if (typeof window !== 'undefined' && user?.email) {
                                localStorage.setItem('sso_last_email', user.email);
                            }
                            set({ user, status: 'authenticated', lastAuthenticatedAt: Date.now() });
                            return;
                        } catch (err: unknown) {
                            const status = (err as { response?: { status?: number } })?.response?.status;
                            if (status === 401 || status === 403) break;
                            attempts++;
                            await new Promise(r => setTimeout(r, 1200));
                        }
                    }

                    set({ status: 'error', error: 'Biometric sign-in failed — could not verify identity' });
                } catch {
                    set({ status: 'error', error: 'Biometric sign-in failed' });
                }
            },

            logout: async () => {
                const token = get().session?.accessToken;
                const slug = get().user?.tenant_slug
                    ?? (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null)
                    ?? '';
                if (cookieMode() && !isTerminalSession(token)) {
                    // Revokes the session, clears the sso cookie and signs the other tabs out.
                    const { getCookieSession } = await import('@/lib/auth/cookie-session');
                    await getCookieSession().end();
                } else {
                    // A PIN or badge desk never touches the sso cookie: bearer revoke, as before.
                    await revokeServerSession(token);
                }
                set({ status: 'idle', user: null, session: null, subscriptionInfo: undefined, lastAuthenticatedAt: null });
                apiClient.setAccessToken(null);
                apiClient.setTenantInfo(null, null);
                apiClient.setOutletID(null);
                if (typeof window !== 'undefined') {
                    try { localStorage.removeItem('tenantId'); } catch { /* no-op */ }
                    try { localStorage.removeItem('tenantSlug'); } catch { /* no-op */ }
                    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* no-op */ }
                    try { sessionStorage.clear(); } catch { /* no-op */ }
                    // Desk/kiosk default: return to the PIN login page (not the SSO accounts page).
                    window.location.href = slug ? `/${slug}/pin-login` : '/';
                }
            },

            fetchUser: async () => {
                const { user } = get();
                const slug = user?.tenant_slug
                    ?? (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null)
                    ?? '';
                try {
                    const freshUser = await fetchLibraryProfile(slug);
                    set({ user: freshUser });
                } catch (error) {
                    console.error('Fetch user failed:', error);
                }
            },
        }),
        {
            name: AUTH_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            // The cookie session persists an sso sign-in's profile only; its access token stays in
            // memory. A PIN or badge desk's terminal JWT is stored as before, so the desk survives a reload.
            partialize: (state) => (cookieMode() && !isTerminalSession(state.session?.accessToken)
                ? { user: state.user }
                : { session: state.session, user: state.user }),
            // Restore the access token + tenant headers onto the API client the instant the store
            // rehydrates — BEFORE any React Query (e.g. useMe → /auth/me) fires. Otherwise the first
            // request on a page refresh goes out unauthenticated, 401s, and the on401 handler logs
            // the user out. Seed lastAuthenticatedAt too so the 401 grace window covers the race.
            onRehydrateStorage: () => (state) => {
                if (state?.session?.accessToken) {
                    apiClient.setAccessToken(state.session.accessToken);
                    if (state.user) {
                        apiClient.setTenantInfo(state.user.tenant_id, state.user.tenant_slug);
                    }
                    const exp = state.session.expiresAt ? new Date(state.session.expiresAt).getTime() : 0;
                    if (!exp || Date.now() < exp) {
                        state.lastAuthenticatedAt = Date.now();
                        state.status = 'authenticated';
                    }
                }
            },
        }
    )
);

/**
 * Puts a new sign-in's tokens to use. With the cookie session the refresh token goes into
 * auth-api's HttpOnly cookie and is dropped here; the store holds only the in-memory access token
 * the cookie session hands back. A PIN or badge desk's terminal JWT (no refresh token) is stored as
 * before, also with the cookie session, so the desk stays signed in across reloads. False when the
 * cookie was refused.
 */
async function adoptSession(session: Session): Promise<boolean> {
    if (!cookieMode() || isTerminalSession(session.accessToken) || !session.refreshToken) {
        apiClient.setAccessToken(session.accessToken);
        useAuthStore.setState({ session });
        return true;
    }
    const { getCookieSession } = await import('@/lib/auth/cookie-session');
    // A new sign-in replaces whoever was stored, so it is not taken for a user switch.
    useAuthStore.setState({ user: null, session: null });
    const started = await getCookieSession().start(session.refreshToken);
    return 'token' in started && !!useAuthStore.getState().session;
}
