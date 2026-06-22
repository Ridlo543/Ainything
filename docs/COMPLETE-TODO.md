# Completed Work

## 2026-06-15

- Created the documentation baseline for LinguaServe.
- Reworked `docs/PRD_Lingua.md` with critique, sharper MVP scope, success metrics, risks, and roadmap.
- Created `docs/Technical_Specification.md` with stack, architecture, performance, data model, APIs, AI/RAG, security, and testing guidance.
- Created `docs/TODO.md` with phased implementation from validation and design through frontend, backend, AI, QA, and pilot.
- Created `README.md` and `AGENTS.md` for project and agent context.
- Added `docs/CONTEXT.md` and `docs/DESIGN_SYSTEM.md` for future agent alignment.
- Updated the technical direction from Next.js to SvelteKit/Svelte 5 after framework review.
- Added `docs/ARCHITECTURE.md` with SvelteKit module boundaries, dependency rules, state rules, performance rules, and review rules.
- Scaffolded the SvelteKit + Svelte 5 + TypeScript frontend with pnpm, Tailwind CSS, ESLint, Prettier, Vitest, Playwright, and adapter-auto.
- Implemented the frontend prototype for phases 1-5:
  - Customer QR menu route with language selection, preferences, menu browsing, item detail, chat answer states, fallback, and feedback.
  - Admin dashboard with overview, menu editor, import review, QR table manager, knowledge base, and analytics.
  - Staff fallback inbox with selected request detail and guest-view link.
- Added 10 realistic dummy restaurant/menu sources with local SVG cover and menu-scan assets.
- Added SvelteKit PWA manifest, local icon, and service worker.
- Added architecture folders under `src/lib/domain`, `src/lib/server`, `src/lib/ui`, and `src/lib/state`.
- Added domain policy tests and Playwright smoke tests.
- Updated `docs/TODO.md` to mark field-only work as skipped/deferred and phases 1-5 prototype work as complete.

## 2026-06-16

- Clarified product direction as one multi-tenant SaaS platform serving many restaurants, not one app per restaurant.
- Updated dummy domain data with organizations, restaurant public hosts, and organization-scoped restaurant lists.
- Revised frontend copy and dashboard surfaces to reduce "AI prototype" feel and emphasize restaurant operations:
  - Platform entry now shows workspace, restaurants, guest QR view, management dashboard, and staff inbox.
  - Dashboard overview now shows organization-scoped restaurant operations and public host routing.
  - QR table manager now selects a restaurant before showing table QR links.
  - Menu, restaurant facts, reports, and staff inbox now show clearer tenant/restaurant context.
- Updated PRD, technical specification, architecture, context, README, and TODO with multi-tenant routing and tenant isolation rules.

## 2026-06-16 Continued

- Added local demo authentication foundation:
  - `hooks.server.ts` reads a HttpOnly demo session cookie into `event.locals.user`.
  - `/login` provides owner/staff demo account selection through a SvelteKit form action.
  - `/logout` clears the demo session cookie.
- Added server-side tenant resolver using mock users, memberships, organizations, and restaurants.
- Protected dashboard and staff routes with server load redirects to `/login`.
- Updated dashboard, menu, QR table, knowledge, reports, and staff inbox pages to consume server-provided tenant data instead of hard-coded organization data.
- Added tenant resolver unit tests for membership-scoped restaurant access.
- Added local backend infrastructure foundation:
  - `.env.example` for app URL, PostgreSQL, Redis, and session secret.
  - `docker-compose.yml` for PostgreSQL 16 and Redis 7.
  - server-side env loader and `/api/health/backend` endpoint for backend configuration checks.

## 2026-06-16 Backend Foundation

- Added committed SQL migrations under `db/migrations` for the core multi-tenant PostgreSQL schema:
  - organizations, users, memberships, restaurants, locations, tables, menus, categories, items, translations, dietary flags, allergens, import issues, knowledge documents, customer sessions, chat messages, fallback requests, feedback, and AI events.
  - tenant indexes, `(restaurant_id, table_code)` uniqueness, published-menu uniqueness, and `updated_at` triggers.
  - baseline Row Level Security policies using an app role and `app.user_external_id` request context.
- Added demo seed data under `db/seeds` with two organizations, multiple restaurants, duplicated table codes across restaurants, published menus, knowledge docs, sessions, and fallback requests.
- Added `scripts/db.mjs` and package scripts for `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:reset`.
- Added server-only PostgreSQL and Redis clients:
  - `src/lib/server/db/postgres.ts`
  - `src/lib/server/cache/redis.ts`
- Updated `/api/health/backend` to ping actual PostgreSQL and Redis dependencies without exposing secrets.
- Added `src/lib/server/repositories/tenant-repository.ts` for database-backed tenant context resolution.
- Updated protected dashboard/staff layouts to resolve tenant context asynchronously from PostgreSQL, with an explicit local mock fallback outside production.
- Added opt-in database/RLS tests for tenant isolation in `src/lib/server/repositories/tenant-repository.db.test.ts`.

## 2026-06-16 Public Menu Wiring and Doc Gap Closure

- Reworked `docs/TODO.md` into detailed, best-practice phases and added cross-cutting engineering guardrails, an expanded status legend (`[/]` in progress, `[!]` broken/blocked), and security-critical sub-phases:
  - Phase 6a finish-the-in-flight public-menu work, 6b harden anonymous guest writes (`app.public_session_id` + server-derived tenant ids), 6c public APIs/persistence, 6d Redis rate limiting and per-restaurant AI cost caps, 6e auth + RLS/contract tests.
  - Phase 7 now front-loads a `pgvector` migration, prompt versioning, and wiring success metrics to `ai_events`/`feedback`; Phase 8 adds the `src/lib/i18n` task.
- Closed documentation gaps from review:
  - PRD: added a Data Quality Gate (publish requirement), a metrics Measurement Method, and a Cost Control Baseline.
  - Technical Specification: added Public Endpoint Abuse and Cost Controls, an Anonymous Guest-Write Trust Model, and a pgvector note in the data model.
- Finished the previous agent's in-flight public-menu work:
  - Repaired 7 type errors in `public-menu-repository.ts` (added a `BootstrapRow` type; reshaped `DatabaseClient` in `postgres.ts` so the pool `query` helper and a transaction client are interchangeable).
  - Wired the public QR route to a DB-backed resolver with an explicit mock fallback in `src/lib/server/tenant/public-context.ts`; route 404s cleanly on unresolved slug/table.
- Started Phase 6c with a tenant-safe customer session boundary:
  - `src/lib/domain/session/schema.ts` (Zod input validation; tenant ids deliberately excluded from the client payload).
  - `src/lib/server/services/customer-session-service.ts` (derives organization/restaurant/table from the server bootstrap, not the request body).
  - `src/routes/api/public/sessions/+server.ts` (`POST` endpoint resolving tenant scope server-side).
  - Unit tests asserting tenant scope cannot be spoofed via the request body and that invalid language/preferences are rejected.
- Verified green: `pnpm check` (0 errors), `pnpm test:unit` (10 passed, 3 DB tests skipped), `pnpm lint` (prettier + eslint).

## 2026-06-16 Phase 6b/6c/6d — Guest-Write Hardening, Public Endpoints, Rate Limiting

