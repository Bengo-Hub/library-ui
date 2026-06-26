# Sprint 07 — E-book Reader, Purchase & Download UI

**Status:** ✅ Shipped
**Goal:** Build the in-browser e-book reader (PDF + EPUB) backed by a CDL lend token, with a per-page watermark and reading-position persistence, plus the Phase-2 Buy + secured-download surface.

---

## Scope

The patron-facing reading + purchase experience. Readers are client-only (pdf.js / epub.js touch `window`).

---

## Task Checklist

### API + hooks
- [x] `lib/api/ebooks.ts` + `hooks/useEbooks.ts` — `useEbooks`, `useEbook`, `useLendEbook`, `useSaveReadPosition`, `useUploadEbook`; `purchase` + `download` client functions (Phase 2).
- [x] `getBlob` read-stream for the token-gated session.

### Reader (`ebooks/[id]/read/page.tsx`)
- [x] Borrow → `useLendEbook` (`POST /ebooks/{id}/lend`) returns a short-lived `access_token`; `409 cdl_limit` prompts "place a hold".
- [x] Format-routed readers via `dynamic(..., { ssr: false })`: `PdfReader` (`react-pdf`/pdf.js) + `EpubReader` (`epubjs`/`react-reader`).
- [x] Per-page **watermark** overlay (`Watermark`) stamping borrower id + time.
- [x] Reading-position persistence (`useSaveReadPosition` → `POST /ebooks/loans/{id}/position`); session resumes where left off.

### Purchase / download (Phase 2)
- [x] **Buy** button → `purchase` (`POST /ebooks/{id}/purchase`) → redirect to the treasury pay page via `initiate_url`.
- [x] Secured **download** of a paid purchase → `download` (`GET /ebooks/{id}/download?token=`) returning the file location.

### Components
- [x] `components/library/ebook/PdfReader.tsx`, `EpubReader.tsx`, `CoverThumb.tsx`, `AvailabilityBadge.tsx`.

---

## Acceptance Criteria

- [x] Borrowing opens a watermarked reader; reaching the CDL cap prompts a hold.
- [x] PDF and EPUB both render; reading position persists across sessions.
- [x] Buy creates a purchase intent and hands off to treasury; download works after payment.
- [x] Readers never SSR (client-only dynamic import).

---

## Dependencies

- Sprint 04 (e-book shelf), Sprint 06 (members), library-api Sprint 06 (CDL) + Sprint 08 (purchase/download).
