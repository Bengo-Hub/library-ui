# Library UI - Architecture

**Framework:** Next.js 16 (App Router) + React 19
**Language:** TypeScript (strict)
**Styling:** Tailwind CSS 4 + shadcn (on Base UI — not Radix)
**State:** Zustand (global) + TanStack Query v5 (server) + Axios
**Backend:** library-api at `libraryapi.codevertexitsolutions.com`
**Auth:** SSO via auth-ui (OIDC/OAuth2 + PKCE, `sso.codevertexitsolutions.com`)
**Last updated:** 2026-06-26
**Status:** Phase 1 MVP shipped — all pages data-integrated.

---

## High-Level Overview

```
┌──────────────┐   OIDC/PKCE   ┌──────────────┐
│   auth-ui    │◄──────────────│  library-ui   │
│   (SSO)      │──────JWT──────►│  Next 16     │
└──────────────┘                └──────┬───────┘
                                       │ REST (Bearer JWT, X-Tenant-*)
                                ┌──────▼───────┐
                                │ library-api   │
                                │   :4010       │
                                └──────────────┘
```

---

## Route Map (`src/app/`)

```
app/
  layout.tsx                                  # Root layout (providers, fonts, theme=light)
  page.tsx                                    # Landing / tenant resolve
  not-found.tsx                               # 404
  healthz/route.ts                            # Liveness route handler
  api/subscription/route.ts                   # Server route for subscription snapshot
  [orgSlug]/
    layout.tsx                                # Emits per-tenant PWA manifest (generateMetadata)
    org-shell.tsx                             # Client shell: sidebar + header + providers
    page.tsx                                  # Dashboard (summary KPIs + recent activity)
    manifest.webmanifest/route.ts             # Per-tenant PWA manifest (server-rendered)
    auth/callback/page.tsx                    # OIDC/PKCE callback
    auth/select-outlet/page.tsx               # Branch/outlet selection (HQ vs assigned)
    catalog/page.tsx                          # OPAC browse + search
    catalog/[id]/page.tsx                     # Bib detail (copies, availability, holds)
    cataloging/page.tsx                       # Staff cataloging (create/edit bibs, ISBN lookup)
    copies/page.tsx                           # Copies & holdings (barcode, labels, status)
    circulation/page.tsx                      # Circulation desk (scan checkout/return/renew)
    holds/page.tsx                            # Holds queue
    members/page.tsx                          # Member registry
    members/[id]/page.tsx                     # Member detail (loans, fines, holds)
    members/tiers/page.tsx                    # Member tiers
    members/policies/page.tsx                 # Loan policies
    fines/page.tsx                            # Fines (waive / pay-via-treasury)
    ebooks/page.tsx                           # Digital shelf
    ebooks/[id]/read/page.tsx                 # In-browser reader (PDF/EPUB + CDL)
    reports/page.tsx                          # Reports / analytics
    settings/page.tsx                         # Settings
    settings/branches/page.tsx                # Branch management
    team/page.tsx                             # Team & roles (RBAC)
    platform/page.tsx                         # Platform admin (platform owner only)
    unauthorized/page.tsx                     # 403
```

---

## Authentication Flow (SSO PKCE)

1. `AuthProvider` (`providers/auth-provider.tsx`) calls `initialize()` on the Zustand auth store.
2. If there is no session and the route is not an `/auth` route, `redirectToSSO(orgSlug, returnUrl)` builds the PKCE authorize URL (`lib/auth/pkce.ts` + `lib/auth/api.ts`) and redirects to auth-ui.
3. auth-ui authenticates and redirects to `/{orgSlug}/auth/callback`, which exchanges the code for tokens (`exchangeCodeForTokens`).
4. The store calls `fetchLibraryProfile(tenantSlug)` → `GET /api/v1/{tenant}/library/auth/me` to bootstrap **service-level RBAC** (roles + union permissions).
5. `useMe` (TanStack Query) keeps the profile fresh; a 403 from `/auth/me` (non-subscription) redirects to `/{orgSlug}/unauthorized`.
6. **Logout** posts to the SSO server session (`revokeServerSession`) — not a cookie-only GET redirect (`sso_frontend_logout_standard`) — then clears local state.

---

## API Client (`lib/api/client.ts`)

A single Axios instance wrapped by `ApiClient`:

- `baseURL` = `NEXT_PUBLIC_API_URL` (default `libraryapi.codevertexitsolutions.com`); paths are built as `/api/v1/{orgSlug}/library/…`.
- **Request interceptor:** attaches `Authorization: Bearer <token>`; sends `X-Tenant-ID`/`X-Tenant-Slug` (suppressed for platform owners) and `X-Outlet-ID`; drops the JSON `Content-Type` for `FormData` (multipart e-book/cover uploads).
- **Response interceptor:**
  - **401** → attempt a single token refresh (`token-refresh.ts`) and retry; on failure run the registered `on401` callback (clear caches + logout).
  - **403** with `code=subscription_inactive`/`upgrade=true` → fire the subscription-403 callback (the SubscriptionBanner/upgrade flow handles it).
  - **402** → fire the limit-reached callback (opens the limit-reached modal).
  - Normalises the real backend message onto `error.normalizedMessage` (blob-aware via `error-message.ts`), so toasts show the actual error, not a generic "Failed to …".