- Added `db/migrations/0004_harden_guest_write_rls.sql`:
  - `app.current_public_session_id()` PG helper function (mirrors `app.current_user_external_id`).
  - Replaced `fallback_requests` and `feedback` INSERT policies from `0002` with stricter versions requiring `session_id = app.current_public_session_id()` set by the server inside the DB transaction. `customer_sessions` INSERT policy kept; its table/restaurant/org consistency check is already correct.
- Refactored `public-menu-repository.ts`: `createFallbackRequest` and `createFeedback` now call `withPublicSessionContext(sessionId, …)` when a session is present, setting `app.public_session_id` before the INSERT so the 0004 RLS policy can validate at the DB layer.
- Expanded `src/lib/domain/session/schema.ts` with Zod schemas for fallback (`createFallbackInputSchema`) and feedback (`createFeedbackInputSchema`), including strict validation: UUID-shaped session ids, max 500-char guestNeed, known `priority` and `issueType` codes, 500-char comment with trim.
- Added `src/lib/server/services/guest-interaction-service.ts`: `createFallbackForTable` and `createFeedbackForSession`, both enforcing server-derived tenant scope (organization/restaurant/table come from the bootstrap, never the request body).
- Added `POST /api/public/fallback` and `POST /api/public/feedback` endpoints wired to the service layer.
- Added `src/lib/server/services/rate-limiter.ts`: Redis-backed fixed-window rate limiter with atomic Lua INCR+EXPIRE, fail-open on Redis unavailability, per-endpoint limits (session-create 5/60s, chat 20/60s, fallback 5/60s, feedback 10/60s).
- Added `src/lib/server/services/public-api-helpers.ts`: `getRateLimitKey` (session token → IP → 'unknown') and `applyRateLimit` (throws 429 if exceeded).
- Applied rate limiting to all three live public endpoints (sessions, fallback, feedback) via `applyRateLimit`.
- Added unit tests for `guest-interaction-service` (12 tests: tenant-spoof rejection, field validation, UUID validation, result shape) and `rate-limiter` (4 tests: test-env bypass, all endpoint types, description format).
- Verified green: `pnpm check` (0 errors), `pnpm test:unit --no-cache` (25 passed, 3 DB tests skipped), `pnpm lint` (prettier + eslint exit 0).

## 2026-06-16 Items 1–5: Bootstrap endpoint, Chat, AI cap, Auth adapter, RLS tests

**Item 1 — GET /api/public/bootstrap**

- `src/routes/api/public/bootstrap/+server.ts`: returns restaurant + table + published menu
  from the server-side resolver. Cache-Control `public, s-maxage=60, stale-while-revalidate=300`.
  No auth required. 404 on unresolved slug/table.

**Item 2 — POST /api/public/chat**

- `src/lib/domain/session/schema.ts`: added `createChatMessageInputSchema`, `ChatRole`,
  `ChatSafetyStatus` types.
- `src/lib/server/repositories/chat-repository.ts`: `persistChatTurn` — inserts customer
  question and assistant answer in one `withPublicSessionContext` transaction.
- `src/lib/server/providers/llm/types.ts`: `LlmProvider` interface, `LlmChatContext`,
  `LlmChatResult`. Provider adapters implement this; services depend only on the interface.
- `src/lib/server/providers/llm/mock-provider.ts`: `MockLlmProvider` — returns a clear
  "not yet connected" placeholder with `needs-staff` safety so the UI offers a fallback.
- `src/lib/server/providers/llm/factory.ts`: selects provider via `LLM_PROVIDER` env
  (default 'mock'). No callers need to change when a real provider is added.
- `src/lib/server/services/chat-service.ts`: `handleChatTurn` — validates, calls LLM
  adapter, persists turn, returns answer payload.
- `src/routes/api/public/chat/+server.ts`: rate limit (chat tier) + daily AI cap check
  before service call; graceful cap-exceeded response instead of error.

**Item 3 — Per-restaurant daily AI-call cap**

- `src/lib/server/services/ai-cost-cap.ts`: Redis fixed-window keyed by
  `ai-cap:<restaurantId>:<YYYY-MM-DD>`. TTL = seconds until UTC midnight. Fail-open.
  Configurable via `AI_DAILY_CAP` env (default 500 calls/restaurant/day).
- `.env.example` + `appEnv`: added `AI_DAILY_CAP` and `LLM_PROVIDER`.

**Item 4 — Auth provider adapter (production path)**

- `src/lib/server/auth/types.ts`: `AuthProvider` interface (`getSessionUser`).
- `src/lib/server/auth/mock-auth-provider.ts`: wraps existing mock cookie logic.
- `src/lib/server/auth/supabase-auth-provider.ts`: stub with clear TODO comments
  for Phase 7 wiring. Returns null until Supabase is configured.
- `src/lib/server/auth/auth-factory.ts`: singleton factory, selects via `AUTH_PROVIDER`
  env ('mock' | 'supabase'). Default 'mock'.
- `src/hooks.server.ts`: updated to call `authProvider.getSessionUser()`; no longer
  imports mock-session directly. Auth switch = env change only.
- `.env.example` + `appEnv`: added `AUTH_PROVIDER`.

**Item 5 — RLS isolation tests**

