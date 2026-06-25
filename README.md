# Lingua

Lingua adalah platform SaaS multi-tenant untuk UMKM Indonesia — restoran, toko retail, dan bisnis jasa. Setiap bisnis mendapatkan katalog digital berbasis QR/link, keranjang pesanan, manajemen staff, dan dashboard penjualan dari satu deployment.

## Status

Production-ready foundation:

- Landing page, login, register (Supabase Auth)
- Owner dashboard shell + route groups `(dashboard)`, `(staff)`, `(platform)`, `(public)`
- Katalog publik via `/r/[slug]` (QR/link)
- Staff inbox
- Platform admin panel
- shadcn-svelte component library (copy-owned, Tailwind v4)
- PostgreSQL + Redis lokal via Podman/Docker
- Multi-tenant RLS baseline

Backend database/cache services now run locally with Podman (rootless by default; Docker also supported). The repo includes SQL migrations, demo seed data, a PostgreSQL access layer, Redis health integration, and a database-backed tenant resolver with mock fallback for local development. Production auth, CRUD persistence beyond tenant/menu bootstrap, and AI/OCR integrations are still not implemented.

## Tech Stack

- SvelteKit + Svelte 5 + TypeScript.
- Tailwind CSS v4 design tokens.
- pnpm.
- Vitest.
- Playwright.
- `@lucide/svelte` icons.
- `pg` for server-side PostgreSQL access.
- `redis` for server-side Redis access.

Planned backend:

- Local development: PostgreSQL + Redis via Podman (or Docker — auto-detected).
- Production path: Supabase Auth/RLS/Storage/Realtime can replace or complement the local stack later.
- Provider adapters for LLM, OCR, WhatsApp, telemetry.

## Documentation Map

- `docs/PRD_Lingua.md`: Product requirements, critique, MVP scope, metrics, risks, and roadmap.
- `docs/Technical_Specification.md`: SvelteKit-first stack, architecture, data model, APIs, performance, security, and testing.
- `docs/ARCHITECTURE.md`: Engineering boundaries, SvelteKit rules, dependency policy, and workflow rules.
- `docs/DESIGN_SYSTEM.md`: Visual direction, color, typography, layout, components, and UI states.
- `docs/TODO.md`: Current implementation plan and completion status.
- `docs/CONTEXT.md`: Domain context and decisions for future agents.
- `docs/COMPLETE-TODO.md`: Completed work log.
- `AGENTS.md`: Project-specific instructions for coding agents.

## Run Locally

```sh
pnpm install
pnpm run dev
```

Local infrastructure:

```sh
pnpm infra:doctor   # verify podman/docker + machine status
pnpm infra:up       # start postgres + redis (detached)
pnpm db:migrate
pnpm db:seed
```

`pnpm infra:*` scripts use a runtime-agnostic wrapper (`scripts/infra.mjs`) that prefers Podman and falls back to Docker. Override with `CONTAINER_RUNTIME=docker pnpm infra:up` if needed. On Windows, run `podman machine start` once before the first `pnpm infra:up` (the machine auto-stops on reboot). On Windows/WSL2 use `127.0.0.1` (not `localhost`) untuk `DATABASE_URL` / `REDIS_URL`.

Environment:

```sh
copy .env.example .env
```

Isi `SUPABASE_SERVICE_ROLE_KEY` dari Supabase dashboard → Settings → API → service_role key.

## Test Credentials (Supabase Auth)

Buat akun lewat `/register` atau seed langsung ke Supabase Auth:

| Role           | Email                 | Password  | Keterangan                      |
| -------------- | --------------------- | --------- | ------------------------------- |
| Owner          | owner@test.lingua.app | Test1234! | Owner Warung Sari, 1 outlet     |
| Staff          | staff@test.lingua.app | Test1234! | Staff Warung Sari               |
| Platform Admin | admin@test.lingua.app | Test1234! | Super admin, akses semua tenant |

Seed credentials ke Supabase:

```sh
pnpm db:seed
```

Script seed ada di `scripts/seed.ts`. Untuk reset dan seed ulang:

```sh
pnpm db:reset
```

## Useful Routes

- `/` — landing page
- `/register` — daftar akun baru (Supabase Auth)
- `/login` — masuk
- `/dashboard` — owner dashboard
- `/staff/inbox` — staff pesanan inbox
- `/platform` — platform admin (super_admin only)
- `/r/[slug]` — katalog publik pelanggan (scan QR)

## Quality Commands

```sh
pnpm check
pnpm run test:unit -- --run
pnpm build
pnpm run test:e2e
```

Database/RLS tests are opt-in because they require the local container runtime, migrations, and seed data:

```sh
$env:RUN_DB_TESTS='true'; pnpm run test:unit -- --run src/lib/server/repositories/tenant-repository.db.test.ts
```

If Playwright browsers are missing:

```sh
pnpm exec playwright install chromium
```

## Build Order

1. Frontend prototype with mock data. Done.
2. Backend foundation with PostgreSQL schema, RLS baseline, Redis health, tenant repositories, auth, storage, and realtime.
   Current local-first bridge uses Podman (rootless) PostgreSQL + Redis before managed services.
3. AI/RAG layer with mocked provider first, then real provider.
4. OCR import and admin review workflow.
5. Pilot readiness and operational checks.

## Quality Bar

- Public customer routes must be fast on mobile.
- UI must work on small phones, tablets, desktop, and in-app browsers.
- Tenant context must be explicit: organization, restaurant, optional location, and table.
- QR links must resolve restaurant and table together.
- Dashboard/staff routes must read tenant context from server load, not a trusted browser global.
- AI must not invent ingredients, allergen safety, halal status, prices, or availability.
- Tenant isolation must be tested before any pilot.
- Domain logic should stay outside Svelte components.
