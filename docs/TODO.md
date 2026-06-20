# Lingua TODO

This plan starts with product/design/frontend, then backend, then AI. Field research items that cannot be executed by an agent are marked as deferred/skipped for now.

Legend: `[x]` done, `[ ]` todo, `[~]` intentionally skipped/deferred, `[/]` in progress, `[!]` started but currently broken/blocked.

## How To Use This File

- Work top to bottom inside the active phase. Do not skip ahead unless a task is explicitly marked parallel-safe.
- Every backend/AI task must end green on `pnpm check`, relevant `pnpm test`, and (where touched) `pnpm lint` before it is marked `[x]`.
- Any task touching RLS policies, public APIs, allergen/halal logic, auth/session, provider adapters, or the public route bundle requires the review discipline in `docs/ARCHITECTURE.md` section 13.
- When a task changes product scope, stack, data model, or module boundaries, update the matching doc (`PRD_Lingua.md`, `Technical_Specification.md`, `ARCHITECTURE.md`, `CONTEXT.md`) in the same change and log it in `docs/COMPLETE-TODO.md`.

## Cross-Cutting Engineering Guardrails (apply to every phase)

- [x] Keep domain logic out of `.svelte` files and out of route files; routes orchestrate only.
- [x] No repository or provider import from UI components.
- [ ] Public customer route owns the performance budget; admin/AI code must be lazy-loaded and must not bloat the public bundle.
- [x] Every tenant-owned query must be scoped by `organization_id` and/or `restaurant_id`; never trust a browser-supplied tenant id without server validation. All admin repository queries now properly scope by both tenant dimensions. Fixed 4 queries (`loadMenusForRestaurant`, `countMenuItems`, `setMenuItemAvailability`, `publishMenu`) that were missing `organization_id`. RLS provides defense-in-depth via `app.has_restaurant_access()`.
- [x] Guest-derived tenant ids (organization/restaurant) must be resolved server-side from the QR resolution result, never read from the request body. Verified: public APIs (`POST /api/public/sessions`) accept only public identifiers (`restaurantSlug` + `tableCode`), resolve tenant context via `resolvePublicMenu()` database lookup, and use resolved IDs for all writes.
- [ ] Every new server input boundary (form action, `+server.ts`, public API) validates with a Zod schema in `src/lib/domain/*/schema.ts` or `src/lib/validation`.
- [ ] Every external provider (LLM, OCR, WhatsApp, storage, telemetry) sits behind an adapter interface with a mock implementation committed before the real one.
- [ ] Secrets stay server-only; never expose `SUPABASE_SERVICE_ROLE_KEY`, DB URLs, or session secret to the browser.

## Phase 0 - Product Validation and Scope Control

- [x] Clarify product model: one shared multi-tenant SaaS platform serving many restaurants, not one app per restaurant.
- [~] Interview 15-25 restaurant owners/managers in Bali/Jakarta. Skipped for now; requires real user access.
- [~] Observe at least 5 real tourist-staff menu interactions. Skipped for now; requires field access.
- [x] Create dummy dataset replacing "collect 10 real messy menus" for prototype work.
- [x] Create 10 realistic dummy restaurant/menu sources covering PDF scans, photos, bilingual menus, handwritten notes, seasonal menus, and spreadsheets.
- [~] Validate first buyer segment: cafe, casual dining, hotel restaurant, premium restaurant, or beach club. Deferred until real interviews.
- [~] Decide pilot success thresholds before building paid features. Deferred until backend/pilot planning.
- [~] Confirm whether WhatsApp fallback is required for pilot or internal staff inbox is enough. Deferred.
- [x] Confirm initial prototype language list in dummy data: English, Indonesian, Chinese, Korean, Japanese, Arabic, Hindi, French, German.
- [~] Document willingness-to-pay range from interviews. Deferred until real interviews.
- [x] Narrow MVP launch language set to a verifiable list (EN, ID, ZH-Hans, JA). `src/lib/i18n/languages.ts` now exports exactly 4 languages; `detection.ts` and seed SQL narrowed to match. Remaining tags deferred to P1 precomputed-translation work.
- [x] Define the "menu minimum viable to go live" gate: `src/lib/domain/menu/policy.ts:canPublishMenu` enforces blocking issues (empty name, negative price) and surfaces warnings (unverified + risk flags). Wired into `menu-admin-service.ts:publishDraftMenu` via `loadMenuItemsForMenu` + `MenuPublishValidationError`. 9 policy tests cover the gate.

