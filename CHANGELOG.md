# Changelog

All notable changes to library-ui will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Phase 2)
- E-book purchase flow + secured (token-gated) download UI.
- Membership-fee + dunning surfaces.
- Reports: popular-titles + circulation-trend charts wired to new backend endpoints.
- Catalog authority pickers (authors/publishers/subjects) + cover upload.

## [0.1.0] — 2026-06-26 — Phase 1 MVP

### Added
- **Foundation:** Next 16 (App Router) + React 19 + TypeScript strict; Tailwind 4 + shadcn (Base UI); `[orgSlug]` tenant routing; default light theme.
- **Auth:** SSO/PKCE login + callback; token refresh; `AuthProvider` route protection (redirect-to-SSO, 403→`/unauthorized`); logout posts to the SSO server session; `/auth/me` RBAC bootstrap via `useMe`.
- **API layer:** `ApiClient` (Axios) with JWT/tenant/outlet headers, FormData multipart, 401 refresh, 403 subscription + 402 limit hooks, blob-aware error normalisation, `getBlob`/`postBlob`; per-domain API modules + TanStack Query hooks (catalog, copies, circulation, holds, members, fines, ebooks, reports, rbac, branches); Zustand stores (auth, outlet, outlet-filter, subscription, limit-modal).
- **Layout:** branding-aware sidebar with collapsible nav groups + Platform group (owner-only); header, branch/outlet filter, theme toggle; branding provider.
- **Pages:** dashboard, catalog (OPAC) + bib detail, cataloging (ISBN lookup), copies & holdings (barcode + label PDF), circulation desk (scan checkout/return/renew + in-house), holds, members + detail, member tiers, loan policies, fines (waive/pay-via-treasury), e-books shelf + in-browser reader (PDF/EPUB, CDL lend, watermark, position save), branches, settings, team & roles, reports, platform admin, auth callback + select-outlet, unauthorized + not-found.
- **PWA:** `next build --webpack` + `@ducanh2912/next-pwa` (regenerated `sw.js`); per-tenant server-side manifest (`generateMetadata` + `manifest.webmanifest/route.ts`); shared `OfflineBar` with offline-available vs disabled action lists.
- **Components:** `BibForm`/`BibPicker`, `CopyFormDialog`, `MemberFormDialog`/`MemberPicker`, `BarcodeScanner`, `CoverThumb`, `AvailabilityBadge`, ebook `PdfReader`/`EpubReader`, subscription banner + limit modal, PWA registration/update banner, shadcn-on-Base-UI primitives.
