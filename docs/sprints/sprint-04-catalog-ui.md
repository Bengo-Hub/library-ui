# Sprint 04 — Catalog, Cataloging, Copies & E-book Shelf UI

**Status:** ✅ Shipped
**Goal:** Build the OPAC browse/detail surface, the staff cataloging workflow (ISBN scan auto-fill + cover upload), copies management (scan-in + label PDF), and the e-book shelf + upload.

---

## Scope

The "manage what the library owns" pages and their API/hook layers.

---

## Task Checklist

### API + hooks
- [x] `lib/api/catalog.ts` + `hooks/useCatalog.ts` — `useBibs`, `useBib`, `useIsbnLookup`, `useCreateBib`, `useUpdateBib`, `useDeleteBib`, `useCollections`.
- [x] `lib/api/copies.ts` + `hooks/useCopies.ts` — by-bib, by-barcode, create/update/delete, label PDF (Blob).
- [x] `lib/api/ebooks.ts` + `hooks/useEbooks.ts` — list/get/upload (+ Phase-2 purchase/download client functions).
- [x] `lib/api/branches.ts` + `hooks/useBranches.ts`.
- [x] Shared `lib/api/types.ts`; list responses normalised (`{data,total}` or bare array).

### Catalog / OPAC (`catalog/page.tsx`, `catalog/[id]/page.tsx`)
- [x] Browse + search bibs (`?q=`, `?format=`); cover thumbnails (`CoverThumb`).
- [x] Bib detail: copies list + per-copy status/availability (`AvailabilityBadge`) + place-hold action.

### Cataloging (`cataloging/page.tsx`)
- [x] Create/edit bibs via `BibForm`/`BibPicker`; **ISBN scan auto-fill** through `BarcodeScanner` → `useIsbnLookup` (OpenLibrary).
- [x] Cover upload (multipart) — Phase-2 endpoint anticipated; UI degrades gracefully.
- [x] Destructive delete via `ConfirmDialog`.

### Copies (`copies/page.tsx`)
- [x] Copies list + `CopyFormDialog`; scan-in via `BarcodeScanner`; resolve-by-barcode.
- [x] Generate the spine **label PDF** (`getBlob` → open/print).

### E-book shelf (`ebooks/page.tsx`)
- [x] Digital shelf list + e-book upload (multipart to the media PVC).

---

## Acceptance Criteria

- [x] Bibs are searchable/filterable; detail shows live copy availability.
- [x] Scanning an ISBN pre-fills a new bib from OpenLibrary.
- [x] Copies can be added by scan and produce a printable label.
- [x] E-books appear on the shelf and can be uploaded.

---

## Dependencies

- Sprint 03 (auth/RBAC), library-api Sprint 04 (catalog/copies/branches) + Sprint 06 (e-book registry).
