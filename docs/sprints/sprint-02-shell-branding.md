# Sprint 02 — App Shell, API Client & Branding

**Status:** ✅ Shipped
**Goal:** Build the tenant-aware application shell — the API client (headers + error interception), the branding provider (tenant brand → CSS vars), the theme provider, the responsive sidebar + topbar, the OfflineBar, and the per-tenant PWA manifest.

---

## Scope

Everything between "blank Next app" and "authenticated pages": the chrome, the data transport, and the per-tenant theming.

---

## Task Checklist

### API client (`lib/api/client.ts`)
- [x] `ApiClient` over a single Axios instance; `baseURL` from `NEXT_PUBLIC_API_URL`.
- [x] Request interceptor: `Authorization: Bearer`, `X-Tenant-ID`/`X-Tenant-Slug` (suppressed for platform owners), `X-Outlet-ID`; drops JSON `Content-Type` for `FormData` (multipart uploads).
- [x] Response interceptor: **401** → single token refresh + retry, else `on401` callback; **403** `subscription_inactive`/`upgrade` → subscription callback; **402** → limit-reached callback.
- [x] Blob-aware error normalisation (`error.normalizedMessage`) so toasts show the real backend message.
- [x] `get/post/put/patch/delete` + `getBlob`/`postBlob` (label PDFs, e-book read stream).

### Error handling
- [x] `lib/api/error-message.ts` (blob-aware `apiErrorMessage`) + `lib/api/error-handler.ts` (`parseLimitInfo`).

### Branding (`providers/branding-provider.tsx`)
- [x] Resolve tenant brand (logo/primary/secondary) and set CSS vars on `documentElement`: `--tenant-primary/secondary/logo-url`, `--primary` + `--ring` (HSL triplet), `--brand-primary/emphasis/dark` (RGB triplet), `--primary-dark`.
- [x] Hex→HSL / hex→RGB / hex→dark-RGB conversion helpers.

### Theme (`components/theme-provider.tsx`, `theme-toggle.tsx`)
- [x] `next-themes` with **default light** (`defaultTheme="light"`, `enableSystem={false}`).

### Shell (`app/[orgSlug]/org-shell.tsx`, `components/sidebar.tsx`, `header.tsx`, `footer.tsx`)
- [x] Responsive collapsible sidebar (nav groups, tenant logo, semantic tokens, platform group owner-only) with mobile off-canvas + backdrop.
- [x] Header with branch/outlet filter + theme toggle; footer.
- [x] `org-shell` client wrapper composing providers + sidebar + topbar + content.

### Offline / PWA
- [x] Shared `@bengo-hub/shared-ui-lib/offline` `OfflineBar` (offline/syncing ribbon + PWA updater) mounted in the client provider; offline-available vs disabled action lists.
- [x] `components/pwa-registration.tsx` + `pwa-update-banner.tsx`.
- [x] Per-tenant manifest: `app/[orgSlug]/layout.tsx` `generateMetadata` → `manifest.webmanifest` + `manifest.webmanifest/route.ts` (server-rendered name/logo/`start_url`).
- [x] `app/healthz/route.ts` liveness route; `not-found.tsx`.

---

## Acceptance Criteria

- [x] Every request carries auth + tenant + outlet headers; 401/403/402 are intercepted globally.
- [x] Switching tenants re-skins the shell (logo + primary colour) via CSS vars, light theme by default.
- [x] The sidebar collapses to an off-canvas drawer on mobile.
- [x] OfflineBar appears offline; PWA installs per tenant with the correct name/icon.

---

## Dependencies

- Sprint 01 (scaffold + tokens), library-api `/branding` source (via notifications-api/auth-api) for brand resolution.
