# Sprint 06 — Members, Tiers, Policies & Fines UI

**Status:** ✅ Shipped
**Goal:** Build the patron management surfaces (members list/detail with loans + fines tabs, member tiers, loan policies) and the fines workflow (waive with ConfirmDialog, pay via treasury initiate URL, membership fees).

---

## Scope

The "who borrows and what they owe" pages.

---

## Task Checklist

### API + hooks
- [x] `lib/api/members.ts` + `hooks/useMembers.ts` — `useMembers`, `useMember`, `useCreateMember`, `useUpdateMember`, `useMemberTiers`, `useCreateTier`, `useUpdateTier`, loan-policies (`useLoanPolicies`, `useCreatePolicy`).
- [x] `lib/api/fines.ts` + `hooks/useFines.ts` — `useFines`, `useMemberFines`, `useWaiveFine`, `usePayFine`, `useAssessMembershipFee`.

### Members (`members/page.tsx`, `members/[id]/page.tsx`)
- [x] Registry list with search / status / tier filters; register/edit via `MemberFormDialog` (auth `user_id` + marketflow `crm_contact_id` refs; walk-in support).
- [x] `MemberPicker` for selecting members from other surfaces.
- [x] Member detail tabs: **Loans** (`useMemberLoans`), **Fines** (`useMemberFines`), holds.

### Tiers & policies (`members/tiers/page.tsx`, `members/policies/page.tsx`)
- [x] Member tiers CRUD (loan limit/period/renewals, hold + e-book limits, daily fine rate, fine-block threshold, annual fee).
- [x] Loan policies CRUD (period, renewals, holdable, fine/day, grace days).

### Fines (`fines/page.tsx`)
- [x] List with status / member filters.
- [x] **Waive** via `ConfirmDialog` (audited) → `POST /fines/{id}/waive`.
- [x] **Pay** → `POST /fines/{id}/pay` → redirect to the shared treasury pay page via `initiate_url`.
- [x] Membership-fee assessment (`useAssessMembershipFee`).

---

## Acceptance Criteria

- [x] Members can be registered/edited and their loans + fines viewed in one place.
- [x] Tiers and policies are editable and feed circulation rules.
- [x] Waiving a fine requires confirmation and is recorded; paying hands off to treasury.

---

## Dependencies

- Sprint 03 (auth), Sprint 05 (circulation context), library-api Sprint 05/06 (members/tiers/policies + fines).