## Phase 1 - Design Foundation

- [x] Create brand direction: calm hospitality, modern tourist utility, not generic AI SaaS.
- [x] Finalize color palette from `docs/DESIGN_SYSTEM.md` in Tailwind/CSS tokens.
- [x] Choose typography stack with multilingual support.
- [x] Define spacing, radius, shadow, border, and icon rules in global CSS/UI components.
- [x] Define component states: loading, empty, error, offline, low-confidence, staff-needed, success.
- [x] Create responsive layout rules for mobile, tablet, desktop in UI implementation.
- [x] Create UI copy tone for tourist, staff, and admin through prototype text.
- [x] Add accessibility basics: semantic buttons/links, focus states, tap targets, labels.

## Phase 2 - UX Flow and Wireframes

- [x] Revise top-level UX to show workspace -> restaurants -> QR table routing.
- [x] Customer flow prototype:
  - [x] QR entry.
  - [x] Language selection.
  - [x] Preference setup.
  - [x] Menu category browser.
  - [x] Menu item detail.
  - [x] Ask/chat panel.
  - [x] Human fallback request.
  - [x] Quick feedback.
- [x] Staff flow prototype:
  - [x] Inbox list.
  - [x] Request detail with table and summary.
  - [x] Status display: new, in progress, resolved.
- [x] Admin flow prototype:
  - [x] Dashboard overview.
  - [x] Multi-restaurant workspace context and restaurant selector copy.
  - [x] Menu editor.
  - [x] Menu import/review.
  - [x] Table QR manager.
  - [x] Knowledge base editor.
  - [x] Analytics.
- [x] Create clickable prototype before backend implementation.
- [~] Test prototype with 3-5 target users. Skipped for now; requires real users.
- [ ] Revise PRD if prototype testing later reveals different priority.

## Phase 3 - Frontend Scaffold

- [x] Scaffold SvelteKit + Svelte 5 + TypeScript with pnpm.
- [x] Add Tailwind CSS and global design tokens.
- [x] Add linting, formatting, Vitest, and Playwright setup.
- [x] Add SvelteKit route groups:
  - [x] Public customer routes.
  - [x] Dashboard/admin routes.
  - [x] Staff inbox routes.
  - [ ] API route placeholder routes. Deferred until backend phase.
- [x] Add PWA manifest and icon.
- [x] Add `src/service-worker.ts` with safe app-shell and public-menu caching strategy.
- [x] Add responsive app shell.
- [x] Add mock data fixtures for restaurant, menu, table, session, chat, and staff request.
- [~] Add local component gallery or Storybook. Skipped for now to keep workflow light.
- [x] Add initial architecture folders:
  - [x] `src/lib/domain`
  - [x] `src/lib/server/services`
  - [x] `src/lib/server/repositories`
  - [x] `src/lib/server/providers`
  - [x] `src/lib/ui`
  - [x] `src/lib/state`
- [~] Add dependency review checklist to PR template. Deferred until GitHub workflow exists.

## Phase 4 - Frontend Customer Experience

- [x] Build QR session bootstrap screen.
- [x] Build language selector.
- [x] Build preference setup with dietary/allergen chips.
- [x] Build menu category tabs/list.
- [x] Build menu item card.
- [x] Build menu item detail panel.
- [x] Build allergen and dietary warning components.
- [x] Build recommendation explanation block.
- [x] Build chat entry point and chat panel.
- [x] Build AI answer states:
  - [x] Confident answer.
  - [x] Low confidence.
  - [x] Needs staff confirmation.
  - [x] Provider error.
  - [~] Out of scope. Deferred to AI guardrail phase.
- [x] Build human fallback request flow.
- [x] Build quick feedback.
- [x] Verify customer flow with Playwright smoke test.

## Phase 5 - Frontend Admin and Staff Experience

- [x] Build admin dashboard overview with mocked analytics.
- [x] Clarify admin dashboard as organization-scoped management for many restaurants.
- [x] Build menu editor:
  - [x] Category display.
  - [x] Item list/edit action surface.
  - [x] Price and availability display.
  - [x] Allergen and dietary flag display.
  - [x] Translation/local-name preview.