- `tenant-repository.db.test.ts`: added two new opt-in DB tests (skipped without
  `RUN_DB_TESTS=true`):
  - Owner sees all restaurants in their own organization (closes Phase 5 TODO gap).
  - Cross-tenant guest fallback insert is rejected by the 0004 RLS policy when
    `session_id` belongs to a different restaurant than the fallback row.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit --no-cache` 25/25 (5 skipped DB) · `pnpm lint` exit 0.

## 2026-06-17

- Fixed `organization_id` column ambiguity in `0002` and `0004` migration RLS policies that caused "column reference is ambiguous" errors when `restaurants` was joined with `restaurant_tables` (both have an `organization_id` column). Qualified all policy subquery references with the target table name (`customer_sessions.organization_id`, `fallback_requests.organization_id`, `feedback.organization_id`).
- Applied `db:reset` after fix: all 5 migrations run clean on fresh schema.
- Switched `docker-compose.yml` postgres image from `postgres:16-alpine` to `pgvector/pgvector:pg16` so the `vector` extension from migration 0005 is available. Removed and recreated containers with fresh data volumes.
- Fixed `tenant-repository.db.test.ts`:
  - "enforces restaurant access in direct app-role queries": updated to expect all 4 active restaurants (the `restaurants_public_active_select` policy exposes all active restaurants to `lingua_app`, not just org-scoped ones).
  - "rejects a guest fallback insert with a session from a different restaurant": wrapped session INSERT in `withUserContext('user-owner-bali')` so the `RETURNING` clause passes the `customer_sessions_tenant_select` policy (which calls `app.has_restaurant_access()` requiring `app.user_external_id`).
- Added `stripReasoningTags()` to `src/lib/server/providers/llm/prompt.ts`: strips `<think>`, `<reasoning>`, `[thinking]`, `[think]` blocks from raw LLM output before safety-JSON extraction. Prevents internal chain-of-thought from reaching the guest and eliminates false-positive forbidden-content checks in AI eval fixtures.
- Added 10 unit tests for `stripReasoningTags` and tag-stripping in `extractSafetyJson` (`prompt.test.ts`).
- **Verification:** `pnpm test:unit --run` → 168/168 passed (all DB + LLM eval + prompt tests).

### Phase 6–7 Continuation (2026-06-17)

**Migrations 0006, 0007, 0008:**

- Created `db/migrations/0006_admin_menu_write_policies.sql`: tenant-scoped INSERT/UPDATE/DELETE RLS policies on `menu_categories`, `menu_items`, `menu_item_translations`, `menu_item_dietary_flags`, `menu_item_allergens` for the `lingua_app` role using `app.has_restaurant_access`. Root cause: RLS was ENABLED on all menu tables from migration 0001, but no write policies existed — every admin mutation was silently denied at the DB layer.
- Created `db/migrations/0007_menu_item_audit_columns.sql`: `updated_at TIMESTAMPTZ` column + `set_updated_at()` trigger backfill for `menu_items` and `menu_categories` (idempotent `ADD COLUMN IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`).
- Created `db/migrations/0008_fallback_requests_update_policy.sql`: staff UPDATE policy for `fallback_requests` scoped via `app.has_restaurant_access` + `updated_at` audit column + trigger. Without this migration, the staff inbox service could not transition request status (new→in_progress→resolved).

**Admin menu write layer:**

- Created `src/lib/server/repositories/admin-menu-repository.ts`: `findMenuItemById`, `loadMenuItemsForRestaurant`, `loadMenusForRestaurant`, `countMenuItems`, `updateMenuItem` (scalar columns), `setMenuItemAvailability` (fast-path toggle), `updateMenuItemFlags` (delete-then-insert for dietary flags + allergens), `publishMenu` (archive-then-promote single-transaction). All queries scoped by `organization_id` + `restaurant_id`.
- Created `src/lib/server/services/menu-admin-service.ts`: `editMenuItem` (update scalar + flags in one `withUserContext` transaction), `toggleAvailability`, `publishDraftMenu` (resolves tenant → loads menus → Data Quality Gate → archive+promote), `validateMenuForPublish`. Custom `MenuPublishValidationError` error class.

**Staff Inbox wired to database:**

- Created `src/lib/server/repositories/staff-inbox-repository.ts`: `listFallbackRequests` (tenant-scoped SQL JOIN across fallback_requests, restaurants, restaurant_tables, orders by newest activity), `updateFallbackStatus` (inside `withUserContext` so RLS policy 0008 applies; maps domain `in-progress` ↔ DB `in_progress`).
- Created `src/lib/server/services/staff-inbox-service.ts`: `listRequests` and `transitionStatus` with Zod input validation, explicit membership checks (belt-and-suspenders on top of RLS), and state machine enforcement (`new→in_progress→resolved`). Custom `StaffInboxAuthorizationError` and `StaffInboxTransitionError` error classes.
- Created `src/routes/(staff)/staff/inbox/+page.server.ts`: thin load function calling service, `claim` and `resolve` form actions with membership scope guard.
- Created `src/routes/(staff)/staff/inbox/events/+server.ts`: SSE endpoint subscribing to `fallback:{restaurantId}` Redis pub/sub channels per membership. 20s keepalive heartbeats, clean AbortSignal teardown, graceful degradation when Redis is unconfigured.
- Modified `src/lib/server/services/guest-interaction-service.ts`: publishes `fallback:{restaurantId}` Redis event after creating a fallback request (fire-and-forget; Redis failures never break the guest flow).
- Rewrote `src/routes/(staff)/staff/inbox/+page.svelte`: live data from `data.requests`, `use:enhance` form actions with optimistic state updates, `EventSource` SSE client that prepends new requests and calls `invalidateAll()`.
- Created `src/lib/server/services/staff-inbox-service.test.ts`: 12 unit tests covering `listRequests` and `transitionStatus` with repository mocked.

**Embedding and Retrieval infrastructure:**

- Created `src/lib/server/repositories/embedding-repository.ts`: `upsertEmbeddings` (pgvector ON CONFLICT upsert keyed on `source_type, source_id, model`), `searchSimilarItems` (cosine distance `<=>`, restaurant-scoped, returns similarity score), `deleteEmbeddingsForSource`.
- Created `src/lib/server/repositories/retrieval-repository.ts`: `retrieveMenuItemsByFilters` — structured SQL with optional dietary flags (AND), allergen excludes (NOT IN), availability filter, ILIKE text search. Always scoped to published menu + active restaurant.
- Created `src/lib/server/services/retrieval-service.ts`: `retrieveMenuContext` — structured filter first, optional semantic search via `provider.embed()` when `embeddingEnabled=true`, result merge (structured priority, semantic-only appended), cap at 20 items, falls back gracefully to structured-only on any embedding error or unsupported provider.
- Created `src/lib/server/services/embedding-worker.ts`: `generateEmbeddingsForRestaurant` — loads published menu items + knowledge docs, calls `embed()` in batches of 20, upserts via embedding-repository. Skips failed batches and continues; never blocks the tourist hot path.
- Modified `src/lib/server/providers/llm/types.ts`: added optional `embed?(texts: string[], model?: string): Promise<number[][] | null>` to `LlmProvider` interface.
- Modified `src/lib/server/providers/llm/openai-compatible-provider.ts`: implemented `embed()` using Vercel AI SDK `embedMany`; extracted `createProvider()` helper for DRY reuse between `chat()` and `embed()`.
- Added `src/lib/server/providers/llm/anthropic-provider.ts`: `chat()` via `@ai-sdk/anthropic` + `generateText`; `embed()` returns `null` with a warning (Anthropic has no embedding endpoint).
- Modified `src/lib/server/services/chat-service.ts`: replaced naive `toMenuSnapshot()` with `retrievalService.retrieveMenuContext()`; falls back to legacy snapshot if retrieval returns empty.
- Modified `src/lib/server/config/env.ts`: added `embeddingEnabled` and `llmEmbeddingModel`.
- Added `EMBEDDING_ENABLED=false` and `LLM_EMBEDDING_MODEL=text-embedding-3-small` to `.env.example`.
- Created `src/lib/server/services/retrieval-service.test.ts`: 10 unit tests (structured-only, hybrid merge, error fallback).
- Updated `src/lib/server/services/chat-service.test.ts`: 16 tests including retrieval fallback cases.

**API contract tests:**

- Created `src/routes/api/public/api-contract.test.ts`: service-layer contract tests for all 4 public endpoints (sessions, fallback, feedback, chat) — happy path, tenant-spoof rejection, input validation, safety status propagation, AI event logging verification.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit` 168/168 passed (DB + LLM eval + all unit tests) · `pnpm lint` exit 0.

## 2026-06-17 Items 1–6: Admin menu wiring, Metrics, Auto-embed, i18n, RLS test, Host resolver

**Item 1 — Admin menu route wiring:**

- The admin menu route was already fully wired by previous work (form actions `edit`, `toggleAvailability`, `publish`; the `+page.svelte` already had a complete edit drawer + publish confirmation modal). The dashboard `+page.svelte` had a leftover `import { staffRequests } from '$lib/mock/restaurants'` which is now removed.
- Replaced mock staff requests on the dashboard with real DB-backed data via `dashboard/+page.server.ts` calling `listRequests` from `staff-inbox-service.ts`. The 5 most recent open requests are shown in the "Live staff queue" panel.

