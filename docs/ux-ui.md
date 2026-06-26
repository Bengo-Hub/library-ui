# Library UI - UX/UI Specification

**Target users:** Librarians, circulation-desk staff, catalogers, library admins, and patrons.
**Device:** Desktop-first at the desk (responsive down to tablet/mobile for OPAC + reader).
**Design system:** shadcn (on Base UI) + Tailwind CSS 4, tenant-branding-aware, **default light theme**.

---

## Conventions

These platform-wide conventions (`ui_ux_design_standard`) apply throughout:

- **Capsule tabs** (`components/ui/tabs.tsx` `CapsuleTabs`) for mode/section switching (e.g. circulation Checkout/Return, member detail Loans/Fines/Holds).
- **Badges** for state — loan status (Active/Overdue/Returned), copy status (Available/On loan/Reserved), hold status (Waiting/Ready), fine status (Unpaid/Paid/Waived), e-book availability. Colour is never the sole signal — every badge carries a text label.
- **Semantic tokens, never hardcoded colours.** Sidebar/header/cards use `bg-sidebar`, `text-foreground`, `bg-primary`, `bg-accent`, etc. The branding provider injects the tenant's primary colour + logo, so the same components re-skin per tenant.
- **Sonner toasts** for all action feedback; the real backend message surfaces (via `apiErrorMessage`/`error.normalizedMessage`), not a generic "Failed to …".
- **ConfirmDialog** (`components/ui/confirm-dialog.tsx`) for destructive/sensitive actions (waive fine, cancel hold, delete copy, withdraw).
- **Skeletons + empty states** on every list/detail; loading shimmer matches content shape.

---

## Page UX Highlights

### Dashboard (`/[orgSlug]`)
At-a-glance operational health from `GET /reports/summary`: KPI cards (active loans, overdue, holds ready/waiting, members, titles, copies) + a recent-activity feed. Outlet-aware welcome.

### Circulation Desk (`/[orgSlug]/circulation`)
The core staff surface, designed for **scan-driven** flow:

- **Capsule tabs** toggle Checkout / Return mode.
- **Member step (checkout):** debounced member search (`useMembers`, `status=active`) or scan a membership barcode (`BarcodeScanner` → `html5-qrcode`).
- **Copy step:** scan/enter the copy barcode; an **in-house** toggle marks a reference/reading-room session.
- On checkout success: a toast shows the due date; backend warnings surface as warning toasts; the field clears for the next scan.
- On return: a fine (if overdue) surfaces as a warning toast with the amount; a triggered hold surfaces an info toast ("a waiting hold is now ready for pickup").
- A recent-loans panel offers inline **renew** (blocked toasts for renew-limit / waiting-hold).

### Catalog / OPAC (`/[orgSlug]/catalog`)
Browse + search bibs (title/ISBN/format); bib detail shows copies + availability + place-hold. Cover thumbnails via `CoverThumb`.

### Cataloging (`/[orgSlug]/cataloging`)
Staff create/edit bibs with **ISBN lookup** pre-fill (`useIsbnLookup`), `BibForm`/`BibPicker`, MARC-lite/Dublin Core-aware fields.

### Members (`/[orgSlug]/members`, `/members/[id]`)
Registry + `MemberFormDialog`/`MemberPicker`; member detail tabs for loans, fines, holds.

### Fines (`/[orgSlug]/fines`)
List with status filter; **waive** (ConfirmDialog, audited) and **pay** (creates a treasury intent and hands off to the shared pay page via `initiate_url`).

### E-book Reader (`/[orgSlug]/ebooks/[id]/read`)
- Borrowing triggers a **CDL lend** (`useLendEbook`) that returns a short-lived `access_token`; a 409 (`cdl_limit`) prompts "place a hold".
- The reader is **client-only** (`dynamic(..., { ssr: false })`) — `PdfReader` (`react-pdf`/pdf.js) or `EpubReader` (`epubjs`/`react-reader`) by format.
- A **per-page watermark overlay** stamps the borrower id + time (deters screenshots/redistribution).
- Reading progress persists (`useSaveReadPosition`) so the session resumes where the patron left off.
- No download in Phase 1 (CDL); Phase 2 adds purchase + secured download.

### Holds, Tiers, Policies, Branches, Team, Reports, Settings, Platform
Standard list/detail + dialog CRUD surfaces, each gated by permission via the `useMe` union RBAC.

---

## Navigation Structure (sidebar)

The sidebar (`components/sidebar.tsx`) uses collapsible `NavGroupSection`s with semantic tokens and the tenant logo; the Platform group is shown only to platform owners:

```
Overview
  └── Dashboard
Catalog
  ├── Catalog (OPAC)
  ├── Cataloging
  ├── Copies & Holdings
  └── eBooks
Circulation
  ├── Circulation Desk
  ├── Holds
  └── Fines
Patrons
  ├── Members
  ├── Member Tiers
  └── Loan Policies
Management (collapsed by default)
  ├── Reports
  ├── Branches
  ├── Team & Roles
  └── Settings
Platform (platform owner only)
  └── Platform Admin
```

---

## Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px (lg) | Static sidebar + content |
| < 1024px | Off-canvas sidebar (overlay + backdrop), hamburger in header |

---

## Offline & PWA UX

- The shared `OfflineBar` ribbon shows offline/syncing state and a PWA update prompt, with explicit lists of offline-available ("Browse catalog", "View loans") and offline-disabled ("Checkout", "Returns", "Fine payments") actions.
- Per-tenant install (name/logo/`start_url`) via the server-rendered manifest.

---

## Accessibility

- All interactive elements are keyboard-navigable; icon-only buttons carry ARIA labels.
- Colour is never the sole indicator (badges include text).
- Focus rings on focusable elements; capsule tabs expose `aria-expanded`/selected state.
- The reader respects format-native navigation (pdf.js / epub.js controls).