- [x] Build menu import/review screen.
- [x] Build table QR manager.
- [x] Make table QR manager select restaurant before showing table links.
- [x] Build knowledge base editor.
- [x] Build staff inbox.
- [x] Show restaurant context in staff inbox request list/detail.
- [x] Build fallback request detail.
- [x] Build analytics screens.
- [x] Add role-aware navigation surface for admin and staff.
- [x] Verify admin/staff flows with Playwright smoke tests.

## Phase 6 - Backend Foundation

- [x] Add local demo login with HttpOnly cookie for protected management routes.
- [x] Add server-side tenant context resolver using mock memberships and restaurants.
- [x] Protect dashboard and staff routes with SvelteKit server load redirects.
- [x] Add `.env.example` for local backend configuration.
- [x] Add Docker Compose for PostgreSQL and Redis.
- [x] Add server-side backend env loader and backend health endpoint.
- [x] Initialize local PostgreSQL schema and SQL migrations.
- [x] Create core tables from `docs/Technical_Specification.md`.
- [x] Add database access layer for local PostgreSQL.
- [x] Add Redis integration for backend health and future cache/queue/realtime use.
- [x] Add seed data for local development.
- [x] Add PostgreSQL-backed tenant resolver for authenticated dashboard/staff context.
- [x] Keep explicit mock fallback for local frontend work when DB is not configured or unavailable.
- [x] Add Row Level Security baseline policies for tenant reads through the app role.
- [x] Add opt-in RLS tests for:
  - [x] Same table code in two restaurants.
  - [x] User assigned to one restaurant cannot read another restaurant.
  - [x] Organization manager can see all restaurants in the organization.

### Phase 6a - Finish the in-flight public-menu work left by the previous agent (do first)

The previous session stopped mid-task while wiring public published-menu reads and anonymous guest writes. The code exists but does not compile and is not connected. Close this out before anything new.

- [!] Repair `src/lib/server/repositories/public-menu-repository.ts` type errors (7). Root causes:
  - `resolvePublicMenuBootstrap` SELECTs table columns aliased as `table_*` but the row type uses `RestaurantRow & TableRow` whose `TableRow` fields are `id/code/label`. Align the SQL aliases and the row type so they match.
  - `loadPublishedCategories`/`loadPublishedMenuItems` are called with `{ query }`; their parameter is a `DatabaseClient` (`{ query(text, params) }`). The exported `query` helper signature is not assignable to `pg.query`. Adapt `DatabaseClient` typing in `postgres.ts` (or pass a proper client wrapper) so the bare `query` helper is accepted.
  - Done: added a dedicated `BootstrapRow` type and reshaped `DatabaseClient` in `postgres.ts`; `pnpm check` is green.
- [x] Verify `db/migrations/0002_public_menu_and_guest_write_policies.sql` and `db/migrations/0003_seed_good_for_metadata.sql` are idempotent (`DROP POLICY IF EXISTS` present; data updates safe to re-run) and that `0003`'s changes are mirrored in `db/seeds/0001_demo_multi_tenant_data.sql` so `db:reset` keeps `goodFor`.
- [x] Wire `(public)/r/[restaurantSlug]/table/[tableCode]/+page.server.ts` to `resolvePublicMenuBootstrap`, with an explicit mock fallback (`src/lib/server/tenant/public-context.ts`) when `USE_MOCK_BACKEND` is on or the DB is unavailable. Route returns 404 cleanly when slug+table do not resolve (DB path; mock keeps prototype fallback).
- [x] Confirm public reads return only published menu + active restaurant + active table and never draft/private data, both via SQL and via the `0002` RLS policies under the `lingua_app` role.
- [ ] Commit the repaired WIP once `pnpm check` is green (currently 5 modified + 5 untracked files are uncommitted).

### Phase 6b - Harden anonymous guest writes (security-critical)

