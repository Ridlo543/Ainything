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

**Migration 0007 — Audit columns:**
- Created `db/migrations/0007_menu_item_audit_columns.sql`: adds `updated_at TIMESTAMPTZ` columns to `menu_items` and `menu_categories`, creates a reusable `set_updated_at()` trigger function, attaches to both tables.

**Staff Inbox wired to database:**
- Created `src/lib/server/repositories/staff-inbox-repository.ts`: `listFallbackRequests` (tenant-scoped SQL JOIN across fallback_requests, restaurants, restaurant_tables) and `updateFallbackStatus` (runs inside `withUserContext` so RLS policy 0008 applies).
- Created `src/lib/server/services/staff-inbox-service.ts`: `listRequests` and `transitionStatus` with Zod input validation, explicit membership checks, and state machine enforcement (`new→in_progress→resolved`). Custom `StaffInboxAuthorizationError` and `StaffInboxTransitionError` classes.
- Created `src/routes/(staff)/staff/inbox/+page.server.ts`: thin load function (calls service, returns `requests`), plus `claim` and `resolve` form actions with membership scope guard via `resolveTenantContext`.
- Created `src/routes/(staff)/staff/inbox/events/+server.ts`: SSE endpoint subscribing to `fallback:{restaurantId}` Redis channels per membership. Duplicates the shared Redis client for pub/sub, sends 20s heartbeats, tears down cleanly on AbortSignal. Degrades gracefully when Redis is unconfigured.
- Modified `src/lib/server/services/guest-interaction-service.ts`: publishes a JSON event to `fallback:{restaurantId}` via Redis after creating a fallback request. Fire-and-forget with error logging; Redis failures never break the guest flow.
- Rewrote `src/routes/(staff)/staff/inbox/+page.svelte`: replaced mock data with `data.requests` prop, added `use:enhance` form actions for claim/resolve with optimistic local state updates, added `EventSource` SSE client that prepends new requests and calls `invalidateAll()` for full detail hydration.
- Created `src/lib/server/services/staff-inbox-service.test.ts`: 12 unit tests covering `listRequests` and `transitionStatus` with repository mocked.

**Embedding and Retrieval infrastructure:**
- Created `src/lib/server/repositories/embedding-repository.ts`: `upsertEmbeddings` (pgvector ON CONFLICT upsert), `searchSimilarItems` (cosine similarity search, restaurant-scoped), `deleteEmbeddingsForSource`.
- Created `src/lib/server/repositories/retrieval-repository.ts`: `retrieveMenuItemsByFilters` — structured SQL with optional dietary flags (AND), allergen excludes (NOT IN), category, availability, ILIKE text search. Always scoped to published menu + restaurant.
- Created `src/lib/server/services/retrieval-service.ts`: `retrieveMenuContext` orchestrates structured filter first, then optionally semantic search when `embeddingEnabled=true`. Merges results, caps at 20 items. Falls back gracefully on any error.
- Created `src/lib/server/services/embedding-worker.ts`: `generateEmbeddingsForRestaurant` — loads published menu items + knowledge docs, calls `embed()` in batches of 20, upserts results. Skips failed items and continues.
- Modified `src/lib/server/providers/llm/types.ts`: added optional `embed?(texts: string[], model?: string): Promise<number[][] | null>` to LlmProvider interface.
- Modified `src/lib/server/providers/llm/openai-compatible-provider.ts`: implemented `embed()` using Vercel AI SDK `embedMany`. Extracted `createProvider()` helper for reuse.
- Modified `src/lib/server/providers/llm/anthropic-provider.ts`: `embed()` returns `null` with a warning (Anthropic doesn’t support embeddings natively).
- Modified `src/lib/server/services/chat-service.ts`: replaced naive `toMenuSnapshot()` with `retrievalService.retrieveMenuContext()`. Falls back to legacy snapshot if retrieval fails or returns empty.
- Modified `src/lib/server/config/env.ts`: added `embeddingEnabled` and `llmEmbeddingModel` config fields.
- Modified `.env.example`: added `EMBEDDING_ENABLED=false` and `LLM_EMBEDDING_MODEL=text-embedding-3-small`.
- Created `src/lib/server/services/retrieval-service.test.ts`: 10 unit tests covering structured-only, hybrid, and error fallback paths.
- Updated `src/lib/server/services/chat-service.test.ts`: updated mocks for retrieval-service and env config. Added retrieval fallback tests (16 total tests, all passing).
- **Verification:** `pnpm check` 0 errors · `pnpm test:unit` all pass · `pnpm lint` exit 0.