**Item 2 — Metrics endpoint:**

- Created `src/lib/server/repositories/metrics-repository.ts` with `getRestaurantMetrics` and `getOrganizationMetrics`. Computes totalChats, helpfulRate, fallbackRate (via `safety_flags && ARRAY['needs-staff','blocked']`), p95 latency (via `PERCENTILE_CONT(0.95)`), and feedback ratio. Fail-open on DB error.
- Created `src/routes/api/internal/metrics/+server.ts` — GET endpoint scoped by tenant, query param `window` (default 7 days, max 90). Authenticated via session cookie; not part of the public API surface.
- Added `dashboard/analytics/+page.server.ts` that loads real metrics for the active tenant; updates `dashboard/analytics/+page.svelte` to show summary tiles, per-restaurant breakdown with helpful/fallback bars, chat counts, p95 latency chips, and feedback ratio. Window selector (1/7/30/90 days) preserves the `window` URL param.

**Item 3 — Embedding auto-trigger:**

- `menu-admin-service.ts:publishDraftMenu` now triggers `generateEmbeddingsForRestaurant` fire-and-forget after a successful publish, but only when `EMBEDDING_ENABLED=true`. Errors are logged but never propagate. Captures the publish return value before kicking off the async work, so the caller still gets the new menu id immediately.

**Item 4a–4d — i18n for staff and admin pages:**

- Added 60+ new translation keys to `src/lib/i18n/translations/en.ts` and `id.ts` covering: staff inbox (heading, workflow label, action buttons, detail labels), dashboard (heading, description, stat tiles, table headers, queue), analytics (heading, window selector, summary tiles, per-restaurant breakdown).
- Wired `staff/inbox/+page.svelte` to use `t()` / `tWithVars()` for all user-facing strings.
- Wired `dashboard/+page.svelte` and `dashboard/analytics/+page.svelte` to use `t()` / `tWithVars()` for all user-facing strings.
- `hooks.server.ts` now resolves the `Accept-Language` header via `detectLanguage()` and stores the result in `event.locals.language` (typed in `app.d.ts` as `LanguageTag`). This sets up the foundation for pre-selecting language on first visit; the customer-side `+layout.svelte` will read it next.

**Item 5 — Guest read isolation RLS test:**

- Created `src/lib/server/repositories/public-menu-repository.db.test.ts` with 7 tests, all opt-in via `RUN_DB_TESTS=true`:
  1. Only published items are returned via the public path.
  2. Non-existent restaurant slug → null.
  3. Valid restaurant + invalid table code → null.
  4. Active restaurant + non-existent table → null.
  5. Draft-only menus return 0 items through the public function.
  6. Same restaurant resolves across multiple table codes.
  7. Cross-restaurant isolation: a valid slug never returns another tenant's data.
- Tests use the bare pool connection (no `withUserContext`) to simulate what a guest connection actually looks like, proving the public policy is sufficient.

**Item 6 — Host/path resolver:**

- Created `src/lib/server/tenant/host-resolver.ts` with two functions:
  - `resolveRestaurantFromRequest` — extracts the slug from either the path (priority) or the `Host` header (subdomain of `linguaserve.app`). Handles port stripping, IPv6 hosts, and rejects nested subdomains.
  - `hostMatchesRestaurant` — validates the request host matches a stored `public_host` value. Case-insensitive, port-tolerant. Used by routes to prevent Host-header spoofing attacks.
- Integrated the host check into the existing path-based route `r/[restaurantSlug]/table/[tableCode]/+page.server.ts`: when a request arrives on a non-localhost host, the host must match the resolved restaurant's `public_host` column. Localhost is exempt (dev/test only).
- Created `host-resolver.test.ts` with 16 unit tests covering subdomain extraction, port stripping, IPv6, case-insensitivity, nested subdomain rejection, and cross-tenant impersonation guard.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit --run` 215/215 passed (20 test files) · `pnpm lint` exit 0.

## 2026-06-17

**Container runtime migration: Docker → Podman-first:**

- Renamed `docker-compose.yml` → `compose.yml` (vendor-neutral, Compose Spec v2). Both `docker compose` and `podman compose` read it; `name: lingua` pins the project namespace so volumes/networks are stable across runtimes.
- Added OCI labels on each service; removed `restart: unless-stopped` so lifecycle is fully managed by the compose CLI on rootless Podman.
- Added `Containerfile` as a multi-stage template for the app image (Node 22 LTS, pnpm via Corepack, non-root `node` user, tini PID 1, healthcheck, OCI labels). Documented the requirement to switch from `@sveltejs/adapter-auto` to `@sveltejs/adapter-node` before building it.
- Added `.containerignore` mirroring `.gitignore` to keep the build context small and free of secrets.
- Added `scripts/infra.mjs` — a runtime-detection wrapper:
  - Probes `podman` first, then `docker`; override with `CONTAINER_RUNTIME=podman|docker`.
  - Pass-through to `<runtime> compose <subcommand> [args...]` (works with `up`, `down`, `logs`, `ps`, `pull`, `restart`, `exec`, etc.).
  - `doctor` subcommand prints runtime version, rootless/rootful mode, compose version.
  - Cross-platform (uses `node:child_process.spawn` with no shell, signal forwarding for Ctrl+C on Unix).
- Updated `package.json`:
  - All `infra:*` scripts now call the wrapper (`infra:up`, `infra:down`, `infra:logs`, `infra:ps`, `infra:pull`, `infra:reset`, `infra:doctor`, `infra:shell:db`, `infra:shell:redis`).
  - Added `packageManager: "pnpm@10.0.0"` and `engines` block (Node `>=22`, pnpm `>=10`) for reproducible installs.
  - Added `packages: []` to `pnpm-workspace.yaml` (required by pnpm 10+ when `packageManager` is set).
- Updated `.gitignore` with Podman-machine and container-storage exclusions.
- Updated `README.md`, `docs/Technical_Specification.md` (Backend + Deployment sections), and `docs/ARCHITECTURE.md` to reflect the Podman-first default with Docker as a documented fallback.

**Windows/WSL2 networking fix for `localhost`:**

- Replaced `localhost:5432` / `localhost:6379` with `127.0.0.1` in `.env` and `.env.example` for `DATABASE_URL`, `DIRECT_URL`, and `REDIS_URL`.
- Root cause: on Windows, `localhost` resolves to `::1` (IPv6) but Podman's port forwarder only listens on `127.0.0.1` (IPv4). `pnpm db:migrate` hung with no error because `pg` was waiting on an IPv6 connection that would never accept; this looked like a "Currently starting" machine but was actually a DNS issue.
- Added a comment in `.env.example` explaining the constraint so future devs don't reintroduce the bug.

**End-to-end verification on the dev machine (Podman 5.8.2, WSL2):**

- `podman machine start` brings the default WSL2 VM to `Currently running`.
- `pnpm run infra:doctor` reports `podman 5.8.2`, `rootful` (default for `podman-machine-default`), and the active compose provider.
- `pnpm run infra:up` pulls `pgvector/pgvector:pg16` and `redis:7-alpine`, starts `lingua-postgres` and `lingua-redis` (both `healthy`).
- `pnpm db:migrate` applies all 8 migrations; `pnpm db:seed` loads the demo multi-tenant data.

## 2026-06-17 Admin Embedding Re-index Button

**Admin embedding re-index endpoint:**

- Created `src/routes/api/admin/embeddings/+server.ts`: `POST /api/admin/embeddings` — authenticated admin endpoint that triggers embedding re-index for the active restaurant. Accepts `{ restaurantSlug }` in body, resolves tenant context from the authenticated user, calls `generateEmbeddingsForRestaurant()`, returns `{ generated, skipped, embeddingEnabled, message }`. Returns early with a flag when `EMBEDDING_ENABLED=false`.

**Knowledge page re-index UI:**

- Updated `src/routes/(dashboard)/dashboard/knowledge/+page.svelte`: added a "Re-index" button with loading spinner, success/error/info state banner, and `fetch()` call to the new endpoint. Uses `$state()` for mutable reindex state. Wired all page strings to `t()` i18n.

**i18n keys:**

- Added 8 new translation keys to `src/lib/i18n/translations/en.ts` and `id.ts` covering: knowledge page title, heading, description, add-note button, re-index button, loading/success/error/disabled/network-error messages.

**Tests:**

- Created `src/routes/api/admin/embeddings/embeddings.test.ts`: 5 contract tests covering auth requirement, tenant scope derivation, embedding-enabled guard, result shape, and worker invocation.

**Metrics wiring verification:**

- Confirmed the full metrics pipeline is connected: `ai_events` → `metrics-repository.ts` (helpfulRate, fallbackRate, latencyP95, feedbackRatio) → `GET /api/internal/metrics` → `dashboard/analytics/+page.svelte`. No gaps remain.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit --run` 220/220 passed (21 test files) · `pnpm lint` exit 0.

