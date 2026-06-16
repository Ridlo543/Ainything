# LinguaServe

LinguaServe is a multi-restaurant QR menu and guest support platform for restaurants that serve international tourists. One shared SaaS deployment serves many organizations/restaurants; each restaurant gets scoped QR links, menu data, staff requests, and management views.

## Current Status

Frontend prototype completed for phases 1-5:

- Customer QR menu flow.
- Language and preference setup.
- Menu browsing and item detail.
- AI answer state mockups.
- Human fallback request flow.
- Quick feedback.
- Multi-restaurant workspace overview, menu editor, import review, QR table manager, restaurant facts, reports.
- Staff fallback inbox.
- Dummy dataset for 10 realistic restaurant/menu sources.
- Dummy tenant model with organizations, restaurant public hosts, and scoped QR routes.
- Local demo login with HttpOnly cookie and server-resolved tenant context for dashboard/staff routes.

Backend database/cache services now run locally with Docker Postgres + Redis. The repo includes SQL migrations, demo seed data, a PostgreSQL access layer, Redis health integration, and a database-backed tenant resolver with mock fallback for local development. Production auth, CRUD persistence beyond tenant/menu bootstrap, and AI/OCR integrations are still not implemented.

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

- Local development: PostgreSQL + Redis via Docker.
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
pnpm infra:up
pnpm db:migrate
pnpm db:seed
```

Environment:

```sh
copy .env.example .env
```

`DATABASE_URL` should use the app role (`lingua_app`) created by migrations. `DIRECT_URL` should use the local migration/owner role from Docker Compose.

Useful routes:

- `/`: multi-restaurant platform workspace entry.
- `/r/uma-karang/table/T07`: customer QR flow.
- `/login`: local demo login.
- `/dashboard`: management dashboard for an organization with many restaurants.
- `/dashboard/menu`: menu editor.
- `/dashboard/import`: dummy menu import review.
- `/dashboard/tables`: QR table manager.
- `/dashboard/knowledge`: knowledge base mock.
- `/dashboard/analytics`: analytics mock.
- `/staff/inbox`: staff fallback inbox.

## Quality Commands

```sh
pnpm check
pnpm run test:unit -- --run
pnpm build
pnpm run test:e2e
```

Database/RLS tests are opt-in because they require Docker infra, migrations, and seed data:

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
   Current local-first bridge uses Docker PostgreSQL + Redis before managed services.
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
