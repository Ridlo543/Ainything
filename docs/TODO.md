# Lingua TODO

This plan covers the full Lingua product: a multi-tenant QR menu + guest support SaaS for restaurants serving international tourists. One deployment serves many organizations, many restaurants, many staff, and many anonymous guest sessions.

Legend: `[x]` done, `[ ]` todo, `[~]` intentionally skipped/deferred, `[/]` in progress, `[!]` broken/blocked.

## How To Use This File

- Work top to bottom inside the active phase. Do not skip ahead unless a task is explicitly marked parallel-safe.
- Every backend/AI task must end green on `pnpm check`, relevant `pnpm test`, and (where touched) `pnpm lint` before it is marked `[x]`.
- Any task touching RLS policies, public APIs, allergen/halal logic, auth/session, provider adapters, or the public route bundle requires the review discipline in `docs/ARCHITECTURE.md` section 13.
- When a task changes product scope, stack, data model, or module boundaries, update the matching doc (`PRD_Lingua.md`, `Technical_Specification.md`, `ARCHITECTURE.md`, `CONTEXT.md`) in the same change and log it in `docs/COMPLETE-TODO.md`.

## Cross-Cutting Engineering Guardrails (apply to every phase)

- [x] Keep domain logic out of `.svelte` files and out of route files; routes orchestrate only.
- [x] No repository or provider import from UI components.
- [x] Public customer route owns the performance budget; admin/AI code must be lazy-loaded and must not bloat the public bundle.
- [x] Every tenant-owned query must be scoped by `organization_id` and/or `restaurant_id`; never trust a browser-supplied tenant id without server validation.
- [x] Guest-derived tenant ids (organization/restaurant) must be resolved server-side from the QR resolution result, never read from the request body.
- [x] Every new server input boundary (form action, `+server.ts`, public API) validates with a Zod schema.
- [x] Every external provider (LLM, OCR, WhatsApp, storage, telemetry) sits behind an adapter interface with a mock implementation committed before the real one.
- [x] Secrets stay server-only; never expose `SUPABASE_SERVICE_ROLE_KEY`, DB URLs, or session secret to the browser.

---

## Phase A — Platform Foundation (Auth, Registration, Landing Page)

The first thing any user sees. Hotel/tourist restaurant owners must be able to discover Lingua, understand the value proposition, register, and start onboarding without manual intervention from the platform owner.

### A1. Real Authentication (Supabase Auth)

- [x] Install `@supabase/supabase-js` and `@supabase/ssr`.
- [x] Auth provider adapter interface exists (`src/lib/server/auth/types.ts`).
- [x] Auth factory exists (`src/lib/server/auth/auth-factory.ts`, switch via `AUTH_PROVIDER` env).
- [x] Implement real `SupabaseAuthProvider` (`getSessionUser` via Supabase SSR cookie helpers, login, register, logout).
- [x] Create `src/lib/server/auth/supabase-client.ts` — SSR-safe Supabase client factory.
- [x] Add `auth.users` → `public.app_users` sync trigger (migration 0011).
- [x] Add Supabase env vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (.env.development/.env.production).
- [x] Registration: email/password sign-up with email verification (restaurant + org pathways).
- [x] Login: email/password sign-in with Supabase session cookies.
- [ ] Password reset flow (`/auth/reset-password`, `/auth/update-password`).
- [x] Email verification callback page (`/auth/callback`).
- [x] Remove mock demo auth session code (keep mock provider for tests only).
- [x] Auth guard: redirect unauthenticated users to `/login` for all protected routes (hooks.server.ts + layout server loads).
- [x] Platform role bridge: migration 0010 adds `platform_role` column, `has_platform_access()`, and platform admin SELECT policies.

### A2. Landing Page

- [x] Replace current root `+page.svelte` (workspace hub) with proper marketing landing page.
- [x] Hero section: value proposition, target audience (restaurant owners in tourist areas).
- [x] How it works section: scan QR → browse menu → AI answers → staff fallback.
- [x] Features section: multilingual menu, AI guest support, staff inbox, analytics.
- [x] Pricing section: free/starter/pro tiers.
- [x] Two CTAs: "I have one restaurant" → `/register/restaurant`, "I manage multiple" → `/register/organization`.
- [ ] Testimonials/testimonial placeholders.
- [ ] Footer with links, privacy, contact.
- [ ] i18n for landing page strings (EN + ID minimum).

