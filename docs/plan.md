# Library UI - Plan

**Last updated:** 2026-09-02
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

## Recent hardening (2026-09-02, client-reported fixes)

See `library-api/docs/plan.md`'s matching section + `.claude/memory/project_library_management.md`
Session 18 for full detail. UI-side highlights:

- **Cataloging autosave**: `BibForm` (new-title entry) now autosaves to IndexedDB (Dexie,
  `lib/db/library-db.ts`), mirroring pos-ui's proven `sale-sessions`/`useSaleSessions` "Sale tabs"
  resume-after-reload pattern — offers to restore an in-progress title (including a picked cover
  image) after a dropped connection, crash, or accidental navigation.
- **Scanner-safe forms**: `BibForm` was the only component in the app with a native `<form>` — a
  keyboard-wedge barcode scanner's trailing Enter could submit/save an incomplete title from any
  field except the ISBN one. Fixed with one centralized `onKeyDown` guard.
- **Barcode search**: Catalog OPAC and Copies & Holdings search bars now use the existing
  `ScannerInput` component (autofocus + Enter-submit + camera fallback) instead of a plain `<input>`
  that only worked once manually clicked into.
- **Acquisition date**: `CopyFormDialog`'s date now defaults to the last value a staff member
  deliberately set (localStorage, per tenant) instead of always resetting to today, so a shipment
  catalogued across several real days keeps one shared date; a "Set acquisition date" bulk action was
  added to Copies & Holdings for correcting already-mis-dated copies; the "Mark Received" dialog on a
  Purchase Order now collects branch/shelf/date instead of silently defaulting them.

## Title/copy field sharing + dropdown stickiness (2026-09-22)

`BibForm` (the title form) and `CopyFormDialog` (the per-copy form) were analyzed for info that's
really a property of the TITLE but was being re-entered on every physical copy, plus dropdowns that
reset to a blank/generic default on every open instead of remembering the last real choice:

- **Call number moved to the title, as a default (not a duplicate)**: `BibForm` gained a "Call
  number" field (backend `BibRecord.lc_call_number` — previously written by nothing, see
  `library-api/docs/plan.md`'s matching entry). It is NOT the authoritative per-copy value (that
  stays on `BookCopy.call_number`, still freely editable per copy — different copies can still be
  reclassified/reshelved independently) — it's the value a NEW copy of that title starts with.
  `CopyFormDialog` prefills a new copy's call number from it (`bibCallNumber` prop, wired from the
  already-loaded `bib` on the per-title Copies & Holdings page); library-api's `CreateCopy` and the
  Purchase Order `ReceiveLine` batch-create also fall back to it server-side, so a 5-copy shipment or
  a 20-copy PO receive doesn't need the same call number retyped once per copy.
- **Dropdown "remembers last choice" extended app-wide across both forms**: previously only Place of
  publication (`BibForm`) and Acquisition date (`CopyFormDialog`) had this. Now also sticky (per
  tenant, create-mode only — editing an existing title/copy always shows its own saved values):
  `BibForm` Format, Language, Publisher, Collection; `CopyFormDialog` Branch, Status, Shelf location.
  Each remembered value is only used if it's still valid (still exists in the current
  branches/collections/languages list) — a deleted branch or collection can't silently haunt future
  copies. The three near-identical hand-rolled localStorage get/set pairs this repo had accumulated
  were consolidated into one shared `lib/lastSelected.ts` (same on-disk key format, so an existing
  staff member's browser keeps whatever it already remembered).

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
