# Sprint 09 — Advanced OPAC, Kiosk & UX Hardening (Phase 3/4)

**Status:** ⏳ Planned
**Goal:** Deliver the Phase-3/4 frontend: faceted OPAC filters, self-checkout kiosk mode, an offline staff desk, accessibility/responsive hardening, and a patron self-service portal.

---

## Scope

The forward-looking UI work that pairs with backend Sprints 09–10 (advanced OPAC/MARC, RFID/self-checkout, dunning, notifications).

---

## Task Checklist

### Faceted OPAC
- [ ] Facet sidebar (author / subject / collection / format / language / availability / year) wired to `GET /catalog/search` + `/catalog/facets`.
- [ ] Typeahead + fuzzy search; ranked results; result-count + active-filter chips.
- [ ] Authority pickers (authors/publishers/subjects) in cataloging; cover-upload UI.
- [ ] MARC import/export surfaces (upload a `.mrc`, export a bib).

### Self-checkout kiosk
- [ ] Kiosk mode route (full-screen, simplified) for member self-identify → RFID/barcode bulk checkout/return.
- [ ] Receipt summary + "you're all set" confirmation; idle reset.

### Offline staff desk
- [ ] Deep offline circulation: queue checkout/return with a `client_reference`/Idempotency-Key; background sync on reconnect; conflict/dead-letter surfacing.
- [ ] Offline cache of recent members/copies for the desk.

### Patron portal
- [ ] Member self-service: my loans / holds / fines, renew, place hold, read borrowed e-books.
- [ ] Membership renewal + fee payment flow.

### Accessibility & responsive hardening
- [ ] 44px minimum touch targets across interactive controls.
- [ ] `prefers-reduced-motion` respected for animations.
- [ ] `aria-sort` on sortable tables; full keyboard nav + visible focus rings.
- [ ] Tablet/mobile layouts for the desk + reader; high-contrast verification (≥4.5:1).

### Notifications & dunning surfaces
- [ ] Overdue/hold-ready/fee-due notification preferences.
- [ ] Membership-fee dunning status surfaced on member detail.

---

## Acceptance Criteria

- [ ] OPAC search is faceted, fast, and availability-aware.
- [ ] A patron completes self-checkout at a kiosk without staff.
- [ ] The desk operates offline and syncs exactly-once on reconnect.
- [ ] WCAG-aligned: targets, motion, keyboard, contrast, aria-sort.
- [ ] Patrons self-serve loans/holds/fines/renewals.

---

## Dependencies

- Sprint 08 (management surfaces), library-api Sprint 09 (faceted OPAC/MARC/reports) + Sprint 10 (RFID/self-checkout, dunning, notifications).