### A3. Registration Flow (Hybrid)

- [x] `/register` — entry page with the two pathways.
- [x] `/register/restaurant` — restaurant-first flow:
  - [x] Step 1: Account (email, password, name).
  - [ ] Step 2: Restaurant details (name, slug, segment, location, language, timezone).
  - [x] Step 3: Confirmation + email verification sent.
  - [ ] Auto-creates organization behind the scenes (1:1 mapping).
- [ ] `/register/organization` — organization-first flow:
  - [ ] Step 1: Account + organization name/slug.
  - [ ] Step 2: First restaurant creation (same wizard as restaurant-first step 2).
  - [ ] Step 3: Confirmation + email verification sent.
- [x] Email verification callback: verify token, activate account, redirect to role-based route.
- [ ] Server-side slug validation: unique across all restaurants.
- [ ] Post-verification redirect to restaurant dashboard.

### A4. Login

- [x] Replace `/login` with real Supabase email/password form.
- [ ] "Forgot password" link.
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
  - [ ] New registrations (7d trend).
  - [x] Error handling and SvelteKit error pages.
  - [ ] Quick links to recent organizations/restaurants.
- [x] Server load: aggregate queries across all tenants (super admin bypasses tenant scoping).

### B3. Organization Management

- [x] `/platform/organizations` — table of all organizations with search/filter.
  - [x] Columns: name, slug, plan tier, status, restaurants count, users count, created date.
  - [x] Server-side pagination with validated limit/offset.
  - [ ] Status: active, suspended, trial, cancelled.
- [ ] `/platform/organizations/[slug]` — organization detail:
  - [ ] Profile info (name, slug, plan, billing email, created date).
  - [ ] List of restaurants under this org.
  - [ ] Suspend/activate actions.
  - [ ] Plan change action.

### B4. Restaurant Overview

- [x] `/platform/restaurants` — table of all restaurants with search/filter.
  - [x] Columns: name, slug, organization, segment, status, tables.
  - [x] Server-side pagination with validated limit/offset and optional organization filter.
- [ ] `/platform/restaurants/[slug]` — restaurant detail (read-only platform view):
  - [ ] Profile, menus, tables, analytics summary.
  - [ ] Link to open restaurant as that tenant (impersonation for support).

### B5. Super Admin Data Access

- [x] `src/lib/server/services/platform-admin-service.ts` — cross-tenant queries for platform admin.
  - [x] Input validation using Zod pagination schemas.
  - [x] Accurate platform users count without misleading filters.
- [ ] `src/lib/server/repositories/platform-repository.ts` — aggregate queries without tenant scoping.
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
- [ ] Restaurant profile/settings page (name, slug, segment, languages, timezone, logo).
- [ ] Public host/subdomain configuration.
- [ ] Plan/billing info display (read-only for now).

### C2. Staff Management per Restaurant

- [ ] `/dashboard/staff` — list staff members for this restaurant.
- [ ] Invite staff: email + role assignment.
- [ ] Invite flow: create `membership` with `role = 'staff'`, `restaurant_id` set.
- [ ] Staff gets email invite → sets password → redirected to `/staff/inbox`.
- [ ] Remove staff (deactivate membership).
- [ ] Role change (staff ↔ restaurant_admin).
- [ ] Staff cannot access other restaurants' data (enforced by RLS).

### C3. Staff Inbox

- [x] Staff inbox with real-time updates via SSE.
- [x] Fallback request list with table number, language, priority.
- [x] Claim/resolve workflow with state machine.
- [ ] Staff profile/settings page.

---

## Phase D — Restaurant Self-Service Onboarding

Restaurants can sign up and go live without manual intervention from the platform owner.

### D1. Subdomain Auto-Generation

- [ ] `src/lib/server/services/subdomain-service.ts`:
  - [ ] `generateSubdomain(slug: string): string` → `{slug}.lingua.app`
  - [ ] `isSubdomainAvailable(slug: string): Promise<boolean>`
  - [ ] `provisionSubdomain(restaurantId: string): Promise<void>`
- [ ] Store `public_host` in `restaurants` table on creation.
- [ ] DNS: for MVP, wildcard DNS `*.lingua.app` → app server. SvelteKit host-resolver reads `Host` header.
- [ ] Future: automated DNS provisioning via DNS provider API (Cloudflare, Route53).

