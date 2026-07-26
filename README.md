# Library UI

Codevertex Library Management System frontend — the OPAC, cataloging, circulation desk, members + fines, and the in-browser e-book reader for `library-api`. Next.js 16 (App Router) + React 19, multi-tenant via `[orgSlug]`, SSO/PKCE auth, PWA-enabled.

## Highlights

- **OPAC + cataloging** — browse/search bibs, ISBN lookup, copies & holdings with barcode + spine-label PDFs.
- **Scan-driven circulation desk** — checkout/return/renew + in-house sessions + holds, with barcode scanning (`html5-qrcode`).
- **Members + money** — registry, tiers, loan policies; fines waive/pay (treasury pay page) and membership fees.
- **E-book reader** — token-gated in-browser PDF/EPUB reader (Controlled Digital Lending) with a per-page watermark and reading-position persistence.
- **Tenant-aware** — branding (logo/colours via semantic tokens), per-tenant PWA manifest, union RBAC sidebar gating.

## Stack

- Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, shadcn (on Base UI).
- Zustand (global state), TanStack Query v5 (server state), Axios (`ApiClient`).
- SSO/PKCE via auth-ui; `@bengo-hub/shared-ui-lib` (OfflineBar); `@ducanh2912/next-pwa`.
- `react-pdf` (PDF), `epubjs`/`react-reader` (EPUB), `html5-qrcode` (scanning), `recharts`, `sonner`, `react-hook-form` + `zod`.

## Dev

```bash
pnpm install
pnpm dev          # next dev
pnpm build        # next build --webpack  (webpack is required for next-pwa)
pnpm start
pnpm type-check   # tsc --noEmit
```

### Environment

| Var | Purpose | Default |
|-----|---------|---------|
| `NEXT_PUBLIC_API_URL` | library-api base | `https://libraryapi.codevertexafrica.com` |
| `NEXT_PUBLIC_SSO_URL` | auth-ui SSO base | `https://sso.codevertexafrica.com` |
| `NEXT_PUBLIC_SSO_CLIENT_ID` | OIDC client id | `library-ui` |
| `NEXT_PUBLIC_TENANT_SLUG` | optional default tenant | — |

> Never commit secrets — use env / deploy secrets and placeholders in tracked files.

## Project Layout

```
src/app/[orgSlug]/…   pages (dashboard, catalog, cataloging, copies, circulation,
                       holds, members[/tiers,/policies], fines, ebooks[/[id]/read],
                       reports, settings[/branches], team, platform)
src/lib/api/*.ts       typed API modules (apiClient + per-domain)
src/hooks/use*.ts      TanStack Query hooks per domain
src/store/*.ts         Zustand stores (auth, outlet, subscription, limit-modal)
src/providers/         AuthProvider, BrandingProvider
src/components/        sidebar, header, library/* (forms, pickers, ebook readers), ui/* (shadcn on Base UI)
docs/                  architecture, plan, ux-ui, use-case-pages, sprints
```

## Deploy

Deployed at `https://library.codevertexafrica.com`. CI on push to `main` (build.sh + Dockerfile + `.github/workflows/deploy.yml`; Helm values at `devops-k8s/apps/library-ui/values.yaml`).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — stack, auth/PKCE, apiClient + hooks, PWA, route map.
- [`docs/plan.md`](docs/plan.md) — roadmap aligned to backend phases.
- [`docs/ux-ui.md`](docs/ux-ui.md) — UX conventions, circulation desk + reader UX, accessibility.
- [`docs/use-case-pages.md`](docs/use-case-pages.md) — page-by-page map with hooks + workflows.
- [`docs/sprints/`](docs/sprints/) — sprint logs.