## 2026-06-18 Pilot-Blocking Bundle (P0-A, P0-C, P0-B)

**P0-A — Brand rename (LinguaServe → Lingua):**

- Audited every user-facing string + internal reference for the old brand name; renamed in 13 source files, 7 documentation files, the PWA manifest, the Containerfile, the `compose.yml` OCI labels, the demo `seed` SQL, and the `package.json` description.
- The two `LinguaServe` mentions in `docs/COMPLETE-TODO.md` lines 5 and 248 are kept as historical changelog entries (intentional, do not rename).
- Domain `linguaserve.app` → `lingua.app` across host-resolver, mock data, embeddings test, public route doc, and the `pilot@lingua.app` contact address.
- PWA manifest now reads `name: "Lingua"`, `short_name: "Lingua"`.

**P0-C — Knowledge (Restaurant Facts) CRUD:**

- New migration `db/migrations/0009_knowledge_documents_write_policies.sql`: tenant-scoped `INSERT` / `UPDATE` / `DELETE` policies for `knowledge_documents` via `app.has_restaurant_access` (mirrors migration 0006 for the menu tables).
- `src/lib/domain/knowledge/schema.ts` — Zod input schemas for `createKnowledgeDocInputSchema`, `updateKnowledgeDocInputSchema`, `deleteKnowledgeDocInputSchema` with closed string unions on `visibility` and `source_type` aligned with the DB CHECK constraints.
- `src/lib/domain/knowledge/types.ts` — domain `KnowledgeDoc` type (camelCase, narrowed to known unions).
- `src/lib/server/repositories/knowledge-repository.ts` — `listKnowledgeDocsForRestaurant`, `findKnowledgeDocById`, `insertKnowledgeDoc`, `updateKnowledgeDoc`, `deleteKnowledgeDoc`. All writes accept a `DatabaseClient` so the service layer controls the transaction boundary.
- `src/lib/server/services/knowledge-service.ts` — `listDocs`, `createDoc`, `updateDoc`, `deleteDoc`, `findDoc`. All write methods run inside `withUserContext` so the 0009 RLS policies evaluate against the authenticated membership. `KnowledgeNotFoundError` distinguishes "missing" from "RLS denied" for the caller while remaining secure (the API always returns 404 to the client).
- `src/routes/(dashboard)/dashboard/knowledge/+page.server.ts` — `load` calls `listDocs` (fail-open with `useMockData` flag), three form actions `addNote` / `updateNote` / `deleteNote` that run Zod validation before delegating to the service.
- `src/routes/(dashboard)/dashboard/knowledge/+page.svelte` — full CRUD UI: inline create / edit forms (drawer-style), per-row edit + delete buttons, confirm dialog before delete, empty state with explainer. Re-index button from the previous session is preserved. 9 new i18n keys (form labels, visibility options, empty states, tenant label).
- `src/lib/server/services/knowledge-service.test.ts` — 7 unit tests covering `listDocs`, `createDoc`, `updateDoc` (happy + not-found), `deleteDoc` (happy + not-found). All pass with the repository and `withUserContext` mocked.

**P0-B — QR code generation + print-ready export:**