### D2. Restaurant Onboarding Wizard

- [ ] Post-registration onboarding wizard (redirected after email verification):
  - [ ] Step 1: Restaurant profile (name, slug, segment, location, timezone, languages).
  - [ ] Step 2: Upload menu (OCR import or manual entry).
  - [ ] Step 3: Set up tables (auto-generate or manual).
  - [ ] Step 4: Review QR codes, download print sheet.
  - [ ] Step 5: Go live — publish menu, activate restaurant.
- [ ] Wizard progress persistence (save draft, resume later).

### D3. Menu Go-Live Gate

- [x] Data Quality Gate (`canPublishMenu` in `menu/policy.ts`): every item must have name + price + availability.
- [ ] Pre-publish checklist UI: flag items with `confidence = 'needs-review'` or `'staff-confirm'`.
- [ ] Block publish if any blocking issues exist.
- [ ] Warn (allow publish) for non-blocking issues.

---

## Phase E — Public Customer Experience

The tourist-facing QR menu experience. No login, no install.

### E1. QR Entry

- [x] Path-based routing: `/r/[restaurantSlug]/table/[tableCode]`.
- [x] Subdomain routing layout stubbed: `{slug}.lingua.app/table/{code}` (host-resolver exists).
- [x] Host-header spoofing prevention.
- [ ] Route setup for subdomain-only production mode (redirect path-based to subdomain).

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

- [ ] Platform admin analytics: aggregate across all restaurants.
- [ ] Provider cost aggregation per restaurant per day (service exists, needs dashboard).
- [ ] Token usage trends per model per provider.
- [ ] Fallback rate trends across restaurants (identify which restaurants need better knowledge base).

### G3. Product Metrics Instrumentation

- [x] Fallback rate = `fallback_requests` / total chat sessions.
- [x] Helpful feedback = `feedback.helpful = true` / total feedback.
- [x] Latency p95 via `PERCENTILE_CONT` on `ai_events.latency_ms`.
- [x] Web Vitals buffer (LCP, FID, INP, CLS, TTFB).
- [ ] Wire Web Vitals to analytics backend.

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
- [ ] Dockerfile ORIGIN fix (hardcoded → runtime env).
- [x] `.containerignore`.

### I2. Database

- [x] PostgreSQL 16 via pgvector image.
- [x] Redis 7 for caching, rate limiting, pub/sub.
- [x] SQL migrations (`db/migrations/0001..0009`).
- [x] Seed data with multi-tenant demo.
- [x] RLS policies for tenant isolation.
- [ ] Supabase-specific migrations: `auth.users` sync trigger, platform admin role.

### I3. CI/CD and Quality

- [x] `pnpm check` (TypeScript + SvelteKit).
- [x] `pnpm lint` (ESLint + Prettier).
- [x] `pnpm test:unit` (Vitest).
- [x] Playwright E2E tests (customer, admin, staff).
- [x] Bundle size checks (`scripts/check-bundle-size.mjs`).
- [x] Lighthouse performance check (`scripts/performance-check.mjs`).
- [x] Accessibility audit (`scripts/accessibility-check.mjs` + `@axe-core/cli`).
- [x] Dependency audit (`scripts/dependency-audit.mjs`).
- [ ] CI workflow (GitHub Actions or similar).

---

## Phase J — Pilot and Launch

### J1. Pre-Launch QA

- [ ] Full Playwright regression on all flows.
- [ ] Load test public endpoints (k6 or artillery).
- [ ] Security review: RLS, rate limiting, input validation, XSS, CSRF.
- [ ] Privacy review: data retention, GDPR/ID PDP compliance basics.

### J2. Pilot Package

- [ ] QR table card design (print-ready).
- [ ] Staff quick guide (PDF or in-app onboarding).
- [ ] Admin onboarding guide.
- [ ] Feedback form for pilot participants.

### J3. Launch

- [ ] Production Supabase project provisioning.
- [ ] Production DNS + subdomain wildcard setup.
- [ ] Production deployment (Vercel/Cloudflare/Docker).
- [ ] Monitoring: Sentry, Supabase logs, custom health alerts.
- [ ] Pilot: 3-5 alpha restaurants → 10 beta restaurants.

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

## Current Focus (2026-06-21)

Work through Phase A → Phase B → Phase C in order. Each phase depends on the previous one.

Phase A is the active phase: real auth, landing page, registration, login.