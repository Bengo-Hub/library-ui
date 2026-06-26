# Sprint 01 — Scaffold & Build Toolchain

**Status:** ✅ Shipped
**Goal:** Stand up the Next 16 / React 19 frontend skeleton with the platform's standard toolchain (Tailwind 4, shadcn on Base UI, Zustand, TanStack Query, axios), the PWA-capable build, and the design-token palette.

---

## Scope

The empty-but-correct app shell: it builds, lints, type-checks, produces a PWA service worker, and carries the full token system — before any page or API call exists.

---

## Task Checklist

### Project init
- [x] `package.json` — Next 16.2, React 19.2, TypeScript 5, scripts `dev`/`build`/`start`/`lint`/`type-check`.
- [x] Dependencies: `@tanstack/react-query` (+ devtools), `zustand`, `axios`, `@bengo-hub/shared-ui-lib`, `lucide-react`, `sonner`, `zod`, `react-hook-form`, `recharts`, `date-fns`, `clsx`/`tailwind-merge`/`class-variance-authority`.
- [x] Reader/scanner deps: `react-pdf`, `epubjs`, `react-reader`, `html5-qrcode`.
- [x] `tsconfig.json` (strict, path aliases `@/*`), `components.json` (shadcn on Base UI).

### Build & PWA
- [x] `next.config.ts` — `@ducanh2912/next-pwa` (`withPWAInit`) enabled for production; `build` script uses `next build --webpack` (Turbopack silently kills next-pwa).
- [x] Service worker regenerated on build; generated `sw.js` gitignored.
- [x] `babel-plugin-react-compiler` enabled.

### Styling & tokens (`app/globals.css`)
- [x] Tailwind 4 import + `@theme` token mapping.
- [x] `:root` light palette + `.dark` palette (background/foreground/card/primary/muted/border/ring).
- [x] Brand tokens (`--brand-primary/emphasis/contrast/muted/surface/dark`) + `--primary-dark`.
- [x] Sidebar tokens (`--sidebar`, `--sidebar-foreground`, `--sidebar-border`).
- [x] Micro-animation keyframes/utilities; `tabular-nums`; safe-area padding (`env(safe-area-inset-*)`).

### Container
- [x] `Dockerfile` + `build.sh` for the UI image.

---

## Acceptance Criteria

- [x] `pnpm dev` serves the app; `pnpm build` produces a PWA build with `sw.js`.
- [x] `pnpm type-check` passes (strict).
- [x] Light + dark token palettes resolve; brand tokens are overridable per tenant.

---

## Dependencies

- library-api reachable for later sprints (not required to build the shell).
