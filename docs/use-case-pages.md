# Library UI — Page-by-Page Map

Every page lives under `src/app/[orgSlug]/`. Each entry lists the page's API hooks (`src/hooks/use*.ts`, backed by `src/lib/api/*.ts`) and its core workflows. Pages are gated by the union RBAC bootstrapped from `GET /auth/me` (`useMe`).

---

## Dashboard — `page.tsx`
- **Hooks:** `useLibrarySummary` (`useReports`).
- **Workflow:** Renders `GET /reports/summary` KPI cards (active loans, overdue, holds ready/waiting, members, titles, copies) + a recent-activity feed. Outlet-aware welcome.

## Catalog / OPAC — `catalog/page.tsx`, `catalog/[id]/page.tsx`
- **Hooks:** `useBibs`, `useBib`, `useCollections` (`useCatalog`); `useCopiesByBib` (`useCopies`); `usePlaceHold` (`useHolds`).
- **Workflow:** Browse + search bibs (`?q=`, `?format=`); bib detail shows copies, per-copy status/availability, and a place-hold action. Cover thumbnails via `CoverThumb`.

## Cataloging — `cataloging/page.tsx`
- **Hooks:** `useBibs`, `useCreateBib`, `useUpdateBib`, `useDeleteBib`, `useIsbnLookup` (`useCatalog`).
- **Components:** `BibForm`, `BibPicker`.
- **Workflow:** Staff create/edit bibs with ISBN-lookup pre-fill; MARC-lite / Dublin Core-aware fields. Sensitive deletes via ConfirmDialog.

## Copies & Holdings — `copies/page.tsx`
- **Hooks:** `useCopies` (list/by-barcode/create/update/delete/label) via `useCopies` hooks.
- **Components:** `CopyFormDialog`, `BarcodeScanner`.
- **Workflow:** Manage physical copies (barcode, accession no, call number, shelf, status); resolve-by-barcode; generate the spine **label PDF** (`/catalog/copies/{id}/label.pdf`, Blob).

## Circulation Desk — `circulation/page.tsx`
- **Hooks:** `useCheckout`, `useReturn`, `useRenew`, `useLoans` (`useCirculation`); `useMembers`; `useDebounce`.
- **Components:** `CapsuleTabs`, `BarcodeScanner`.
- **Workflow:** Capsule-tab Checkout/Return. Checkout: pick/scan member → scan copy barcode → optional in-house toggle → `POST /circulation/checkout`; toasts show due date + warnings. Return: scan copy → `POST /circulation/return`; overdue fine + hold-ready surface as toasts. Inline renew on recent loans. Mutations invalidate copies/catalog/reports queries.

## Holds — `holds/page.tsx`
- **Hooks:** `useHolds`, `usePlaceHold`, `useCancelHold`.
- **Workflow:** Holds queue with status filter; place a hold on a bib; cancel (ConfirmDialog) → `DELETE /holds/{id}`.

## Members — `members/page.tsx`, `members/[id]/page.tsx`
- **Hooks:** `useMembers`, `useMember`, `useCreateMember`, `useUpdateMember`; `useMemberLoans` (`useCirculation`); `useMemberFines` (`useFines`).
- **Components:** `MemberFormDialog`, `MemberPicker`.
- **Workflow:** Registry list (search/status/tier filters); register/edit members (auth `user_id` + marketflow `crm_contact_id` refs; walk-in). Member detail tabs: loans, fines, holds.

## Member Tiers — `members/tiers/page.tsx`
- **Hooks:** `useMemberTiers`, `useCreateTier`, `useUpdateTier` (`useMembers`).
- **Workflow:** Define borrowing entitlements (loan limit/period/renewals, hold + e-book limits, daily fine rate, fine-block threshold, annual fee).

## Loan Policies — `members/policies/page.tsx`
- **Hooks:** `useLoanPolicies`, `useCreatePolicy` (`useMembers`).
- **Workflow:** Reusable circulation policies (loan period, renewals, holdable, fine/day, grace days).

## Fines — `fines/page.tsx`
- **Hooks:** `useFines`, `useWaiveFine`, `usePayFine`, `useAssessMembershipFee`.
- **Workflow:** List with status/member filters; **waive** (ConfirmDialog, audited) → `POST /fines/{id}/waive`; **pay** → `POST /fines/{id}/pay` creates a treasury intent and redirects to the shared pay page via `initiate_url`.

## E-books — `ebooks/page.tsx`, `ebooks/[id]/read/page.tsx`
- **Hooks:** `useEbooks`, `useEbook`, `useLendEbook`, `useSaveReadPosition`, `useUploadEbook`.
- **Components:** `PdfReader`, `EpubReader` (client-only), watermark overlay.
- **Workflow:** Digital shelf; borrowing triggers a CDL **lend** (token + expiry; 409 `cdl_limit` → place a hold). The reader streams the token-gated session, stamps a per-page watermark, and persists reading position. No download (Phase 1).

## Reports — `reports/page.tsx`
- **Hooks:** `useLibrarySummary`, `usePopularTitles`, `useCirculationTrend` (`useReports`).
- **Workflow:** Summary + popular-titles + circulation-trend (recharts). (Popular/trend endpoints are Phase-2; the page degrades gracefully.)

## Branches & Settings — `settings/branches/page.tsx`, `settings/page.tsx`
- **Hooks:** `useBranches` (CRUD).
- **Workflow:** Branch management (code, address, opening hours, default); general settings.

## Team & Roles — `team/page.tsx`
- **Hooks:** `useRoles`, `useAllPermissions`, `useTeam`, `useAssignRole` (`useRBAC`).
- **Workflow:** List provisioned library users, view roles + the permission catalog (`library.{module}.{action}`), assign roles → `PUT /team/{user_id}/roles`.

## Platform Admin — `platform/page.tsx`
- **Gating:** platform owner only (`isPlatformOwner`).
- **Workflow:** Cross-tenant administration surface.

## Auth & Outlet — `auth/callback/page.tsx`, `auth/select-outlet/page.tsx`
- **Workflow:** OIDC/PKCE callback (token exchange + `fetchLibraryProfile`); branch/outlet selection (HQ users get a picker + "all outlets"; assigned staff auto-select).

## Supporting routes
- `manifest.webmanifest/route.ts` — per-tenant PWA manifest (server-rendered).
- `healthz/route.ts` — liveness; `api/subscription/route.ts` — subscription snapshot; `unauthorized/page.tsx` — 403; `not-found.tsx` — 404.