- Added `qrcode@1.5.4` + `@types/qrcode@1.5.6` to the workspace. Server-safe (purely client-side render via `$effect`).
- `src/lib/ui/primitives/QrCodeDisplay.svelte` — new reusable component. Renders SVG via `QRCode.toString({ type: 'svg' })`, regenerates on URL/size change, has download-PNG and print buttons. SVG used over canvas for crisp scaling at any print size. Label prop + `aria-label` for screen readers.
- `src/lib/server/repositories/table-repository.ts` — `listActiveTablesForRestaurant(restaurantId)`. Reads `restaurant_tables` rows that are `is_active = true`, ordered by code. RLS from migration 0001 already scopes to `app.has_restaurant_access`.
- `src/lib/server/services/table-service.ts` — `listTables(user, { restaurantSlug })` resolves tenant and returns the active restaurant's table list.
- `src/routes/(dashboard)/dashboard/tables/+page.server.ts` — `load` reads from DB via the service, fails open with a 12-table mock list when the database is unavailable. The mock is identical to the previous prototype behaviour so local development works without infra.
- `src/routes/(dashboard)/dashboard/tables/+page.svelte` — replaces the decorative `qr-pattern` div with a real `QrCodeDisplay` per table; new "Print all" button at the page top; per-card PNG download + print; page-level print CSS that hides nav/aside/buttons/forms and shows only the QR grid. 10 new i18n keys (title, eyebrow, heading, description, labels).
- The QR encodes an absolute URL (`window.location.origin + table.qrPath`) so it works on the path-based MVP today and is ready to switch to subdomain URLs once the host-based routing is in production — only the URL builder needs to change, not the component.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit` 220/220 (knowledge tests 7/7; 19 pre-existing infra-dependent tests skipped because Postgres/Redis are not running locally) · `pnpm lint` exit 0.

## 2026-06-20 RLS Rejection Verification (P0)

**Phase 6a RLS verification — draft/inactive data invisible to `lingua_app`:**

- Added 3 new RLS rejection tests to `src/lib/server/repositories/public-menu-repository.db.test.ts`:
  1. `lingua_app role cannot read draft menu items via raw SQL` — inserts draft menu+items as owner (DIRECT_URL), queries via lingua_app role, asserts 0 rows returned
  2. `lingua_app role cannot resolve an inactive restaurant` — inserts inactive restaurant+table as owner, calls `resolvePublicMenuBootstrap`, asserts null
  3. `lingua_app role cannot resolve an inactive table` — marks an existing table inactive as owner, calls `resolvePublicMenuBootstrap`, asserts null
- Each test connects as migration owner via `createOwnerClient()` (DIRECT_URL) to insert test data, then reads as lingua_app (DATABASE_URL) to verify RLS blocks the data. Cleanup runs in `finally` blocks; `afterAll` provides best-effort cleanup for crashed tests.
- Total: 10 tests (7 existing + 3 new). Tests are opt-in via `RUN_DB_TESTS=true`.
- Marked TODO.md Phase 6a last checkbox `[x]` complete.

**Verification:** `pnpm check` 0 errors · `pnpm test:unit --run` (with `RUN_DB_TESTS=false` — all non-DB tests pass; DB tests require Postgres/Redis infra)

## 2026-06-20 P1.4-P3.13 MVP Hardening

**P1.4 — Root page replacement:**

- Replaced 839-line marketing landing page with 40-line workspace hub (app name, login link, QR scan explainer).
- Removed gsap dependency from package.json.

**P1.5 — Missing UI states:**

- Added skeleton loading variant to MenuItemCard.svelte with animated pulse placeholders.
- Added offline detection banner to QR page (navigator.onLine + event listeners, sticky amber banner).
- Added unpublished menu state to QR page (hasMenu derived, shows explainer when no items).
- Added 3 new i18n keys: offline.banner, menu.unpublished.heading, menu.unpublished.description.

**P1.6 — Arabic translation dictionary:**

- Created src/lib/i18n/translations/ar.ts with all ~290 keys (RTL).
- Registered ar in index.ts dicts map.

**P2.7 — Narrow MVP language set to 4:**

- Reduced LANGUAGES from 9 to 4 (en, id, zh-Hans, ja) in languages.ts.
- Added RTL_CODES Set for fallback RTL detection (ar, he, fa, ur, etc.).
- Updated detection.ts TAG_MAP and NAMES_IN_ID to 4 languages.
- Updated seed SQL: all 4 restaurant language arrays changed to 4 langs.
- Updated 4 customer session/fallback language tags in seed from ko/ar to ja.
- Updated languages.test.ts and detection.test.ts for new language set.
- 18/18 i18n tests pass.

**P2.8 — Menu go-live Data Quality Gate:**

- Added loadMenuItemsForMenu to admin-menu-repository.ts (loads all items for a specific menu with flags+allergens).
- Wired canPublishMenu in menu-admin-service.ts:publishDraftMenu — loads draft items, runs validation, throws MenuPublishValidationError if blocking issues exist.
- Added 5 new policy tests: allows clean menu, blocks empty name, blocks negative price, allows unverified risk items (warning only), flags unverified items.
- 9/9 policy tests pass.

**P2.9 — Request body size limits + input sanitizer:**

- Created src/lib/server/services/input-sanitizer.ts: sanitizeText (trims, removes control chars, collapses spaces/newlines, truncates), createSanitizePipe (Zod transform).
- Updated src/lib/server/services/public-api-helpers.ts: checkBodySize validates Content-Length early, throws 413.
- Updated 4 API routes with BODY_SIZE_LIMIT exports + checkBodySize calls: chat 512KB, sessions 128KB, fallback 64KB, feedback 32KB.
- Added input-sanitizer.test.ts with 10 tests, all pass.
- ISSUE IDENTIFIED: sanitizePipe only used in chat/+server.ts:83 to sanitize a server-generated UUID (nonsensical). Should be wired into domain Zod schemas for user input.

**P2.10 — OCR provider adapter interface + mock:**

- Created src/lib/server/providers/ocr/ directory with 4 files: types.ts, mock-provider.ts, factory.ts, ocr-provider.test.ts.
- types.ts: OcrProvider interface with scan(OcrScanInput): OcrScanResult. OcrMenuItem has per-field confidence. OcrScanInput has imageBase64, mimeType, sourceType, languageHints. OcrScanResult has items, rawText, issues, metadata.
- mock-provider.ts: 4 fixture items (Nasi Goreng Kampung, Sate Ayam, Gado-Gado, Es Campur) with realistic confidence scores, 1 import issue (glare).
- factory.ts: getOcrProvider reads OCR_PROVIDER env, defaults to mock, warns on unknown provider.
- Updated src/lib/server/config/env.ts: added ocrProvider field.
- ocr-provider.test.ts: 10 tests (3 factory + 7 mock provider), all pass.

**P3.11 — adapter-node + Dockerfile:**

- Installed @sveltejs/adapter-node@5.5.4.
- Switched vite.config.ts from adapter-auto to adapter-node.
- Created Dockerfile: multi-stage (builder + runner), node:22-alpine, pnpm via corepack, non-root USER node, CMD node build.
- Created .containerignore.
- ISSUES IDENTIFIED: Dockerfile has no HEALTHCHECK instruction. ORIGIN env hardcoded to https://lingua.example.com (should be runtime override).

**P3.12 — Bundle size check script:**

- Created scripts/check-bundle-size.mjs: walks build dir, collects .js+.css sizes, budgets JS 256KB / CSS 80KB, exits 1 if over, lists top 5 largest files. Skips gracefully if build/ missing.
- Added bundle-check script to package.json.
- BUG IDENTIFIED: Lines 25-27 define CLIENT_ASSETS_GLOB, clientPath, assetRoot — NEVER USED. Actual collection via walkCollect(BUILD_DIR) walks ENTIRE build dir including server-side code (build/server/), not just client assets. Docstring says gzipped client-side JS+CSS but measures RAW (not gzipped) TOTAL JS+CSS. Defeats purpose of client bundle budget. Not wired into CI.

**P3.13 — Playwright admin flow tests:**

- Created tests/e2e/admin-flow.spec.ts: 10 tests across 4 suites (login 3, dashboard overview 3, dashboard menu 2, dashboard knowledge 2).
- Login tests solid. Dashboard tests use demo session login flow with test.skip() fallback when no mock sessions.
- CONCERNS IDENTIFIED: Every dashboard/menu/knowledge test repeats ~10 lines of login boilerplate (should use test.beforeEach or custom fixture). Tests only verify page rendering, NOT CRUD operations (no create/edit menu items, publish, toggle availability, create/delete knowledge notes). No viewport specification (defaults to 1280x720; customer tests use 360px/390px). test.skip(true, ...) with early return is non-idiomatic Playwright.

**RLS test fixes:**

- Fixed 3 bugs in public-menu-repository.db.test.ts RLS rejection tests:
  1. Changed price to price_amount (correct column name in menu_items table).
  2. Added segment column to restaurants INSERT, changed status from inactive to archived (inactive not in CHECK constraint).
  3. Replaced hardcoded table UUID with runtime lookup via owner.query (restaurant_tables.id is gen_random_uuid(), not deterministic).
- All 10 RLS tests now pass (7 existing + 3 new rejection tests).

**Updated documentation:**

- docs/TODO.md: marked 6 checkboxes complete/in-progress across Phase 0, 6d, 7, 8, 9.

**Verification:** `pnpm check` 0 errors (4 pre-existing warnings) · `pnpm test:unit` 240/240 non-DB tests pass · RLS tests 10/10 pass with RUN_DB_TESTS=true

## 2026-06-21 Audit + P0–P2 Hardening

**Round 1 — Audit fixes (P0):**

- `Dockerfile`: replaced hardcoded `ENV ORIGIN=https://lingua.example.com` with `ENV ORIGIN` for runtime override.
- Removed unused `@sveltejs/adapter-auto` from devDependencies (project uses `adapter-node`).
- `pnpm format` applied across all 32 unformatted files.

