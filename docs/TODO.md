# ainything TODO

This plan covers the full ainything product: a multi-tenant UMKM SaaS platform for restaurants, retail, and service businesses. One deployment serves many organizations, many outlets, many staff, and many anonymous buyer sessions.

**Active Redesign Implementation:** See `docs/REDESIGN_PLAN.md` and `docs/REDESIGN_TODO.md` for the v2.0 production redesign (multi-tenant, tap-first, cart/order flow, role-based dashboards, new design system with emerald/amber/rose palette). This file tracks the original MVP implementation.

Legend: `[x]` done, `[ ]` todo, `[~]` intentionally skipped/deferred, `[/]` in progress, `[!]` broken/blocked.

## How To Use This File

- Work top to bottom inside the active phase. Do not skip ahead unless a task is explicitly marked parallel-safe.
- Every backend/AI task must end green on `pnpm check`, relevant `pnpm test`, and (where touched) `pnpm lint` before it is marked `[x]`.
- Any task touching RLS policies, public APIs, allergen/halal logic, auth/session, provider adapters, or the public route bundle requires the review discipline in `docs/ARCHITECTURE.md` section 13.
- When a task changes product scope, stack, data model, or module boundaries, update the matching doc (`PRD_ainything.md`, `Technical_Specification.md`, `ARCHITECTURE.md`, `CONTEXT.md`) in the same change and log it in `docs/COMPLETE-TODO.md`.

## Cross-Cutting Engineering Guardrails (apply to every phase)

- [x] Keep domain logic out of `.svelte` files and out of route files; routes orchestrate only.
- [x] No repository or provider import from UI components.
- [x] Public customer route owns the performance budget; admin/AI code must be lazy-loaded and must not bloat the public bundle.
- [x] Every tenant-owned query must be scoped by `organization_id` and/or `restaurant_id`; never trust a browser-supplied tenant id without server validation.
- [x] Guest-derived tenant ids (organization/restaurant) must be resolved server-side from the QR resolution result, never read from the request body.
- [x] Every new server input boundary (form action, `+server.ts`, public API) validates with a Zod schema.
- [x] Every external provider (LLM, OCR, WhatsApp, storage, telemetry) sits behind an adapter interface with a mock implementation committed before the real one.
- [x] Secrets stay server-only; never expose DB URLs, API keys, or session secret to the browser.

---

## Phase A — Platform Foundation (Auth, Registration, Landing Page)

The first thing any user sees. Hotel/tourist restaurant owners must be able to discover ainything, understand the value proposition, register, and start onboarding without manual intervention from the platform owner.

### A1. Authentication (self-hosted credentials)

Production uses `AUTH_PROVIDER=credentials` (Auth.js with bcrypt + PostgreSQL).
Supabase Auth adapter also available but is NOT the default. See `docs/Technical_Specification.md`.

- [x] Auth provider adapter interface exists (`src/lib/server/auth/types.ts`).
- [x] Auth factory exists (`src/lib/server/auth/auth-factory.ts`, switch via `AUTH_PROVIDER` env).
- [x] CredentialsAuthProvider: bcrypt password hash, PostgreSQL sessions.
- [x] SupabaseAuthProvider: Supabase SSR cookie helpers (deprecated, kept for compatibility).
- [x] Registration: email/password with restaurant + org pathways.
- [x] Login: email/password with session cookies.
- [x] Password reset flow (`/auth/forgot-password`, `/auth/update-password`).
- [x] Auth guard: redirect unauthenticated users to `/login` (hooks.server.ts + layout server loads).
- [x] Platform role bridge: `platform_role` column, `has_platform_access()`, admin SELECT policies.

### A2. Landing Page

