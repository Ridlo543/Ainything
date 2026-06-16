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

Backend, Supabase, real AI/RAG, OCR, auth, and persistence are not implemented yet.

## Tech Stack

- SvelteKit + Svelte 5 + TypeScript.
- Tailwind CSS v4 design tokens.
- pnpm.
- Vitest.
- Playwright.
- `@lucide/svelte` icons.

Planned backend:

- Supabase Postgres/Auth/RLS/Storage/Realtime.
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

Useful routes:

- `/`: multi-restaurant platform workspace entry.
- `/r/uma-karang/table/T07`: customer QR flow.
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

If Playwright browsers are missing:

```sh
pnpm exec playwright install chromium
```

## Build Order

1. Frontend prototype with mock data. Done.
2. Backend foundation with Supabase schema, auth, RLS, storage, and realtime.
3. AI/RAG layer with mocked provider first, then real provider.
4. OCR import and admin review workflow.
5. Pilot readiness and operational checks.

## Quality Bar

- Public customer routes must be fast on mobile.
- UI must work on small phones, tablets, desktop, and in-app browsers.
- Tenant context must be explicit: organization, restaurant, optional location, and table.
- QR links must resolve restaurant and table together.
- AI must not invent ingredients, allergen safety, halal status, prices, or availability.
- Tenant isolation must be tested before any pilot.
- Domain logic should stay outside Svelte components.
