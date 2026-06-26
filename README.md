# ainything

**Multi-tenant UMKM digital presence and order management platform.**

ainything adalah platform PWA + SaaS multi-tenant yang memberikan setiap UMKM — restoran, toko retail, dan bisnis jasa — katalog produk digital berbasis QR/link, sistem pemesanan, dashboard owner/staff, dan AI guest support — dari satu deployment.

Pembeli cukup scan QR atau buka link — tanpa login, tanpa install app.

## Status

Production-ready foundation for multi-tenant UMKM:

- **Multi-tenant architecture**: Organizations → Outlets → Products → Orders. Satu deployment untuk banyak tenant.
- **Public customer flow**: QR/link entry → catalog browse → cart → send order (tap-first, no login).
- **Owner dashboard**: Overview, catalog CRUD, order management, categories, team, settings, analytics.
- **Staff dashboard**: Real-time order queue via SSE, order detail with status transitions.
- **Platform admin**: Cross-tenant management, system monitoring.
- **AI guest support**: Provider-adapter pattern (Anthropic / OpenAI / TokenRouter), RAG with pgvector, dietary/allergen safety guardrails.
- **Design system v2.0 "Fresh Growth + Warm Hospitality"**: shadcn-svelte (copy-owned), Tailwind CSS v4, mobile-first.
- **Self-hosted infrastructure**: PostgreSQL 16 (pgvector) + Redis 7 via Podman/Docker.

## Tech Stack

- **Frontend**: SvelteKit + Svelte 5 (runes) + TypeScript
- **Styling**: Tailwind CSS v4 (`@theme`), shadcn-svelte components, lucide-svelte icons
- **Backend**: PostgreSQL 16 (pgvector) + Redis 7 + BullMQ
- **Auth**: Auth.js (NextAuth v5) — self-managed, no Supabase Auth
- **Storage**: Cloudflare R2
- **Validation**: Zod (shared server/client)
- **Testing**: Vitest (unit), Testing Library (components), Playwright (e2e)
- **LLM**: Provider adapter (Anthropic / OpenAI / TokenRouter) with RAG + guardrails
- **Deployment**: adapter-node → VPS (Hetzner) or Cloudflare Workers

## Documentation Map

- `docs/PRD_ainything.md` — Product requirements, scope, roadmap
- `docs/Technical_Specification.md` — Stack, data model, API, security, deployment
- `docs/ARCHITECTURE.md` — Module boundaries, tenant isolation, testing rules
- `docs/DESIGN_SYSTEM.md` — Design tokens, typography, component states
- `docs/CONTEXT.md` — One-page agent context
- `docs/TODO.md` — Phased implementation plan
- `docs/COMPLETE-TODO.md` — Completed work log
- `AGENTS.md` — Project-specific agent instructions

## Run Locally

```sh
pnpm install
pnpm run dev
```

Local infrastructure (PostgreSQL + Redis via Podman/Docker):

```sh
pnpm infra:doctor   # verify container runtime status
pnpm infra:up       # start postgres + redis (detached)
pnpm db:migrate     # apply all migrations
pnpm db:seed        # seed demo data
```

`pnpm infra:*` uses `scripts/infra.mjs` — prefers Podman, falls back to Docker.
Override: `CONTAINER_RUNTIME=docker pnpm infra:up`.
On Windows/WSL2 use `127.0.0.1` (not `localhost`) for `DATABASE_URL` / `REDIRECT_URL`.

## Test Credentials (mock auth — local dev only)

| Role           | Email                 | Password | Access                   |
| -------------- | --------------------- | -------- | ------------------------ |
| Owner          | owner@bali-table.test | password | Warung Sari, 1 outlet    |
| Staff          | staff@bali-table.test | password | Warung Sari staff inbox  |
| Platform Admin | admin@ainything.test  | password | Super admin, all tenants |

Create accounts via `/register` or run `pnpm db:seed`.

## Useful Routes

| Route                  | Description                       |
| ---------------------- | --------------------------------- |
| `/`                    | Marketing landing page            |
| `/login`               | Sign in                           |
| `/register`            | Register new account              |
| `/dashboard`           | Owner dashboard                   |
| `/dashboard/catalog`   | Product CRUD                      |
| `/dashboard/orders`    | Order management                  |
| `/dashboard/analytics` | Sales analytics                   |
| `/staff/inbox`         | Staff order queue (real-time)     |
| `/platform`            | Platform admin (super_admin only) |
| `/r/[slug]`            | Public product catalog (QR/link)  |
| `/r/[slug]/cart`       | Cart review + send order          |

## Quality Commands

```sh
pnpm check            # TypeScript + Svelte diagnostics
pnpm test:unit -- --run    # Unit tests
pnpm test:e2e              # E2E tests
pnpm build                 # Production build
```

Database/RLS tests require local infra + migrations + seed data:

```sh
$env:RUN_DB_TESTS='true'; pnpm test:unit -- --run
```

If Playwright browsers are missing:

```sh
pnpm exec playwright install chromium
```

## Quality Bar

- Public routes must feel fast on mobile (LCP ≤ 2.5s on 4G)
- UI must work on 360px phones, tablets, desktop, and in-app browsers
- Every tenant query scoped by `organization_id` AND `outlet_id` — defense in depth with RLS
- QR links must resolve outlet + table/location together
- Dashboard routes read tenant context from server load, not browser globals
- AI must not invent ingredients, halal status, allergen safety, prices, or availability
- High-risk dietary/allergen questions escalate to staff confirmation
- Tenant isolation tested before any pilot