- [x] Replace current root `+page.svelte` (workspace hub) with proper marketing landing page.
- [x] Hero section: value proposition, target audience (restaurant owners in tourist areas).
- [x] How it works section: scan QR → browse menu → AI answers → staff fallback.
- [x] Features section: multilingual menu, AI guest support, staff inbox, analytics.
- [x] Pricing section: free/starter/pro tiers.
- [x] Two CTAs: "I have one restaurant" → `/register/restaurant`, "I manage multiple" → `/register/organization`.
- [x] Testimonials section with 3 testimonial cards.
- [x] Footer with product, company, legal columns (using Footer.svelte).
- [x] i18n for landing page strings (EN + ID — keys existed, wired to UI).

### A3. Registration Flow (Hybrid)

- [x] `/register` — entry page with the two pathways.
- [x] `/register/restaurant` — restaurant-first flow:
  - [x] Step 1: Account (email, password, name).
  - [x] Step 2: Restaurant details (name, slug, segment, location, language, timezone).
  - [x] Step 3: Confirmation + email verification sent.
  - [x] Auto-creates organization behind the scenes (1:1 mapping) — `provisionOrganizationAndRestaurant` creates org + restaurant + membership + `default_organization_id` in a single transaction.
- [x] `/register/organization` — organization-first flow:
  - [x] Step 1: Account + organization name/slug (`/register/organization/+page.svelte` + `+page.server.ts`).
  - [x] Step 2: First restaurant creation — uses existing `/register/restaurant/setup` wizard (same flow).
  - [x] Step 3: Confirmation + email verification sent.
- [x] Email verification callback: verify token, activate account, redirect to role-based route.
- [x] Server-side slug validation: `GET /api/public/slug-check?slug=&type=both` — real-time check on registration Step 2 with 400ms debounce and availability badge.
- [x] Post-verification redirect to `/dashboard/onboarding?step=1` when auth code present (`/auth/callback`).

### A4. Login

- [x] Replace `/login` with real Supabase email/password form.
- [x] "Forgot password" link → `/auth/forgot-password`.
- [x] Password reset flow: `/auth/forgot-password` (request email) + `/auth/update-password` (set new password via email token).
- [x] "Don't have an account? Register" link.
- [x] Role-based redirect after login:
  - [x] `super_admin` → `/platform`
  - [x] `org_owner` / `restaurant_admin` → `/dashboard`
  - [x] `staff` → `/staff/inbox`

---

## Phase B — Platform Admin (Super Admin Dashboard)

The platform owner/developer dashboard for managing the SaaS itself: all organizations, all restaurants, billing state, system health.

### B1. Platform Route Group

- [x] Create `src/routes/(platform)/` route group.
- [x] Create `/platform` layout: sidebar nav (overview, organizations, restaurants, billing, settings).
- [x] Create `+layout.server.ts`: super admin auth guard (redirect non-super-admin to `/dashboard`).
- [x] Role-aware navigation: platform admin sees system-wide stats, not restaurant-specific data.

### B2. Platform Overview

- [x] `/platform` — dashboard with system-wide KPIs:
  - [x] Total organizations, total restaurants, platform users.
  - [ ] Total guest sessions (30d), total AI calls (30d).
  - [x] New registrations (7d trend).
  - [x] Error handling and SvelteKit error pages.
  - [x] Quick links to recent organizations/restaurants.
- [x] Server load: aggregate queries across all tenants (super admin bypasses tenant scoping).

### B3. Organization Management

- [x] `/platform/organizations` — table of all organizations with search/filter.
  - [x] Columns: name, slug, plan tier, status, restaurants count, users count, created date.
  - [x] Server-side pagination with validated limit/offset.
  - [x] Status filter: active, paused, archived (server-side, URL param `?status=`).
- [x] `/platform/organizations/[slug]` — organization detail:
  - [x] Profile info (name, slug, plan, billing email, created date).
  - [x] List of restaurants under this org.
  - [x] Suspend/activate/archive actions.
  - [ ] Plan change action.

### B4. Restaurant Overview

- [x] `/platform/restaurants` — table of all restaurants with search/filter.
  - [x] Columns: name, slug, organization, segment, status, tables.
  - [x] Server-side pagination with validated limit/offset and optional organization filter.