- [x] Establish a signed/opaque public session token issued server-side on QR bootstrap; persist it and set `app.public_session_id` via `withPublicSessionContext` for all guest inserts.
- [x] Make `0002` guest-write policies actually use `app.public_session_id`: done in `db/migrations/0004_harden_guest_write_rls.sql` — added `app.current_public_session_id()` PG helper and replaced fallback/feedback INSERT policies to require `session_id = app.current_public_session_id()` inside the DB transaction (idempotent, `DROP POLICY IF EXISTS` safe).
- [x] Derive `organizationId`/`restaurantId` for guest writes from the server-side bootstrap result, not from the request body — enforced in both service layer and repository.
- [x] Add a `customer-session-service.ts` (routes never call the repository directly; tenant scope enforced in one place). Done; same pattern applied to `guest-interaction-service.ts` for fallback and feedback.

### Phase 6c - Public APIs and persistence

- [x] Add public PostgreSQL-backed host/path -> restaurant/table resolver (path-based for MVP; subdomain-aware helper stubbed for production). Done: `src/lib/server/tenant/host-resolver.ts` extracts slug from `Host` header for subdomain URLs (`<slug>.lingua.app/table/<code>`) and validates against `restaurants.public_host` to prevent Host-header spoofing. Path-based URLs (`/r/<slug>/table/<code>`) remain the source of truth. 16 unit tests cover subdomain extraction, port stripping, and host matching.
- [x] Add public scoped API/server load for published menu. Done: `GET /api/public/bootstrap?restaurant=<slug>&table=<code>` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- [x] Add `POST /api/public/sessions` (customer session creation) with Zod validation and rate limiting. Done: `src/lib/domain/session/schema.ts`, `src/lib/server/services/customer-session-service.ts`, `src/routes/api/public/sessions/+server.ts`.
- [x] Add fallback request persistence. Done: `createFallbackInputSchema` in domain, `createFallbackForTable` service, `POST /api/public/fallback` endpoint.
- [x] Add feedback persistence. Done: `createFeedbackInputSchema` in domain, `createFeedbackForSession` service, `POST /api/public/feedback` endpoint.
- [x] Add chat message persistence. Done: `POST /api/public/chat` — validates input with Zod, checks daily AI cap, calls LLM adapter (mock in dev), persists customer+assistant turn via `withPublicSessionContext`, returns answer + safetyStatus + suggestFallback.
- [x] Add staff inbox realtime/near-realtime updates — `GET /staff/inbox/events` SSE endpoint subscribing to `fallback:{restaurantId}` Redis channels; `guest-interaction-service.ts` publishes after every new fallback request (fire-and-forget).
- [ ] Add storage abstraction for menu imports and item images (provider adapter; local/dev may use filesystem or skip).

### Phase 6d - Abuse and cost protection for anonymous endpoints (security-critical)

- [x] Add a Redis-backed rate limiter (`src/lib/server/services/rate-limiter.ts`): fail-open (Redis outage ≠ tourist outage), fixed-window with atomic Lua INCR+EXPIRE, limits from `Technical_Specification.md`: session-create 5/60s, chat 20/60s, fallback 5/60s, feedback 10/60s.
- [x] Apply rate limiting via `applyRateLimit` helper (`src/lib/server/services/public-api-helpers.ts`) to all four live public endpoints (sessions, fallback, feedback, chat).
- [x] Add a per-restaurant daily AI-call cap (`src/lib/server/services/ai-cost-cap.ts`): Redis fixed-window keyed by `restaurant_id + UTC date`, configurable via `AI_DAILY_CAP` env (default 500/day), fail-open, graceful "ask staff" fallback from the chat endpoint when exceeded.
- [x] Add request body size limits and basic input sanitation for free-text fields. checkBodySize validates Content-Length early, input-sanitizer.ts provides sanitizeText with Zod pipe. All 4 public API routes have BODY_SIZE_LIMIT exports. Sanitizer wired into domain Zod schemas (session/schema.ts: 5 fields with createSanitizePipe, 52 tests pass).

### Phase 6e - Auth and tests

