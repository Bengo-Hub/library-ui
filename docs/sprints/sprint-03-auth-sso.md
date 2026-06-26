# Sprint 03 — SSO Auth, RBAC Bootstrap & Subscription

**Status:** ✅ Shipped
**Goal:** Wire the full SSO/PKCE login flow, the auth store, the `useMe` RBAC bootstrap off the service `/auth/me`, server-session logout, the outlet/branch selection gate, and the subscription banner + limit modal.

---

## Scope

The client-side identity + entitlement layer that gates every page and write action.

---

## Task Checklist

### SSO / PKCE (`lib/auth/*`)
- [x] `pkce.ts` — code verifier/challenge/state generation + storage.
- [x] `api.ts` — `buildAuthorizeUrl` (S256, tenant param), `exchangeCodeForTokens`, `buildLogoutUrl`, `revokeServerSession`, `fetchLibraryProfile`.
- [x] `token-refresh.ts` — refresh-token exchange used by the apiClient 401 path.
- [x] `auth/callback/page.tsx` — handle the OIDC redirect, exchange the code, hydrate the session.

### Auth store (`store/auth.ts`)
- [x] Zustand persisted store: `status`, `user` (`UserProfile` roles + union permissions + `isPlatformOwner`/`isSuperUser`), `session` (access/refresh/expiry).
- [x] `initialize`, `redirectToSSO(orgSlug, returnUrl)`, `logout` (**posts to the SSO server session** via `revokeServerSession`, then clears local state — not a cookie-only GET).
- [x] On login: `fetchLibraryProfile(tenantSlug)` → `GET /auth/me` to bootstrap service-level RBAC (roles + union permissions).

### Auth provider (`providers/auth-provider.tsx`)
- [x] `useMe` (TanStack Query) keeps the profile fresh; redirect-to-SSO when idle + no session.
- [x] 403 from `/auth/me` (non-subscription) → `/{orgSlug}/unauthorized`; subscription 403 deferred to the banner.
- [x] Register apiClient `on401` (clear caches + logout) and `onLimitReached` (limit modal).

### Permissions (`lib/auth/permissions.ts`, `hooks/use-app-permissions.ts`, `hooks/useMe.ts`)
- [x] `isPlatformOwner` + `hasPermission`/`hasRole` helpers driving sidebar + route gating.

### Outlet / branch (`store/outlet.ts`, `store/outlet-filter.ts`, `auth/select-outlet/page.tsx`, `components/outlet-gate.tsx`, `branch-filter.tsx`)
- [x] Branch/outlet selection: HQ users get a picker + "all outlets"; assigned staff auto-select; persisted; `apiClient.setOutletID` on rehydrate.

### Subscription (`store/subscription.ts`, `store/limit-modal.ts`, `lib/auth/subscription.ts`, `components/subscription/*`)
- [x] Subscription snapshot store (IndexedDB-backed); `subscription-banner.tsx` (inactive/upgrade) + `limit-reached-modal.tsx` (402); `api/subscription/route.ts` server route.

---

## Acceptance Criteria

- [x] First visit redirects to SSO; callback exchanges the code and lands authenticated.
- [x] Logout revokes the server session (POST), not just the cookie.
- [x] `useMe` union permissions drive the sidebar and route protection.
- [x] Inactive subscription shows the banner; plan-limit hits open the modal.
- [x] Branch selection persists and scopes data.

---

## Dependencies

- Sprint 02 (apiClient + shell), library-api `/auth/me` + auth-ui SSO/PKCE.