- [x] `/platform/restaurants/[slug]` — restaurant detail:
  - [x] Profile (segment, tables, location, language, timezone, created date).
  - [x] Suspend/activate/archive actions.
  - [ ] Link to open restaurant as that tenant (impersonation for support).

### B5. Super Admin Data Access

- [x] `src/lib/server/services/platform-admin-service.ts` — cross-tenant queries for platform admin.
  - [x] Input validation using Zod pagination schemas.
  - [x] Accurate platform users count without misleading filters.
- [x] `src/lib/server/repositories/platform-repository.ts` — aggregate queries without tenant scoping.
- [ ] `GET /api/platform/stats` — system-wide KPI endpoint.
- [x] RLS exception: super admin (`app.has_platform_access()`) bypasses tenant scoping for read queries (migration 0010).

---

## Phase C — Restaurant Experience (Admin Dashboard + Staff)

Each restaurant gets its own admin dashboard, staff management, and customer-facing QR experience.

### C1. Restaurant Admin Dashboard

- [x] Dashboard overview with restaurant-scoped analytics.
- [x] Menu editor (CRUD with dietary flags, allergens, translations).
- [x] Menu import/review (OCR-assisted).
- [x] QR table manager with print-ready export.
- [x] Knowledge base editor.
- [x] Analytics: scans, top items, fallback rate, helpful rate, latency.
- [x] Restaurant profile/settings page (name, slug, segment, languages, timezone, logo).
- [ ] Public host/subdomain configuration.
- [ ] Plan/billing info display (read-only for now).

### C2. Staff Management per Restaurant

- [x] `/dashboard/staff` — list staff members for this organization.
- [x] Invite staff: email + role assignment (owner/manager/staff).
- [x] Invite flow: creates `invites` table row (migration 0012), token-based, 7-day expiry.
- [x] Staff gets email invite → email sent via SMTP (nodemailer, MockEmailProvider in dev) → sets password via `/auth/accept-invite` → redirected to `/staff/inbox`.
- [x] Remove staff (delete membership, owner-only).
- [x] Cancel pending invite (owner-only).
- [x] Role change (staff ↔ manager ↔ owner) — inline select with auto-submit, owner-only.
- [x] Accept invite flow: `/auth/accept-invite?token=...` — creates membership on accept.
- [ ] Staff cannot access other restaurants' data (enforced by RLS).

### C3. Staff Inbox

- [x] Staff inbox with real-time updates via SSE.
- [x] Fallback request list with table number, language, priority.
- [x] Claim/resolve workflow with state machine.
- [ ] Staff profile/settings page.
- [x] `selectedId` stale state fixed: initialised as `$state('')`, `selected` is `$derived(requests.find(...) ?? requests[0])` — always tracks live `requests` array.

---

## Phase D — Restaurant Self-Service Onboarding

Restaurants can sign up and go live without manual intervention from the platform owner.

### D1. Subdomain Auto-Generation

- [x] `src/lib/server/services/subdomain-service.ts`:
  - [x] `generateWorkspaceHost(slug: string): string` → `{slug}.ainything.online` (configurable via `PUBLIC_APP_DOMAIN`)
  - [x] `isWorkspaceHostAvailable(host: string): Promise<boolean>`
  - [x] `provisionSubdomain(organizationId: string): Promise<string>` — idempotent
  - [x] `tryProvisionSubdomain(organizationId)` — non-blocking wrapper, called after registration
- [x] `workspace_host` auto-provisioned on org creation (registration setup action).
- [ ] DNS: for MVP, wildcard DNS `*.ainything.online` → app server. SvelteKit host-resolver reads `Host` header. ⏳ **BLOCKED: butuh domain ainything.online + hosting**
- [ ] Future: automated DNS provisioning via DNS provider API (Cloudflare, Route53). ⏳ **BLOCKED: butuh domain + hosting**

### D2. Restaurant Onboarding Wizard