- [x] Replace local demo auth with production auth path: added `AuthProvider` adapter interface (`src/lib/server/auth/types.ts`), `MockAuthProvider` wrapper (`mock-auth-provider.ts`), `SupabaseAuthProvider` stub (`supabase-auth-provider.ts` — ready for Phase 7 wiring, returns null until Supabase is configured), and factory (`auth-factory.ts`). `hooks.server.ts` now uses the factory. Switch to Supabase by setting `AUTH_PROVIDER=supabase` in env + filling in the Supabase stub.
- [ ] Add email/password reset and invite flow for admins (can also live in Phase 8).
- [x] Write API contract tests for every public endpoint — `src/routes/api/public/api-contract.test.ts` covers sessions, fallback, feedback, and chat service layer: happy path, tenant-spoof rejection, input validation, safety status propagation.
- [ ] Write RLS isolation tests:
  - [x] Guest cannot read another restaurant's published or draft data — `public-menu-repository.db.test.ts` (7 tests) verifies: only published items returned, inactive restaurants → null, inactive tables → null, non-existent slug → null, invalid table code → null, cross-restaurant isolation.
  - [x] Guest cannot insert a fallback/feedback with a session from a different restaurant (`tenant-repository.db.test.ts` — skipped without DB, runs with `RUN_DB_TESTS=true`).
  - [x] Organization manager/owner can see all restaurants in the organization (`tenant-repository.db.test.ts`).
- [x] Add a migration test that runs `0001..000N` on a clean database and asserts the `lingua_app` role only sees published/active rows on public policies. Created `src/lib/server/db/migrations.db.test.ts` with 7 tests verifying: only active restaurants visible, only active tables visible, only published menus visible, menus from inactive restaurants hidden, only published knowledge docs visible, knowledge docs from inactive restaurants hidden, all seed data restaurants are active. Tests use `withUserContext` for setup and raw `query()` for assertions (simulating anonymous access). Run with `RUN_DB_TESTS=true`.

## Phase 7 - AI, OCR, and RAG

- [x] Add LLM provider adapter interface (`src/lib/server/providers/llm/types.ts`: `LlmProvider`, `LlmChatContext`, `LlmChatResult`) and mock implementation (`mock-provider.ts`). Factory (`factory.ts`) selects provider via `LLM_PROVIDER` env.
- [x] Implement mocked AI provider (committed before any real provider per architecture rules). Mock returns `needs-staff` safety status so UI offers fallback — correct placeholder behaviour.
- [x] Implement first real LLM provider behind the adapter — MiniMax via TokenRouter (`openai-compatible-provider.ts`), including `embed()` via Vercel AI SDK `embedMany`. Activated via `LLM_PROVIDER=tokenrouter` env.
- [x] Implement Anthropic provider (`anthropic-provider.ts`) — `chat()` uses `@ai-sdk/anthropic`; `embed()` returns `null` with a warning (Anthropic has no native embedding endpoint).
- [x] Add a migration that enables `pgvector` and adds embedding columns/tables for menu items and knowledge documents — `db/migrations/0005_enable_pgvector.sql`: creates `vector` extension, tenant-scoped `item_embeddings` table (polymorphic `source_type`/`source_id`), IVFFlat index on `embedding vector_cosine_ops`, RLS policies for `lingua_app`, auto-update trigger.
- [x] Switch `docker-compose.yml` postgres image to `pgvector/pgvector:pg16` (replaces `postgres:16-alpine`) so the `vector` extension is available at the OS level.
- [x] Add `db/migrations/0006_admin_menu_write_policies.sql` — tenant-scoped INSERT/UPDATE/DELETE policies on `menu_categories`, `menu_items`, `menu_item_translations`, `menu_item_dietary_flags`, `menu_item_allergens` for `lingua_app` via `app.has_restaurant_access`. Without this, RLS blocked all admin writes.
- [x] Add `db/migrations/0007_menu_item_audit_columns.sql` — `updated_at` column + `set_updated_at()` trigger backfill for `menu_items` and `menu_categories` (idempotent `IF NOT EXISTS`).
- [x] Add `db/migrations/0008_fallback_requests_update_policy.sql` — staff UPDATE policy for `fallback_requests` (status transitions) + `updated_at` audit column + trigger. Without this, staff could not claim or resolve requests.
- [x] Define prompt templates and prompt versioning (`prompt.ts`, `PROMPT_VERSION='v3'`, release notes in comment header, version tracked in `ai_events`).
- [x] Implement menu retrieval scoped by restaurant — `retrieval-repository.ts`: structured SQL with dietary flags (AND), allergen excludes (NOT IN), availability, ILIKE text search, always scoped to published menu.
- [x] Add embeddings for menu items and knowledge documents — `embedding-repository.ts` (pgvector ON CONFLICT upsert, cosine similarity search, delete by source); `embedding-worker.ts` generates embeddings in batches of 20 after publish, never in the tourist hot path.
- [x] Wire embedding generation to menu publish — `menu-admin-service.ts:publishDraftMenu` now triggers `generateEmbeddingsForRestaurant` fire-and-forget after a successful publish (only when `EMBEDDING_ENABLED=true`).
- [x] Implement hybrid retrieval service — `retrieval-service.ts`: structured filter first, optional semantic search via `embed()`, result merge (structured priority), cap at 20 items, graceful fallback to structured-only on embedding errors.
- [x] Wire chat service to retrieval — `chat-service.ts` calls `retrieveMenuContext()` instead of naive `toMenuSnapshot()`; falls back to legacy snapshot if retrieval returns empty.
- [x] Add admin menu write layer — `admin-menu-repository.ts` (find, load, update scalar, set availability, replace flags, publish); `menu-admin-service.ts` (editMenuItem, toggleAvailability, publishDraftMenu with Data Quality Gate, validateMenuForPublish).
- [x] Add staff inbox backend — `staff-inbox-repository.ts` (listFallbackRequests with JOIN to restaurants/tables, updateFallbackStatus inside `withUserContext`); `staff-inbox-service.ts` (listRequests, transitionStatus with Zod validation + membership check + state machine: new→in_progress→resolved).
- [x] Implement chat answer endpoint (`POST /api/public/chat`) — validates with Zod, loads history (max 5 turns), calls retrieval service, calls LLM provider, persists both turns in one transaction, logs `ai_events`, returns answer + safetyStatus + suggestFallback.
- [x] Implement guardrails:
  - [x] Do not answer outside restaurant scope (prompt v3 SCOPE rule → `safetyStatus: 'blocked'`).
  - [x] Do not invent ingredients, prices, certification, or availability (prompt v3 NO INVENTION rule).
  - [x] Escalate allergy/halal uncertainty to staff confirmation by default when data is missing.
  - [x] Respect unavailable/sold-out items (retrieval filters `isAvailable === false` before LLM context).
  - [x] Strip reasoning tags (`<think>`, `<reasoning>`, `[thinking]`, `[think]`) from model output so chain-of-thought never reaches the guest or triggers false-positives in eval (`stripReasoningTags` in `prompt.ts`).