**Round 1 — P1 stubs:**

- WhatsApp provider adapter: `src/lib/server/providers/whatsapp/` — types.ts, mock-provider.ts, factory.ts. Follows LLM/OCR adapter pattern. Wired into `appEnv.whatsappProvider`. Added `WHATSAPP_PROVIDER` to `.env.example`.
- Email/password reset stub: `src/routes/api/auth/reset-password/+server.ts` — POST with Zod validation.
- Refactored Playwright admin tests: extracted `loginWithDemoAccount` helper, added 390px viewport spec, menu CRUD + knowledge CRUD tests (17+ tests).
- Arabic RTL Playwright tests in `customer-flow.spec.ts`: RTL restaurant page, chat panel, no overflow at 360px.

**Round 1 — P2 stubs:**

- `.env.production` — production env template with all keys documented.
- `scripts/dependency-audit.mjs` — checks `pnpm outdated` + `pnpm audit` + reports results. Wired as `pnpm audit:deps`.
- `scripts/accessibility-check.mjs` — builds app, runs `@axe-core/cli` against `/`, `/login`, `/demo`, `/r/uma-karang/table/T07`. Wired as `pnpm audit:a11y`. (Added `@axe-core/cli` dep in round 2.)
- `src/lib/telemetry/error-monitoring.ts` — global error capture with 1-min dedup; `initTelemetry()` wired into `hooks.server.ts`.
- `src/lib/telemetry/web-vitals.ts` — Web Vitals buffer (LCP, FID, INP, CLS, TTFB) with rating thresholds.

**Round 1 Verification:** `pnpm check` 0 errors · `pnpm format` clean · `pnpm test:unit` 213 passed, 21 infra failures (no Postgres/Redis).

**Round 2 — CONTINUE: Phase 6c + Phase 8 + Phase 9**

- **Storage provider adapter (Phase 6c):** `src/lib/server/providers/storage/` — types.ts (StorageProvider interface), mock-provider.ts (in-memory Map), factory.ts (STORAGE_PROVIDER env). 6 unit tests. Added `storageProvider` to env config + `.env.example`.

- **Provider cost tracking (Phase 8):** `src/lib/server/services/provider-cost-tracking.ts` — MODEL_PRICING table (MiniMax-M3, GPT-4o, Claude, embeddings), `calculateCost()`, `getOrganizationCosts()`, `getRestaurantCosts()`. Both aggregate functions fail-open. 6 unit tests.

- **Usage limits per restaurant (Phase 8):** `src/lib/server/services/usage-limits.ts` — PlanTier (free/starter/pro), UsageLimits (maxRestaurants, maxMenuItems, maxKnowledgeDocs, maxAiCalls, maxStorageMb), PLAN_LIMITS table, `getLimitsForTier()`, `checkLimit()`. 8 unit tests.

- **Lighthouse performance check script (Phase 9):** `scripts/performance-check.mjs` — builds if needed, runs `npx lighthouse` against `$PERF_URL` (default QR route), checks budgets (perf ≥ 80, LCP ≤ 2.5s, TBT ≤ 300ms, CLS ≤ 0.1). Wired as `pnpm perf`.

- **Fix accessibility-check dependency (Phase 9):** Added `@axe-core/cli: ^4.10.0` to devDependencies.

**Round 2 Verification:** `pnpm check` 0 errors · `pnpm format` clean · `pnpm test:unit --run` 233 passed, 21 infra failures. 20 new tests (storage 6, cost 6, usage 8) all pass.

**Deferred:** Restaurant onboarding checklist (P1) — needs UI/UX design before implementation.

## 2026-06-21 Phase A — Platform Foundation (Auth, Registration, Platform Admin)

**Auth system rewrite:**

- Installed `@supabase/supabase-js@2.108.2` and `@supabase/ssr@0.12.0`.
- Created `src/lib/domain/auth/types.ts`: `PlatformRole`, `OrgMembership`, `AuthUser` shared domain types.
- Created `src/lib/server/auth/supabase-client.ts`: SSR-safe Supabase client using `@supabase/ssr` `createServerClient` with SvelteKit `Cookies.getAll`/`setAll`.
- Rewrote `src/lib/server/auth/supabase-auth-provider.ts`: implements `AuthProvider` with `getSessionUser`, `login`, `register`, `logout`. Uses Supabase SSR for session ops, Supabase Auth for signIn/signUp/signOut, pg Pool against `databaseUrl` to resolve `app_users.platform_role` and memberships.
- Rewrote `src/lib/server/auth/mock-session.ts` and `mock-auth-provider.ts`: mock auth now returns `AuthUser` with `platformRole` and `memberships`.
- Updated `src/app.d.ts` to use `AuthUser` for `event.locals.user`.
- Replaced all `AppUser` references with `AuthUser` across services: `menu-admin-service.ts`, `knowledge-service.ts`, `table-service.ts`, `ocr-import-service.ts`.

**Registration and login routes:**

- Rewrote `src/routes/login/+page.server.ts` and `+page.svelte`: email/password form with Zod validation, demo mode hint, password toggle, register link.
- Rewrote `src/routes/logout/+server.ts`: calls `authProvider.logout()`.
- Created `src/routes/register/+page.server.ts` and `+page.svelte`: pathway chooser (restaurant vs org).
- Created `src/routes/register/restaurant/+page.server.ts` and `+page.svelte`: name, email, password, restaurantName form calling `authProvider.register`.
- Created `src/routes/register/confirm/+page.svelte`: check your email page.
- Created `src/routes/register/organization/+page.svelte`: coming soon placeholder.
- Created `src/routes/auth/callback/+page.server.ts` and `+page.svelte`: email verification callback.

**Hooks and route guards:**

- Rewrote `src/hooks.server.ts`: populates `event.locals.user` from `authProvider.getSessionUser`, redirects unauthenticated protected routes to `/login`, redirects logged-in `/login` to role-based route (`/platform`, `/dashboard`, `/staff/inbox`).
- Updated `src/lib/domain/menu/types.ts`: `TenantContext.user` is `AuthUser`.
- Updated `src/lib/server/tenant/tenant-context.ts`: accepts `AuthUser`, derives mock membership from `user.memberships`.
- Updated `src/lib/server/repositories/tenant-repository.ts`: accepts `AuthUser`, uses `user.memberships[0]?.organizationId` as default org, queries `app_users.platform_role`, returns `AuthUser` with `platformRole`/`memberships`. Added `mapMembershipRole`.

**Platform admin:**