- [x] Post-registration onboarding wizard (`/dashboard/onboarding?step=1..4`):
  - [x] Step 1: Restaurant profile (confirms setup-page data — name, slug, segment, timezone).
  - [x] Step 2: Set up tables (bulk-create with prefix + count, T01…Tnn).
  - [x] Step 3: Create draft menu (first `menus` row with status=draft).
  - [x] Step 4: Go live — links to QR codes and menu import.
  - [ ] Wizard progress persistence (save draft, resume later).

### D3. Menu Go-Live Gate

- [x] Data Quality Gate (`canPublishMenu` in `menu/policy.ts`): every item must have name + price + availability.
- [x] Pre-publish checklist UI: blocking issues (red, publish disabled) and warnings (amber, publish allowed) shown in confirmation modal. Derived from `validateMenuForPublish` run at page load.
- [x] Block publish if any blocking issues exist (submit button disabled + 'Fix issues first' label).
- [x] Warn (allow publish) for non-blocking issues (amber section in modal, publish still allowed).

---

## Phase E — Public Customer Experience

The tourist-facing QR menu experience. No login, no install.

### E1. QR Entry

- [x] Path-based routing: `/r/[restaurantSlug]/table/[tableCode]`.
- [x] Subdomain routing layout stubbed: `{slug}.ainything.online/table/{code}` (host-resolver exists).
- [x] Host-header spoofing prevention.
- [ ] Route setup for subdomain-only production mode (redirect path-based to subdomain). ⏳ **BLOCKED: butuh domain ainything.online + hosting**

### E2. Customer PWA

- [x] Language selection (browser detection + manual).
- [x] Dietary preference setup.
- [x] Menu category browser.
- [x] Menu item detail.
- [x] AI chat panel with safety badges (confident, low-confidence, needs-staff, blocked).
- [x] Human fallback request.
- [x] Quick feedback.
- [x] Offline detection banner.
- [x] Skeleton loading states.
- [x] Unpublished menu state.
- [x] Arabic RTL layout support.
- [x] Arabic translation dictionary (~290 keys).

### E3. Public APIs

- [x] `GET /api/public/bootstrap` — restaurant + table + menu resolution.
- [x] `POST /api/public/sessions` — anonymous session creation.
- [x] `POST /api/public/chat` — AI chat with rate limiting + daily cap.
- [x] `POST /api/public/fallback` — staff fallback request.
- [x] `POST /api/public/feedback` — quick feedback.
- [x] Rate limiting (Redis-backed, per endpoint).
- [x] Request body size limits.
- [x] Input sanitization.
- [x] Tenant-spoof protection (server-derived tenant ids).

---

## Phase F — AI, OCR, and RAG

The intelligence layer: menu understanding, guest question answering, and menu digitization.

### F1. LLM Provider

- [x] Provider adapter interface (`LlmProvider`).
- [x] Mock provider (returns `needs-staff`, safe placeholder).
- [x] OpenAI-compatible provider (TokenRouter → MiniMax).
- [x] Anthropic provider.
- [x] Factory with env-based provider selection.

### F2. Retrieval (RAG)

- [x] pgvector migration + embedding tables.
- [x] Structured menu retrieval (SQL filters: dietary, allergen, availability).
- [x] Semantic search via embeddings (cosine similarity).
- [x] Hybrid retrieval service (structured + semantic, capped at 20 items).
- [x] Embedding worker (batch generation after publish, not in hot path).
- [x] Auto-trigger embedding on menu publish.

### F3. Guardrails

- [x] Do not answer outside restaurant scope.
- [x] Do not invent ingredients, prices, certifications, availability.
- [x] Escalate allergy/halal uncertainty to staff.
- [x] Respect sold-out/unavailable items.
- [x] Reasoning tag stripping (`think`, `<thinking>`, etc.).

### F4. OCR Import

- [x] OCR provider adapter (`OcrProvider`).
- [x] Mock provider with 4 fixture items.
- [x] Admin review workflow (scan → review → approve/reject → import).
- [x] Per-field confidence badges.