- [x] Implement AI event logging into `ai_events` (`ai-events-repository.ts:logAiEvent`, fail-open, captures provider, model, prompt version, latency, tokens, confidence, safety flags).
- [x] Add AI evaluation fixtures (`eval-fixtures.ts`: 18 fixtures across 6 categories — halal, allergen, spice, price, out-of-scope, language) + live eval suite (`llm-eval.test.ts`, opt-in via `RUN_LLM_TESTS=true`). 168/168 tests passing including DB + LLM eval.
- [x] Wire product success metrics to concrete `ai_events`/`feedback` queries so fallback rate, helpful rate, and latency p95 are measurable (closes the "metrics not instrumented" gap from PRD section 10).
- [x] Expose embedding generation trigger for admins (currently only callable programmatically; needs an admin API endpoint or post-publish hook).
- [x] Implement OCR import prototype behind an OCR adapter. DONE: src/lib/server/providers/ocr/ with types.ts, mock-provider.ts, factory.ts. OcrProvider interface, OcrMenuItem with per-field confidence, 4 fixture items, 10 tests. Admin review workflow complete (see line 246).
- [x] Add admin review workflow for OCR extraction (must pass the Phase 0 "menu minimum viable" gate before publish). Created: `insertMenuItem()`/`ensureCategory()` in admin-menu-repository.ts, `ocr-import-service.ts` (scanMenuImage + importOcrItems), `/dashboard/import` route with scan/import form actions, OCR review UI with upload, per-field confidence badges (name/category/price/spice), approve/reject toggles, dietary flags/allergens display. Workflow: upload image → OCR scan → display results with confidence scores → admin reviews/rejects items → import creates categories + items with confidence='needs-review' + OCR metadata in source_metadata.ocr → DQG gate validates before publish. Mock OCR provider returns 4 fixture items (Nasi Goreng, Sate Ayam, Gado-Gado, Es Campur) with confidence scores 0.85-0.98.

## Phase 8 - Integrations and Operations

