# Sprint 08 — Dashboard, Reports, Team, Settings & Platform

**Status:** ✅ Shipped
**Goal:** Build the dashboard summary, the reports/analytics surface (recharts), the team RBAC matrix, branches + settings, the platform-owner views, and confirm PWA offline behaviour.

---

## Scope

The management + insight surfaces that round out the operational app.

---

## Task Checklist

### API + hooks
- [x] `lib/api/reports.ts` + `hooks/useReports.ts` — `useLibrarySummary`, `usePopularTitles`, `useCirculationTrend` (popular/trend back onto Phase-2 endpoints; degrade gracefully).
- [x] `lib/api/rbac.ts` + `hooks/useRBAC.ts` — `useRoles`, `useAllPermissions`, `useTeam`, `useUpdateRole`, `useAssignRole`.

### Dashboard (`[orgSlug]/page.tsx`)
- [x] Summary KPI cards from `GET /reports/summary` (active loans, overdue, holds ready/waiting, members, titles, copies) + recent-activity feed; outlet-aware welcome.

### Reports (`reports/page.tsx`)
- [x] Summary + popular-titles + circulation-trend (recharts), with skeletons + empty states.

### Team & roles (`team/page.tsx`)
- [x] List provisioned library users; render the permission matrix (`library.{module}.{action}`); assign roles → `PUT /team/{user_id}/roles`.

### Branches & settings (`settings/branches/page.tsx`, `settings/page.tsx`)
- [x] Branch CRUD (code, address, opening hours, default); general settings.

### Platform (`platform/page.tsx`)
- [x] Platform-owner-only cross-tenant administration view (gated by `isPlatformOwner`).

### PWA offline
- [x] OfflineBar advertises offline-available ("Browse catalog", "View loans") vs disabled ("Checkout", "Returns", "Fine payments") actions; install/update banners.

---

## Acceptance Criteria

- [x] Dashboard reflects live summary counts.
- [x] Reports render charts (and degrade where Phase-2 endpoints are absent).
- [x] Team roles can be assigned via the matrix; gating respects union RBAC.
- [x] Branches/settings are editable; platform view is owner-only.
- [x] Offline ribbon + install/update work.

---

## Dependencies

- Sprint 03 (RBAC), library-api Sprint 03/04 (`/reports/summary`, branches, team) + Sprint 09 (popular/trend endpoints).