### F5. AI Event Logging

- [x] `ai_events` table logging: provider, model, prompt version, latency, tokens, confidence, safety flags.
- [x] Fail-open logging.

---

## Phase G — Analytics and Metrics

Data-driven product decisions and restaurant-facing insights.

### G1. Restaurant Analytics

- [x] Dashboard analytics: scans, helpful rate, fallback rate, top questions, top items.
- [x] Window selector (1/7/30/90 days).
- [x] Per-restaurant breakdown.

### G2. System Metrics

- [x] Platform admin analytics: aggregate across all restaurants (`/platform/analytics` — AI tiles, Growth 7d, quick links).
- [ ] Provider cost aggregation per restaurant per day (service exists, needs dashboard).
- [ ] Token usage trends per model per provider.
- [ ] Fallback rate trends across restaurants (identify which restaurants need better knowledge base).

### G3. Product Metrics Instrumentation

- [x] Fallback rate = `fallback_requests` / total chat sessions.
- [x] Helpful feedback = `feedback.helpful = true` / total feedback.
- [x] Latency p95 via `PERCENTILE_CONT` on `ai_events.latency_ms`.
- [x] Web Vitals buffer (LCP, FID, INP, CLS, TTFB).
- [x] Wire Web Vitals buffer to analytics backend: `POST /api/internal/vitals`, `web_vitals` table (migration 0013), `+layout.svelte` wired via `sendBeacon`/fetch.

---

## Phase H — Billing and Plans

Subscription management and plan enforcement.

### H1. Plan Definitions

- [x] Plan tiers: free, starter, pro (defined in `usage-limits.ts`).
- [x] Usage limits per plan: max restaurants, max menu items, max knowledge docs, max AI calls/day, max storage.
- [x] Limit checking (`checkLimit`).

### H2. Billing Integration (Future)

- [ ] Payment provider adapter interface.
- [ ] Stripe/Midtrans integration.
- [ ] Subscription lifecycle: trial → active → past_due → cancelled.
- [ ] Invoice generation and history.
- [ ] Plan upgrade/downgrade flow.
- [ ] Usage-based billing for AI calls beyond plan limit.

---

## Phase I — Infrastructure and DevOps

### I1. Container and Deployment

- [x] Vendor-neutral `compose.yml` (Podman preferred, Docker fallback).
- [x] `Containerfile` multi-stage build (Node 22, pnpm, non-root).
- [x] `@sveltejs/adapter-node` (replaces adapter-auto).
- [x] `Dockerfile` for production deployment.
- [x] Dockerfile ORIGIN hardcoded → fixed: `ENV ORIGIN=` (empty, runtime env injection via container orchestration).
- [x] `.containerignore`.

### I2. Database

- [x] PostgreSQL 16 via pgvector image.
- [x] Redis 7 for caching, rate limiting, pub/sub.
- [x] SQL migrations (`db/migrations/0001..0011`).
- [x] Seed data with multi-tenant demo.
- [x] RLS policies for tenant isolation.
- [x] Supabase-specific migrations: `auth.users` sync trigger, platform admin role (0010, 0011).
- [x] Local PostgreSQL testing infrastructure (no Supabase remote dependency).
- [x] `db/migrations/0011_local_auth_stub.sql` for local auth schema stub.
- [x] `.env.test` with `RUN_DB_TESTS=true` for deterministic offline DB tests.
- [x] `src/test-setup.ts` as Vitest `globalSetup` for env loading order.

### I3. CI/CD and Quality