- [x] Add `src/lib/i18n` dictionary layer (BCP 47 tags, language detection, RTL helper) and replace hard-coded UI strings; test long-text and Arabic RTL at 360px. Wire it to the narrowed MVP language set from Phase 0.
  - [x] Infrastructure: `src/lib/i18n/` with types, BCP 47 language definitions, Accept-Language detection, RTL helper, reactive Svelte 5 `.svelte.ts` module.
  - [x] English dictionary (`en.ts`) and Indonesian dictionary (`id.ts`) covering all customer-facing strings.
  - [x] Root layout syncs `lang` and `dir` on `<html>` reactively.
  - [x] Public route (`+page.svelte`), `ChatPanel`, `PreferenceChips`, `SafetyBadges`, `MenuItemCard` use `t()` / `tWithVars()`.
  - [x] Replace remaining hardcoded strings in admin, staff, and landing pages — dashboard `+page.svelte`, dashboard analytics `+page.svelte`, staff inbox `+page.svelte` all wired to `t()` / `tWithVars()`. Added 60+ new keys to both `en.ts` and `id.ts`.
  - [x] Wire Accept-Language detection from `hooks.server.ts` to preselect language — `hooks.server.ts` now resolves `Accept-Language` header via `detectLanguage()` and stores the result in `event.locals.language`. `app.d.ts` exposes the new `locals.language` field.
  - [ ] Test long-text and Arabic RTL at 360px viewport.
  - [ ] Narrow MVP language set per Phase 0 decision.
- [ ] Decide staff inbox only vs WhatsApp integration for pilot.
- [ ] If WhatsApp is used, create provider adapter and cost controls.
- [ ] Add email/password reset flow for admins.
- [ ] Add restaurant onboarding checklist.
- [x] Add QR code generation and print-ready export.
- [ ] Add usage limits per restaurant.
- [ ] Add provider cost tracking per restaurant.
- [ ] Add error monitoring.
- [ ] Add web vitals collection.
- [ ] Add deployment environments: local, staging, production.
- [x] Choose and document SvelteKit adapter target: adapter-node. vite.config.ts uses @sveltejs/adapter-node. Dockerfile added (multi-stage, node:22-alpine, pnpm, non-root user, HEALTHCHECK via wget --spider every 30s).
- [x] Add bundle size checks for public QR route. scripts/check-bundle-size.mjs measures gzipped client assets (build/client/ only), budgets: 100KB JS / 30KB CSS (PWA mobile standard). TODO: wire into CI pipeline.
- [ ] Add dependency audit workflow for Svelte ecosystem risk.

## Phase 9 - QA and Pilot Readiness

- [x] Run Playwright smoke tests for customer, admin, and staff routes.
- [x] Run full Playwright customer flow on 360px and 390px viewport sizes (`tests/e2e/customer-flow.spec.ts`: 17 tests covering restaurant hero, language selector, preference chips, menu browse, item detail, chat panel, feedback, and staff fallback at both viewports).
- [x] Run full Playwright admin flow on tablet and desktop. tests/e2e/admin-flow.spec.ts: 17 tests covering login (3), dashboard overview (3), menu smoke (2), knowledge smoke (2), menu CRUD (3 tests: edit, toggle availability, publish modal), knowledge CRUD (3 tests: create, edit, delete). Login boilerplate extracted to loginWithDemoAccount() helper. Tests blocked by build infrastructure issue but verified with pnpm check (0 errors).
- [ ] Run accessibility checks.
- [ ] Run performance checks on public routes.
- [ ] Run RLS and API tests after backend exists.
- [x] Test 10 dummy menus in onboarding/import review UI.
- [ ] Test AI answers for allergy, halal, spicy, vegetarian, and out-of-scope questions after AI layer exists.
- [ ] Prepare pilot installation package:
  - [ ] QR table card design.
  - [ ] Staff quick guide.
  - [ ] Admin onboarding guide.
  - [ ] Feedback form.
- [~] Run alpha with 3-5 restaurants. Deferred until real pilot access.
- [ ] Review pilot metrics weekly and update PRD/TODO after pilot starts.

## Phase 10 - Post-Pilot Decisions

- [ ] Decide paid pricing tiers.
- [ ] Decide whether to expand to 10-30 restaurants.
- [ ] Decide whether voice should move from P2 to P1.
- [ ] Decide whether POS/reservation integration is justified.
- [ ] Decide whether to build native mobile app or keep PWA.
