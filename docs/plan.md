# Library UI - Plan

**Last updated:** 2026-06-26
**Framework:** Next.js 16 (App Router) + React 19 + TypeScript
**Styling:** Tailwind CSS 4 + shadcn (on Base UI)
**Backend:** library-api (`libraryapi.codevertexafrica.com`, port 4010)
**Auth:** SSO via auth-ui (OIDC/OAuth2 + PKCE)

---

## Current State (2026-06-26)

library-ui is **fully implemented for Phase 1**. Every page is data-integrated against library-api, SSO/PKCE login + RBAC bootstrap (`/auth/me`) is wired, the circulation desk is scan-driven, the in-browser e-book reader (PDF/EPUB + CDL) works, PWA + per-tenant manifest are in place, and the subscription gate (mutations-only on the backend; 403/402 handling on the client) is hooked up.

The frontend roadmap is aligned 1:1 to the backend phases.

---

## Phase 1 — MVP (shipped)

### Foundation
| # | Task | Status |
|---|------|--------|
| 1 | Next 16 app, `[orgSlug]` tenant routing, Tailwind 4 + shadcn(Base UI), default light theme | ✅ Done |
| 2 | SSO/PKCE login + callback; logout posts to SSO server session | ✅ Done |
| 3 | Shared `apiClient` (Axios) with JWT/tenant/outlet headers + 401 refresh + 403/402 hooks | ✅ Done |
| 4 | TanStack Query hook layer per domain; Zustand auth/outlet/subscription stores | ✅ Done |
| 5 | `useMe` RBAC bootstrap; permission-aware sidebar; 403→`/unauthorized` | ✅ Done |
| 6 | PWA (`next build --webpack` + next-pwa) + per-tenant server-side manifest + OfflineBar | ✅ Done |
| 7 | Branding provider (tenant logo/colours, semantic tokens) | ✅ Done |

### Pages
| # | Page | Status |
|---|------|--------|
| 8 | Dashboard (summary KPIs + recent activity) | ✅ Done |
| 9 | Catalog (OPAC) browse + search + bib detail | ✅ Done |
| 10 | Cataloging (create/edit bibs, ISBN lookup) | ✅ Done |
| 11 | Copies & holdings (barcode, status, label PDF) | ✅ Done |
| 12 | Circulation desk (scan checkout/return/renew, in-house) | ✅ Done |
| 13 | Holds queue | ✅ Done |
| 14 | Members + member detail; tiers; loan policies | ✅ Done |
| 15 | Fines (waive + pay-via-treasury) | ✅ Done |
| 16 | E-books shelf + in-browser reader (PDF/EPUB + CDL, watermark) | ✅ Done |
| 17 | Branches; settings | ✅ Done |
| 18 | Team & roles (RBAC) | ✅ Done |
| 19 | Reports / analytics | ✅ Done |
| 20 | Platform admin (platform owner only) | ✅ Done |

---

## Phase 2 — E-book purchase/download + notifications (planned)

| # | Task | Status |
|---|------|--------|
| 1 | E-book purchase flow (checkout → treasury pay page → owned copy) | ⏳ Planned |
| 2 | Secured download (token-gated) + download UI | ⏳ Planned |
| 3 | Membership-fee + dunning surfaces (assess, remind, status) | ⏳ Planned |
| 4 | Notifications preferences surface | ⏳ Planned |
| 5 | Reports: popular titles + circulation trend charts (recharts) wired to new endpoints | ⏳ Planned |
| 6 | Catalog authority pickers (authors/publishers/subjects) + cover upload | ⏳ Planned |

## Phase 3 — Advanced OPAC / MARC

- Faceted OPAC (subject/author/collection/availability facets); MARC import/export surfaces; authority management.

## Phase 4 — RFID / self-checkout

- Self-checkout kiosk surface; offline PWA staff desk (deep offline circulation); inter-branch transfer/stocktake UI.

---

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router) | React 19, React Compiler |
| Language | TypeScript | Strict |
| Styling | Tailwind 4 + shadcn (Base UI) | Default light theme |
| State (global) | Zustand 5 | Auth, outlet, subscription |
| State (server) | TanStack Query v5 | Caching, mutations, invalidation |
| API client | Axios (`ApiClient`) | JWT/tenant/outlet headers, 401 refresh, 403/402 hooks |
| Auth | OIDC/PKCE via auth-ui | `lib/auth/*` |
| PWA | `@ducanh2912/next-pwa` (webpack build) | Per-tenant manifest, OfflineBar |
| Reader | `react-pdf` (PDF), `epubjs`/`react-reader` (EPUB) | Client-only, watermark overlay |
| Scanning | `html5-qrcode` | Barcode scan at the desk |
| Charts | `recharts` | Reports |
| Forms | `react-hook-form` + `zod` | Validation |

---

## Constraints

- **By-reference data:** the UI never assumes it owns patron PII — it renders what `/members` returns (auth/CRM are SoT).
- **Mutations gated:** write actions can be blocked by the backend subscription gate (403 `subscription_inactive`) → upgrade flow; plan limits → 402 limit modal.
- **CDL, not download (Phase 1):** the e-book reader streams a token-gated session; full download is Phase 2.

---

## DevOps file locations (reference only)

| Asset | Location |
|-------|----------|
| Build script | `library-ui/build.sh` |
| Dockerfile | `library-ui/Dockerfile` |
| Deploy workflow | `library-ui/.github/workflows/deploy.yml` |
| Helm values | `devops-k8s/apps/library-ui/values.yaml` |

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| library-api deployed | Required | All data comes from the API |
| auth-ui SSO/PKCE | Required | Login/logout |
| shared-auth-client JWKS | Required | Token validation |
| `@bengo-hub/shared-ui-lib` | Available | OfflineBar + shared UI |