- [x] `pnpm check` (TypeScript + SvelteKit).
- [x] `pnpm lint` (ESLint + Prettier).
- [x] `pnpm test:unit` (Vitest, 309 passed, local PostgreSQL).
- [x] `pnpm test:e2e` (Playwright, local PostgreSQL via superuser).
- [x] Playwright config with explicit local env overrides, 120s webServer timeout.
- [x] Bundle size checks (`scripts/check-bundle-size.mjs`).
- [x] Lighthouse performance check (`scripts/performance-check.mjs`).
- [x] Accessibility audit (`scripts/accessibility-check.mjs` + `@axe-core/cli`).
- [x] Dependency audit (`scripts/dependency-audit.mjs`).
- [x] CI workflow (`.github/workflows/ci.yml`): check+unit → build → e2e (3 jobs, postgres service, pnpm cache).

---

## Phase J — Pilot and Launch

### J1. Pre-Launch QA

- [x] E2E Playwright specs written: auth-flow, staff-flow, onboarding-flow, platform-admin-flow.
- [x] Full Playwright regression run on all flows (60/60 pass).
- [x] Load test public endpoints — `tests/load/k6-public-endpoints.js` with ramping VUs, p95 thresholds, 5 endpoints.
- [x] Security review: C1 customer_sessions UPDATE RLS, C2 onboarding auth bypass, M1 invites USING(true), M2 UUID validation, M3 metrics rate limit — migration 0016, Sentry Replay masking.
- [x] Privacy review: data retention 0017 (90d sessions, 180d feedback), `purge_expired_guest_data()`, privacy notice on guest page (i18n modal), Sentry maskAllText/blockAllMedia.

### J2. Pilot Package

- [x] QR table card design (print-ready) — enhanced @media print in `/dashboard/tables`, credit-card layout, A4 3-column grid.
- [x] Staff quick guide — `/dashboard/guide` in-app page (6 sections, printable).
- [x] Admin onboarding guide — `/platform/guide` (6 sections, printable, nav link added).
- [x] Feedback form for pilot participants — `/dashboard/feedback` (star rating, AI accuracy, setup difficulty, would-recommend, comment), migration 0018.

### J3. Launch

- [x] Production deployment checklist — `docs/deployment/DEPLOY.md` (10-step checklist, DNS, Supabase, env vars, Podman/Docker, nginx/Caddy, smoke tests, monitoring).
- [ ] Production Supabase project provisioning. ⏳ **BLOCKED: butuh domain + hosting**
- [ ] Production DNS + subdomain wildcard setup. ⏳ **BLOCKED: butuh domain ainything.online + hosting**
- [ ] Monitoring: Sentry, Supabase logs, custom health alerts. ⏳ **BLOCKED: butuh hosting**
- [ ] Pilot: 3-5 alpha restaurants → 10 beta restaurants. ⏳ **BLOCKED: butuh hosting**

---

## Phase K — Post-Launch Expansion

- [ ] Multi-branch restaurant locations.
- [ ] Custom domain support for enterprise.
- [ ] WhatsApp Business API integration (replaces internal staff inbox for selected workflows).
- [ ] Voice input for guest questions.
- [ ] Reservation integration (optional, post-pilot decision).
- [ ] POS integration (optional, post-pilot decision).
- [ ] Native mobile apps (if PWA metrics show demand).
- [ ] White-label option for large hospitality groups.

---

## Current Focus (2026-06-26)

Phases A, B, C, D, G2, B2, B3 complete. D1 subdomain service layer done. E2E specs + security hardening done. Brand rename Ainything → ainything complete. Checkout/payment/WA flow complete. **`pnpm check` passes 0 errors, 5 intentional warnings.**

### Completed (2026-06-26):

