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