- Helpers: `get/post/put/patch/delete`, plus `getBlob`/`postBlob` for label PDFs and the token-gated e-book read stream.

---

## Data Fetching & Hooks Pattern

Every domain has a typed API module (`lib/api/*.ts`) and a TanStack Query hook layer (`hooks/use*.ts`):

| Domain | API module | Hook | Notes |
|--------|-----------|------|-------|
| Catalog | `catalog.ts` | `useCatalog.ts` | `useBibs`, `useBib`, `useIsbnLookup`, `useCreateBib`, `useUpdateBib`, `useDeleteBib`, `useCollections` |
| Copies | `copies.ts` | `useCopies.ts` | by-bib, by-barcode, create/update/delete, label PDF (Blob) |
| Circulation | `circulation.ts` | `useCirculation.ts` | `useCheckout`, `useReturn`, `useRenew`, `useLoans`, `useMemberLoans`; invalidates copies/bibs/reports on mutation |
| Holds | `holds.ts` | `useHolds.ts` | `usePlaceHold`, `useCancelHold` |
| Members | `members.ts` | `useMembers.ts` | members + `useMemberTiers`/`useCreateTier` + policies |
| Fines | `fines.ts` | `useFines.ts` | `useWaiveFine`, `usePayFine`, `useAssessMembershipFee` |
| E-books | `ebooks.ts` | `useEbooks.ts` | `useLendEbook`, `useSaveReadPosition`, upload |
| Reports | `reports.ts` | `useReports.ts` | `useLibrarySummary`, `usePopularTitles`, `useCirculationTrend` |
| RBAC | `rbac.ts` | `useRBAC.ts` | roles, permissions, team, assign |
| Branches | `branches.ts` | `useBranches.ts` | branch CRUD |

List responses are tolerated in both `{data,total}` envelope and bare-array forms (the API modules normalise).

---

## Global State (Zustand)

| Store | Purpose |
|-------|---------|
| `store/auth.ts` | Session (access/refresh tokens), `UserProfile` (roles, union permissions, `isPlatformOwner`/`isSuperUser`), `initialize`/`redirectToSSO`/`logout` |
| `store/outlet.ts` | Selected branch/outlet (persisted) |
| `store/outlet-filter.ts` | HQ "all outlets" filter |
| `store/subscription.ts` | Subscription snapshot (IndexedDB-backed gating) |
| `store/limit-modal.ts` | Plan-limit-reached modal state |

`branding-provider.tsx` resolves tenant branding (logo/colours) so the sidebar and theme are tenant-aware (semantic tokens, never hardcoded colours).

---

## Offline / PWA

- `next build --webpack` + `@ducanh2912/next-pwa` regenerate `sw.js` with native update detection (the platform `pwa_offline_uniform_pattern` — Turbopack silently kills next-pwa, so webpack is required).
- The shared `@bengo-hub/shared-ui-lib/offline` `OfflineBar` renders an offline/syncing ribbon + PWA updater, mounted in the client `AuthProvider`. It advertises offline-available actions ("Browse catalog", "View loans") and offline-disabled ones ("Checkout", "Returns", "Fine payments").
- `pwa-registration.tsx` + `pwa-update-banner.tsx` handle install + update prompts.

## Per-Tenant PWA Manifest

`app/[orgSlug]/layout.tsx` emits the manifest **server-side** via `generateMetadata` (`manifest: /{orgSlug}/manifest.webmanifest`), and `manifest.webmanifest/route.ts` renders the tenant-specific manifest (name, logo, `start_url=/{orgSlug}/`). This is the `pwa_tenant_manifest_fix` — server-side manifest, not client injection — so mobile installs capture the correct tenant.

---

## Styling & Theme

- **Tailwind 4** utility-first; **shadcn components on Base UI** (`components/ui/*` — `base.tsx`, `dialog.tsx`, `tabs.tsx`, `form.tsx`, `pagination.tsx`, `confirm-dialog.tsx`, `page.tsx`).
- **Default light theme** (`defaultTheme="light"`, `enableSystem={false}`) per platform rule — never system/dark by default.
- Branding-aware semantic tokens (`bg-sidebar`, `text-foreground`, `bg-primary`, …) — never hardcoded colours.
- Toasts via `sonner`; destructive actions go through `ConfirmDialog`.

## Dependencies (key)

Next 16.2, React 19.2, TanStack Query 5, Zustand 5, axios, `@bengo-hub/shared-ui-lib`, `@ducanh2912/next-pwa`, `epubjs` + `react-reader` (EPUB), `react-pdf` (PDF), `html5-qrcode` (barcode scanning), `recharts`, `sonner`, `zod` + `react-hook-form`.