1. **Brand rename Ainything → ainything** — all source files, config, docs, migrations, seeds updated.
2. **Database migrations 0001–0020** — all apply cleanly via `pnpm db:reset` with local PostgreSQL.
3. **RLS policies** — `ainything_app` role with correct v2 policies in migration 0020.
4. **Local infra** — Podman containers running (ainything-postgres + ainything-redis).
5. **Checkout/payment/WA flow** (migrations 0014–0015):
   - `orders` table extended: `buyer_whatsapp`, `payment_proof_url`, `payment_confirmed_at/by`, `payment_rejected_at/by`, `payment_notes`.
   - `buyer_sessions` table extended: `whatsapp` column.
   - `outlets.settings` JSONB: `checkout_mode`, `require_buyer_whatsapp`, `payment_confirmation_enabled`.
   - Payment methods: `payment_methods` table + CRUD dashboard at `/dashboard/settings/payment`.
   - Cart (`/r/[slug]/cart`): WA field shown for `requireWhatsapp=true` OR `checkoutMode='online'`; auto-fill from localStorage; server validates requirement.
   - Order tracking (`/r/[slug]/order/[id]`): payment proof upload (JPEG/PNG/WebP, max 5MB); offline/online split; polling every 10s via `invalidateAll`; confirmed/rejected/pending status display.
   - Dashboard orders (`/dashboard/orders`): `confirmPayment` + `rejectPayment` actions; exposes `buyerWhatsapp` + `paymentProofUrl` to staff.
   - Settings (`/dashboard/settings`): checkout mode toggle (offline/online), require WA switch, payment confirmation switch; `?/checkout` action saves to `outlets.settings`.
   - WAHA provider: `waha-provider.ts` + factory updated; `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_API_KEY` env vars.
6. **Bug fixes (2026-06-26 audit)**:
   - `cart/+page.svelte`: `createCartStore` was inside `$derived` (recreated on every data change) — fixed to plain call at init.
   - `+page.svelte` (catalog): quick-add button now flashes green Check icon for 600ms as visual confirmation — prevents "did it add?" confusion for orang awam.
   - `cart/+page.svelte`: WA field now also shown in `checkoutMode='online'` even if `requireWhatsapp=false` (buyer needs WA for notifications).
7. **`pnpm check`** — 0 errors, 5 intentional warnings (editable form state initialized from server data once — correct Svelte 5 pattern; `createCartStore(data.slug)` called once at init by design).

### Blocked (need domain + hosting):

- DNS wildcard `*.ainything.online` → production server.
- Subdomain-only production mode routing.
- Production deployment (Hetzner CX23 Singapore).
- Monitoring setup (Sentry, health alerts).
- Pilot restaurants onboarding.
- Midtrans auto-confirm integration (needs Midtrans account).

### Completed (2026-06-26):

All Priority 1-3 items from the previous sprint are done. See `docs/COMPLETE-TODO.md` for full details.

- [x] WA notification after `insertOrder` — `notifyBuyerOrderPlaced` in `cart/+page.server.ts`
- [x] WA notification after staff confirms/rejects — `notifyBuyerPaymentConfirmed/Rejected` in `dashboard/orders/+page.server.ts`
- [x] Human-friendly order number `#XXXX` — migration `0016_order_number.sql`, `order_number SERIAL`, displayed everywhere
- [x] Seeder checkout settings — all 5 outlets seeded with full scenario coverage
- [x] QRIS image upload in `settings/payment` + display in `order/[id]/+page.svelte`
- [x] Staff inbox 15s polling — already present via `invalidate('app:inbox')`
- [x] E2E `checkout-flow.spec.ts` — offline, online+WA, online+no-WA, staff confirmation scenarios
- [x] Bug: `goto('?order=#0042')` — `#` corrupts URL as fragment anchor; fixed to use `order.fullId`
- [x] Bug: Dashboard orders detail panel missing buyer WA + payment proof — added "Pembayaran" section with wa.me link, proof image, confirm/reject buttons

### Completed (2026-06-26 — Sprint 2):

- [x] `/staff/orders/[id]` — `confirmPayment` + `rejectPayment` actions + wa.me tap link + proof image + confirm/reject buttons
- [x] `cart/+page.svelte` success screen — shows `#XXXX` order number from `form?.orderNumber`
- [x] `order/[id]/+page.svelte` — online mode without confirmation now shows context-aware instructions alongside payment methods

### Next steps — prioritized (can do now, no hosting needed):

1. E2E: run `checkout-flow.spec.ts` against a live dev DB to validate the full buyer flow end-to-end.
