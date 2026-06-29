'use client';

import { apiClient } from '@/lib/api/client';
import { parseLimitInfo } from '@/lib/api/error-handler';
import { LimitReachedModal } from '@/components/subscription/limit-reached-modal';
import { OfflineBar } from '@bengo-hub/shared-ui-lib/offline';
import { useLimitModal } from '@/store/limit-modal';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
    const { status, initialize } = useAuthStore();
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();
    const orgSlug = params?.orgSlug as string;
    const session = useAuthStore((s) => s.session);
    const logout = useAuthStore((s) => s.logout);
    const { isError, error, isLoading: meLoading } = useMe(!!session);
    const queryClient = useQueryClient();

    const isAuthCallback = pathname?.includes('/auth');
    const isUnauthorizedPage = pathname?.endsWith('/unauthorized');

    // `ready` = initialize() has run and restored any persisted session. We must NOT decide to
    // redirect an "idle" user to pin-login until this completes, otherwise a page refresh bounces
    // an authenticated user to login before their stored session is rehydrated.
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let active = true;
        initialize().finally(() => { if (active) setReady(true); });
        return () => { active = false; };
    }, [initialize]);

    // Register 401 handler: clear all caches and redirect to SSO.
    useEffect(() => {
        apiClient.setOn401(() => {
            const { status, lastAuthenticatedAt } = useAuthStore.getState();
            if (status === 'syncing' || status === 'loading') return;
            if (lastAuthenticatedAt && Date.now() - lastAuthenticatedAt < 15_000) return;
            queryClient.clear();
            void logout();
        });
        return () => apiClient.setOn401(null);
    }, [queryClient, logout]);

    // Wire 402 plan-limit-reached → limit modal
    useEffect(() => {
        apiClient.setOnLimitReached((data) => {
            const info = parseLimitInfo(data);
            if (info) useLimitModal.getState().show(info);
        });
        return () => apiClient.setOnLimitReached(null);
    }, []);

    // Unauthenticated users land on the PIN login page by default (the desk/kiosk default),
    // which itself offers "Sign in with company account (SSO)". Never redirect straight to SSO.
    useEffect(() => {
        if (ready && status === 'idle' && !pathname?.includes('/auth') && !pathname?.includes('/pin-login') && orgSlug) {
            router.replace(`/${orgSlug}/pin-login`);
        }
    }, [ready, status, pathname, orgSlug, router]);

    useEffect(() => {
        if (!session || isUnauthorizedPage || meLoading) return;
        const statusCode = (error as { response?: { status?: number } })?.response?.status;
        if (isError && statusCode === 403 && orgSlug) {
            // Skip redirect for subscription 403 — let SubscriptionBanner handle it
            const data = (error as any)?.response?.data;
            if (data?.code === 'subscription_inactive' || data?.upgrade === true) return;
            router.replace(`/${orgSlug}/unauthorized`);
        }
    }, [session, isError, error, isUnauthorizedPage, meLoading, orgSlug, router]);

    const loading = !ready || status === 'loading' || (!!session && meLoading);
    if (loading && !isAuthCallback) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Initializing session...</div>
            </div>
        );
    }

    return (
        <>
            <OfflineBar availableOffline={['Browse catalog', 'View loans']} disabledOffline={['Checkout', 'Returns', 'Fine payments']} />
            {children}
            <LimitReachedModal />
        </>
    );
}