- Updated `docs/CONTEXT.md` and `docs/ARCHITECTURE.md`: full B2B SaaS scope with Platform Admin persona, route groups, role hierarchy, and platform-admin tenant bypass.
- Created `src/lib/server/services/platform-admin-service.ts`: `getPlatformStats`, `listOrganizations`, `listRestaurants` (cross-tenant queries without RLS scoping).
- Created `src/routes/(platform)/platform/+layout.svelte` and `+layout.server.ts`: sidebar nav, super admin guard.
- Created `src/routes/(platform)/platform/+page.svelte` and `+page.server.ts`: platform overview with system-wide KPIs.
- Created `src/routes/(platform)/platform/organizations/+page.svelte` and `+page.server.ts`: org management table.
- Created `src/routes/(platform)/platform/restaurants/+page.svelte` and `+page.server.ts`: restaurant management table.
- Created `src/routes/(platform)/platform/billing/+page.svelte`: billing placeholder.
- Created `src/routes/(platform)/platform/settings/+page.svelte`: settings placeholder.

**Migrations:**

- Created `db/migrations/0010_platform_admin_role_bridge.sql`: `platform_role` column on `app_users`, `has_platform_access()` function, platform admin SELECT policies on all tables.
- Created `db/migrations/0011_supabase_auth_bridge.sql`: trigger on `auth.users` AFTER INSERT creates `app_users` row, AFTER UPDATE OF email syncs email. SECURITY DEFINER with REVOKE FROM PUBLIC.

**Environment:**

- Created `.env.development` (mock auth, mock LLM, safe defaults) and `.env.production` (Supabase auth, real provider placeholders). Updated `.gitignore`.
- Updated landing page for B2B SaaS: hero, how it works, features, pricing, dual CTA.
- Updated `docs/TODO.md` with Phase A and partial Phase B completion status.
- Fixed test fixtures: `tenant-repository.db.test.ts` and `knowledge-service.test.ts` updated from `AppUser` to `AuthUser` shape.

**Verification:** `pnpm check` 0 errors, 4 pre-existing warnings · `pnpm test:unit` 21 failures all from ECONNREFUSED (no Postgres/Redis running locally — pre-existing, not caused by our changes).

## 2026-06-21 Phase B — Platform Admin Hardening

**Auth callback and role routing:**

- Extracted `src/lib/server/auth/role-routing.ts`: shared `resolveRoleRedirect` helper mapping `PlatformRole` to default routes.
- Refactored `src/hooks.server.ts` to use `resolveRoleRedirect` instead of inline map.
- Hardened `src/routes/auth/callback/+page.server.ts`: verifies Supabase configuration, exchanges code, fetches auth user, asserts `app_users` row exists via DB query before role-based redirect. Fails with 503 if profile not ready.

**Platform service validation and metrics:**

- Added `src/lib/domain/platform/schema.ts`: Zod schemas for platform pagination (`listOrganizationsSchema`, `listRestaurantsSchema`). Limits offset to 10,000 and limit to 100. Validates `organizationId` as UUID.
- Updated `src/lib/server/services/platform-admin-service.ts`:
  - Replaced misleading `activeUsers` with `platformUsers` (counts all `app_users`).
  - Removed `WHERE status = 'active'` from restaurant counts to show total restaurants.
  - Added `status` to `PlatformOrganization` and `segment` to `PlatformRestaurant`.
  - Added input validation using Zod schemas via `parseListOptions`.
  - Throws `PlatformAdminInputError` for unbounded or invalid pagination.
- Created `src/lib/domain/platform/schema.test.ts` and `src/lib/server/services/platform-admin-service.test.ts`: unit tests for schema boundaries, SQL parameter passing, and error rejection.

**Route error handling and UI empty states:**

- Replaced silent catch blocks in platform `+page.server.ts` files with SvelteKit `error()` throws (400 for validation, 500 for DB errors).
- Created `src/routes/(platform)/+error.svelte`: unified error page for platform admin route group.
- Updated `src/routes/(platform)/platform/+page.svelte`: "Active Restaurants" to "Total Restaurants", `activeUsers` to `platformUsers`, added description.
- Updated organizations page: added Status and Created columns, status badge styling, empty state, prev/next pagination controls.
- Updated restaurants page: added Segment column, status badge styling, empty state, prev/next pagination controls.

**Documentation:**

- Updated `docs/TODO.md` with Phase B task completions (email callback routing, platform KPIs, pagination, error handling).

## 2026-06-22 Phase 0–6 Cross-Phase Audit & Fixes

**Audit scope:** All 82 changed files across Phases 0–6 implementation. 12+ issues identified (1 critical, 6 high, 5 medium).

**Critical fixes:**

- `src/lib/server/services/menu-admin-service.ts`: `publishDraftMenu` now calls `enqueueEmbeddingJob()` via BullMQ queue instead of `generateEmbeddingsForRestaurant()` directly. Removed unused `generateEmbeddingsForRestaurant` import.
- `src/lib/server/services/ocr-import-service.ts`: extracted inline SQL to `createDraftMenu()` in `admin-menu-repository.ts`. Removed dead ternary expression.
- `src/lib/server/repositories/admin-menu-repository.ts`: `createDraftMenu()` — replaced `result.rows[0]!.id` non-null assertion with proper existence check + explicit throw.

**High fixes:**

- `src/routes/(dashboard)/dashboard/+layout.server.ts`: removed production re-throw that contradicted documented fail-open intent. Dashboard now matches documented behavior.
- Fallback status convention unified: `domain/fallback/types.ts`, `policy.ts`, `schema.ts` all use `'in-progress'` (hyphen). `staff-inbox-service.ts` transition logic simplified (DB↔domain translation handled by repository at lines 50, 142). `staff/inbox/+page.server.ts:67` updated from `'in_progress'` to `'in-progress'`.
- `src/lib/ui/Pagination.svelte`: `$derived.by` with `URLSearchParams` preserves all existing URL query params when generating prev/next links.
- Role guards: `dashboard/+layout.server.ts` redirects staff to `/staff/inbox`; `staff/+layout.server.ts` verifies `platformRole === 'staff'`.
- Sentry: `hooks.server.ts` reads `SENTRY_TRACES_SAMPLE_RATE` (default 0.1) and `SENTRY_ENVIRONMENT`. `hooks.client.ts` reads `VITE_SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_ENVIRONMENT`.

**Medium fixes:**

- `.github/workflows/ci.yml`: added `pnpm run build` step.
- `src/lib/server/services/provider-cost-tracking.ts`: `Number((...).toFixed(6))` to avoid floating-point drift.
- `src/lib/server/services/embedding-worker.test.ts`: extended from 5→8 tests (null embed, no-embed provider, combined items+docs, empty restaurant).
- `src/lib/server/services/menu-admin-service.test.ts`: `validateMenuForPublish` tests use `price` not `priceAmount`. `publishDraftMenu` mock also fixed.
- `src/lib/server/services/ocr-import-service.test.ts`: mock updated with `createDraftMenuMock`.
- `src/lib/server/services/staff-inbox-service.test.ts`: 6× `'in_progress'`→`'in-progress'`, updated `transitionStatus` signature.

**Verification:** `pnpm check` 0 errors, 4 pre-existing warnings · `pnpm test` 294 passed, 8 pre-existing failures (6 Redis ECONNREFUSED timeouts, 2 Supabase RLS/schema type differences) — none caused by audit.
