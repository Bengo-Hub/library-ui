# Sprint 05 — Circulation Desk & Holds UI

**Status:** ✅ Shipped
**Goal:** Build the scan-driven circulation desk (member → copy checkout/return/renew/in-house) and the holds surface (place/cancel/queue), with recent-loans context.

---

## Scope

The core staff operational page — designed for rapid barcode-scan flow at the desk.

---

## Task Checklist

### API + hooks
- [x] `lib/api/circulation.ts` + `hooks/useCirculation.ts` — `useCheckout`, `useReturn`, `useRenew`, `useLoans`, `useMemberLoans`; mutations invalidate copies/catalog/reports queries.
- [x] `lib/api/holds.ts` + `hooks/useHolds.ts` — `useHolds`, `usePlaceHold`, `useCancelHold`.
- [x] `hooks/useDebounce.ts` for member search.

### Circulation desk (`circulation/page.tsx`)
- [x] `CapsuleTabs` toggle Checkout / Return.
- [x] **Member step (checkout):** debounced member search (`useMembers`, active) or scan membership via `BarcodeScanner`.
- [x] **Copy step:** scan/enter copy barcode; **in-house** toggle for reference sessions.
- [x] Checkout → toast with due date; backend warnings surface as warning toasts; field clears for the next scan.
- [x] Return → overdue-fine warning toast (amount) + hold-ready info toast when triggered.
- [x] Recent-loans panel with inline **renew** (renew-limit / waiting-hold errors surface as toasts).
- [x] Real backend error messages via `apiErrorMessage`.

### Holds (`holds/page.tsx`)
- [x] Holds queue list with status filter; place a hold on a bib; cancel via `ConfirmDialog` → `DELETE /holds/{id}`.

---

## Acceptance Criteria

- [x] A full checkout (scan member → scan copy → confirm) completes without leaving the keyboard/scanner.
- [x] Returns surface fines and triggered holds clearly.
- [x] Renew respects backend limits with actionable toasts.
- [x] Holds can be placed and cancelled; the queue reflects status.

---

## Dependencies

- Sprint 03 (auth), Sprint 04 (members/copies present), library-api Sprint 05 (circulation engine + holds).
