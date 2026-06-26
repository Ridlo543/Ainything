# ainything Technical Specification

**Version:** 2.3  
**Date:** 25 Juni 2026  
**Status:** Active implementation — self-hosted PostgreSQL + Redis, no Supabase  
**Primary Goal:** Build a production-grade, multi-tenant UMKM SaaS platform — not a prototype. Serve businesses at any scale (small warung to large multi-outlet enterprise) with a fast cross-device SvelteKit PWA, accessible UI components, and backend/AI layers that scale without coupling business logic to the framework.

## 1. Technical Decision

ainything will use **SvelteKit + Svelte 5 + TypeScript** as the primary web framework.

This replaces the earlier Next.js recommendation. The reason is product fit: ainything depends heavily on mobile QR performance, low-JS customer flows, polished interactions, and PWA behavior. SvelteKit gives SSR, file-based routing, server-only load functions, form actions, API endpoints, adapters, prerendering, and service worker support while keeping the runtime lean.

This is not a "small app only" choice. The architecture must keep SvelteKit as the web delivery layer and keep domain, data, AI, provider, and policy logic in framework-independent modules.

## 2. Technical Principles

- **Mobile-first PWA.** The tourist experience must work from QR scan in iOS Safari, Android Chrome, and common in-app browsers.
- **SvelteKit as web shell, not business core.** Routes orchestrate. Domain/services own behavior.
- **Frontend-first implementation.** Build polished flows with mocked contracts before backend complexity hardens the wrong UX.
- **Server-trusted data.** Menu, dietary flags, allergens, halal status, prices, and availability must come from restaurant/admin data, not AI guesses.
- **AI as assistant, not source of truth.** AI can explain, translate, and recommend based on verified data. It must fallback when confidence is low.
- **Fast perceived performance.** Cached menu interactions should feel instant. Slow AI/OCR tasks need progress, streaming, and retry states.
- **Multi-tenant by default.** Every backend table and API must be designed for multiple tenants (organizations + outlets) from day one. Scale from 1 to 1000+ tenants, same codebase.
- **One deployment, many tenants.** ainything is a shared SaaS platform. An outlet gets scoped data, QR links, and dashboards — not a separate app build. Tenant isolation is mandatory at both app and DB layers.
- **Provider adapters.** LLM, OCR, STT/TTS, WhatsApp, email, and storage providers must be swappable via adapter interfaces.
- **Copy-owned UI components.** shadcn-svelte components are copied into `src/lib/ui/` and owned by the project — not imported as a runtime dependency. This gives full control over accessibility, design tokens, and behavior without vendor lock-in.
- **Explicit dependency policy.** Every new runtime dependency must have a clear justification and be documented in this spec.

## 3. Recommended Stack

### Web App

- **Framework:** SvelteKit.
- **Component Model:** Svelte 5 with runes mode.
- **Language:** TypeScript strict mode.
- **Styling:** Tailwind CSS v4 with `@theme` directive. Design tokens as `--ainything-*` CSS variables in `src/routes/layout.css`.
- **Component Library:** shadcn-svelte (next branch, Tailwind v4 compatible) — copy-owned components in `src/lib/ui/`. Not a runtime dependency; components are copied and owned by the project.
- **UI Primitives:** bits-ui — headless, accessible primitives (keyboard nav, ARIA, focus trap). Used internally by shadcn-svelte components. This IS a runtime dependency.
- **Icons:** lucide-svelte.
- **PWA:** Web App Manifest, SvelteKit service worker, offline fallback, cache strategy for published catalog data.
- **Forms:** SvelteKit form actions for progressive enhancement; sveltekit-superforms + Zod for complex admin forms (product CRUD, settings, invite staff).
- **Validation:** Zod schemas shared between server actions, API handlers, and tests.
- **Client State:** Prefer server `load` data and URL state. Use Svelte 5 `.svelte.ts` rune modules only for scoped UI/session state. Avoid global state by default.
- **Testing:** Vitest for domain/unit tests, Testing Library for components, Playwright for cross-device flows.

### Backend

- **Database:** PostgreSQL. Local development runs in Podman (rootless) first, Docker fallback.
- **Cache / Queue Base:** Redis. Local development runs in Podman (rootless) first, Docker fallback.
- **Auth:** Auth.js (NextAuth v5) — replaces Supabase Auth. Mock session for local dev (`AUTH_PROVIDER=mock`), Auth.js for production. `external_auth_id` set from Auth.js session in `hooks.server.ts`.
- **Authorization:** Tenant-aware server checks at app layer (explicit `organization_id` + `outlet_id` scoping). PostgreSQL Row Level Security as defense-in-depth. App role `ainything_app` has RLS enforced; superuser `ainything` used only for migrations via `DIRECT_URL`.
- **Storage:** Cloudflare R2 (S3-compatible, 10GB free). No Supabase Storage.
- **Realtime:** Redis-backed pub/sub via BullMQ for async jobs. App polling for dashboards. Supabase Realtime is not used.
- **API Layer:** SvelteKit `+server.ts` endpoints and server-only service modules.
- **Migrations:** SQL migrations should be committed to the repo. Do not depend on dashboard-only schema changes.
- **Connection Roles:** `DIRECT_URL` is for migration/seed owner access. `DATABASE_URL` is for the app runtime role and must be subject to RLS.
- **Container Runtime:** Vendor-neutral `compose.yml` (Compose Spec v2) driven by `scripts/infra.mjs`, which prefers Podman and falls back to Docker. Override with `CONTAINER_RUNTIME=docker` when needed.

### AI and Search

- **Embeddings/RAG:** PostgreSQL + pgvector (self-hosted). No external vector store dependency.
- **LLM Provider:** Adapter interface. Start with one low-cost provider, keep OpenAI-compatible and provider-neutral internal contracts.
- **OCR:** Provider adapter for OCR; allow manual correction after extraction.
- **Prompt Versioning:** Store prompt versions and model parameters in code or database with release notes.
- **Guardrails:** Retrieval-only answers, low-confidence fallback, allergy/halal escalation.

### Deployment

- **Production Runtime:** `@sveltejs/adapter-node` → self-hosted VPS (Hetzner CX23 Singapore, ~Rp120.000/mo). Cloudflare Pages/Workers as future option.
- **Local Infra:** Vendor-neutral `compose.yml` (Podman preferred, Docker fallback) for PostgreSQL 16 + Redis 7.
- **Production DB:** Self-hosted PostgreSQL on VPS. No managed Supabase.
- **Async Work:** BullMQ + Redis for OCR, embedding, and translation background jobs.
- **Monitoring:** Sentry for frontend/backend errors, web vitals. No Supabase logs.

## 4. SvelteKit Architecture Rules

### Route Rules

- `src/routes` must stay thin. Routes load data, call services, handle redirects/errors, and render UI.
- Use route groups for separate layouts:
  - `(public)` for tourist QR/menu experience.
  - `(dashboard)` for owner/admin.
  - `(staff)` for staff inbox.
  - `(marketing)` only if a marketing site is later required.
- Use `+page.server.ts` when reading private data, using server-only DB clients, or touching secrets.
- Use `+page.ts` only for public serializable data that is safe in the browser.
- Use `+server.ts` for JSON APIs, AI chat, webhooks, and endpoints consumed outside standard forms.
- Use SvelteKit form actions for admin/staff CRUD where progressive enhancement is valuable.

### Module Boundary Rules

- `src/lib/domain`: framework-independent types, rules, policies, and Zod schemas.
- `src/lib/server/repositories`: database access only.
- `src/lib/server/services`: use cases and transaction orchestration.
- `src/lib/server/ai`: RAG, prompt, provider, OCR, and guardrail services.
- `src/lib/ui`: reusable Svelte components with no database/provider imports.
- `src/lib/state`: small `.svelte.ts` rune modules for client-only state.
- `src/lib/i18n`: dictionaries, language detection, RTL helpers.
- `src/lib/telemetry`: logging, metrics, event wrappers.

No Svelte component may import a repository or provider directly. Components call route data, form actions, or typed client APIs.

## 5. Suggested Folder Structure

```text
src/
  routes/
    (public)/
      r/[restaurantSlug]/table/[tableCode]/
        +page.server.ts
        +page.svelte
    (dashboard)/
      dashboard/
        +layout.server.ts
        +layout.svelte
        +page.server.ts
        +page.svelte
      menu/
      tables/
      knowledge/
      analytics/
    (staff)/
      inbox/
    api/
      public/
        chat/+server.ts
        fallback/+server.ts
        feedback/+server.ts
      admin/
        menu/+server.ts
        publish-menu/+server.ts
      webhooks/
  lib/
    domain/
      menu/
      restaurant/
      session/
      fallback/
      ai/
    server/
      db/
      repositories/
      services/
      ai/
      auth/
      storage/
    ui/
      primitives/
      layout/
      menu/
      chat/
      staff/
      dashboard/
    state/
    i18n/
    validation/
    telemetry/
  service-worker.ts
static/
  manifest.webmanifest
db/
  migrations/
  seeds/
tests/
  e2e/
  unit/
```

## 6. High-Level Architecture

```text
Tourist Browser PWA
  -> SvelteKit SSR route
  -> Public scoped APIs / server load
  -> PostgreSQL (self-hosted, RLS enforced) + Cloudflare R2
  -> AI Gateway service
  -> Staff Inbox (Redis pub/sub)

Admin/Staff Dashboard
  -> Auth.js session
  -> SvelteKit server load + form actions
  -> Catalog CRUD + Knowledge Base services
  -> Staff fallback workflow

AI Gateway
  -> Retrieve outlet-scoped knowledge
  -> Apply guardrails
  -> Call LLM/OCR provider adapter
  -> Log answer, latency, retrieval, confidence
```

## 7. Mitigating Svelte Weak Spots

SvelteKit is a strong fit, but the project must be intentional about its weaker areas versus React/Next.

| Risk                         | Mitigation                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Smaller hiring pool          | Keep TypeScript/domain/service layers framework-independent; document Svelte patterns; avoid clever component magic.          |
| Smaller UI ecosystem         | Use accessible primitives first; build design-system components in `src/lib/ui`; avoid depending on abandoned component kits. |
| Fewer enterprise widgets     | For complex tables/editors, evaluate dedicated libraries early and isolate them behind adapter components.                    |
| State can become scattered   | Use server data first, URL state second, scoped rune modules third. Require a reason for app-wide state.                      |
| Framework-specific coupling  | No domain logic inside `.svelte` files. No repository/provider imports from UI.                                               |
| Long-term migration risk     | Keep API contracts, schemas, services, and tests outside route components where possible.                                     |
| SSR/client boundary mistakes | Default private data to `+page.server.ts`; no secrets in browser; typed server-only clients.                                  |

## 8. Rendering and Data Strategy

- Public menu bootstrap uses `+page.server.ts` and cached published menu data.
- Customer UI hydrates only interactive islands: preferences, chat, feedback, fallback.
- Admin dashboard uses server load for initial data and form actions for CRUD.
- Staff inbox uses server load for initial list and Supabase Realtime for updates.
- Published restaurant/menu data should be cacheable. Chat, fallback, admin, and staff data are dynamic.
- Prerender can be used for static docs/marketing pages, not tenant-specific private data.

## 8.1 Multi-Tenant Routing Strategy

ainything must support many organizations and restaurants in one deployment.

Tenant entities:

- `Organization`: billing and membership owner.
- `Restaurant`: public venue under an organization.
- `Restaurant Location`: optional branch/location layer for multi-branch brands.
- `Table`: QR-scoped entry point under one restaurant or location.

Public routing options:

- Path fallback for MVP and local development: `/r/[restaurantSlug]/table/[tableCode]`.
- Restaurant subdomain for production branding: `https://[restaurantSlug].ainything.app/table/[tableCode]`.
- Custom domains can be added later for enterprise customers, for example `menu.restaurant.com/table/T07`.

Admin routing options:

- Shared dashboard path: `/dashboard`, with current organization and restaurant resolved from auth membership and URL/search state.
- Optional organization workspace subdomain: `https://[organizationSlug].ainything.app/dashboard`.

Resolution rules:

1. Resolve organization from authenticated membership for dashboard/staff routes.
2. Resolve restaurant from route params, subdomain, selected dashboard context, or explicit restaurant id.
3. Resolve table only after restaurant is known. Table code alone is never globally trusted.
4. Every server load, action, endpoint, repository query, realtime channel, storage path, and AI retrieval must include organization/restaurant scope.
5. Public routes may read only published restaurant/menu data. Draft menu, imports, staff notes, and private analytics remain authenticated.

SvelteKit implications:

- Use `+page.server.ts` for public QR bootstrap so host/path tenant resolution stays server-controlled.
- Add a server-only tenant resolver before Supabase integration.
- Do not store the active tenant in a global client store as a source of truth.
- Use URL/search state for dashboard restaurant selection until real auth and membership exist.
- Local demo auth can use a HttpOnly mock session cookie while backend is absent. It must be treated as scaffolding and replaced by Supabase Auth before pilot.

## 9. PWA and Offline Strategy

- Add `static/manifest.webmanifest`.
- Add `src/service-worker.ts`.
- Cache app shell and static assets.
- Cache visited published menu responses when safe.
- Do not cache chat, fallback, admin, auth, or staff inbox responses.
- Offline mode should show last visited menu as read-only with clear stale state.
- Core QR flow must work without install. Install prompt is optional.

## 10. Platform and Device Support

### Required

- Android Chrome latest two major versions.
- iOS Safari latest two major versions.
- Desktop Chrome, Edge, Safari, Firefox latest two major versions.
- Tablet layout for restaurant staff and admin.

### Important Browser Constraints

- Camera upload must use standard `<input type="file" accept="image/*" capture>` with fallback to file picker.
- Do not require push notifications for MVP because browser and OS support varies.
- Avoid relying on background sync for critical flows.
- In-app browsers may block some PWA features. Core flows must still work in a regular tab.

## 11. Performance Requirements

### Budgets

- First screen LCP: <= 2.5s on normal 4G for a cached public menu.
- Initial JS for public QR route should remain small; review bundle after every major feature.
- Cached menu interaction: <= 100ms local UI response.
- Cached menu Q&A p95: <= 2s.
- Fresh AI chat p95: <= 5s.
- OCR import: may exceed 10s, but must show progress and should run async for admin.

### Performance Tactics

- Precompute menu translations for priority languages after admin publish.
- Use structured menu data instead of running OCR for every tourist.
- Cache restaurant profile, menu categories, and item details at edge/CDN where safe.
- Lazy load chat, OCR/import, analytics, and admin-only modules.
- Use responsive images and avoid large unoptimized menu scans on public pages.
- Prefer server load for static/published data.
- Avoid large client-side global state.
- Use optimistic UI only when rollback is clear.

## 12. Data Model Baseline

Use UUID primary keys unless there is a clear reason not to.

### Core Tables

- `organizations`: tenant owner entity.
- `restaurants`: restaurant profile, organization_id, slug, public_host, timezone, default language.
- `restaurant_locations`: branches/locations for multi-branch brands when needed.
- `users`: app profile linked to Supabase Auth user.
- `memberships`: user to organization/restaurant roles.
- `tables`: table code, label, restaurant_id, QR metadata.
- `menus`: menu version, status, published_at.
- `menu_categories`: category order and localized names.
- `menu_items`: name, description, price, image, availability, spice level.
- `menu_item_translations`: translated name/description by language.
- `dietary_flags`: halal, vegetarian, vegan, gluten-free, contains alcohol, etc.
- `allergens`: nuts, dairy, egg, shellfish, seafood, soy, gluten, sesame, etc.
- `menu_item_dietary_flags`: item to dietary flags.
- `menu_item_allergens`: item to allergens.
- `knowledge_documents`: restaurant facts, policies, promos, cultural notes.
- `customer_sessions`: anonymous session per QR scan.
- `chat_messages`: session-scoped messages.
- `fallback_requests`: human help requests and status.
- `feedback`: helpfulness, issue type, free text.
- `ai_events`: model, prompt version, latency, token usage, retrieved docs, confidence.

### Vector Search

- `pgvector` is enabled via a dedicated migration before retrieval work begins. Embedding columns/tables for `menu_items` and `knowledge_documents` are tenant-scoped (`organization_id`, `restaurant_id`).
- Embeddings are generated after admin publish, never inside the tourist request path.

### Authorization

- Public users can only read published restaurant/menu data through scoped public APIs or server load.
- Admin/staff access requires Supabase Auth.
- RLS must restrict tenant data by organization/restaurant membership.
- RLS policies must join through memberships and restaurant ownership. Never trust a browser-provided restaurant id without membership validation.
- Public table URLs must validate `(restaurant_slug, table_code)` together.
- Service role keys must never reach the browser.

## 13. API Contract Baseline

### Public APIs

- `GET /api/public/tenant/resolve?host=uma-karang.ainything.app`
  - Optional production helper for host-based restaurant resolution.
- `GET /api/public/restaurants/:slug/table/:tableCode/bootstrap`
  - Returns restaurant profile, table metadata, languages, published menu summary.
- `GET /api/public/restaurants/:slug/menu?lang=en`
  - Returns published localized menu.
- `POST /api/public/sessions`
  - Creates anonymous customer session.
- `POST /api/public/chat`
  - Sends question, returns AI answer or fallback recommendation.
- `POST /api/public/fallback`
  - Creates staff fallback request.
- `POST /api/public/feedback`
  - Stores quick feedback.

### Admin APIs and Actions

- Prefer SvelteKit form actions for dashboard CRUD when possible.
- Use `+server.ts` APIs for JSON-heavy interactions, import jobs, chat, realtime support, and webhooks.
- Keep API request/response schemas in `src/lib/domain` or `src/lib/validation`.

### Public Endpoint Abuse and Cost Controls

Anonymous public endpoints (`/api/public/sessions`, `/api/public/chat`, `/api/public/fallback`, `/api/public/feedback`) are the highest abuse and cost-exposure surface. They must enforce:

- Rate limiting backed by Redis, keyed by both the server-issued public session token and client IP. Suggested starting limits: session create 5/min/IP, chat 20/min/session, fallback 5/min/session, feedback 10/min/session. Tune during pilot.
- A per-restaurant daily AI-call cap. When exceeded, return a graceful "please ask staff" fallback instead of calling the LLM.
- Request body size limits and basic sanitation on free-text fields.
- Server-derived tenant scope only. `organization_id` and `restaurant_id` for guest writes are resolved from the QR bootstrap result server-side, never read from the request body.

### Anonymous Guest-Write Trust Model

- On QR bootstrap the server issues an opaque public session token and stores it on `customer_sessions`.
- Guest inserts run inside a transaction that sets `app.public_session_id`; RLS guest-write policies validate the row against that context, not against app-supplied ids alone.
- `customer_sessions` insert is allowed only when `(table_id, restaurant_id, organization_id)` are mutually consistent and the table/restaurant are active.
- `fallback_requests` and `feedback` inserts must reference a `session_id` that matches the active `app.public_session_id`.

## 14. AI/RAG Design

### Menu Ingestion

1. Admin uploads menu file or image.
2. OCR extracts raw text.
3. Parser proposes categories, items, prices, descriptions, and flags.
4. Admin reviews and corrects structured data.
5. System generates translations and embeddings after publish.
6. Customer-facing answers use published structured data only.

### Answer Flow

1. Identify restaurant, table, session, language, and preferences.
2. Retrieve relevant menu items and knowledge documents scoped to restaurant.
3. Apply safety classification:
   - allergy/halal/dietary high risk
   - menu availability
   - outside restaurant scope
4. If confidence is low, return fallback prompt instead of guessing.
5. Generate answer with references to menu items/knowledge records.
6. Log `ai_events`.

### Prompt Rules

- Never invent ingredients, certification, availability, or prices.
- If data is missing, say it is not confirmed and suggest asking staff.
- For allergies, always recommend staff confirmation.
- Keep answer in the user's language.
- Prefer short answers with actionable suggestions.

## 15. Internationalization

- Store canonical data in restaurant default language.
- Store translations by BCP 47 language tag, for example `en`, `id`, `zh-Hans`, `ko`, `ja`, `ar`.
- UI strings must use an i18n dictionary, not hard-coded text.
- Layout must support RTL for Arabic.
- Test long labels and languages without spaces.

## 16. Security, Privacy, and Compliance

- Minimize personal data. Tourist sessions should be anonymous by default.
- Do not store precise device identity unless needed for abuse prevention.
- Redact sensitive text from logs where possible.
- Define retention policy for chat, feedback, and AI logs.
- Admin/staff auth must use secure session handling and RLS.
- GDPR matters if serving EU visitors or EU business customers. Indonesia PDP Law should be considered for local operations.
- Provide restaurant-facing data processing terms before paid launch.

## 17. Reliability and Observability

Track:

- Web vitals by route and device class.
- API latency p50/p95/p99.
- AI provider latency and error rate.
- OCR/import success rate.
- Fallback request volume and resolution time.
- Chat answer helpfulness.
- Token and cost per restaurant.
- RLS/auth errors.
- Bundle size for public customer routes.

Required dashboards:

- Product usage dashboard.
- Provider cost dashboard.
- Error and latency dashboard.
- Pilot restaurant health dashboard.
- Frontend performance dashboard.

## 18. Testing Strategy

### Frontend

- Component tests for menu cards, preference filters, chat states, fallback banner, and admin forms.
- Playwright tests for:
  - QR open -> language -> preferences -> menu item -> chat -> fallback.
  - Admin login -> edit menu -> publish -> public menu updates.
  - Staff inbox -> resolve fallback request.
- Visual checks at mobile 360px, mobile 390px, tablet 768px, desktop 1280px.

### Backend

- Database migration tests.
- RLS policy tests for cross-tenant isolation.
- API/action contract tests.
- AI guardrail tests with unsafe allergen/halal prompts.
- Provider adapter tests with mocked providers.

Current local backend implementation baseline:

- `db/migrations/0001_core_multi_tenant_schema.sql` creates the core schema, indexes, updated-at triggers, an app role, and baseline read RLS.
- `db/seeds/0001_demo_multi_tenant_data.sql` creates deterministic demo tenants, restaurants, duplicated table codes, published menus, and fallback requests.
- `scripts/db.mjs` runs `db:migrate`, `db:seed`, and `db:reset` through `DIRECT_URL`.
- Runtime server code uses `src/lib/server/db/postgres.ts` and sets `app.user_external_id` inside a transaction before tenant-scoped reads.
- Redis is integrated first for dependency health and reserved for cache/queue/realtime work once a concrete use case lands.

### Performance

- Lighthouse/WebPageTest for public routes.
- Bundle-size checks for public QR/menu routes.
- Load test basic public menu and chat endpoints before pilot.
- Token/cost simulation using expected session volume.

## 19. Documentation Baseline

This specification was prepared with current documentation lookup through Context7 for:

- SvelteKit route groups, server-only load functions, form actions, `+server.ts` endpoints, prerendering, adapters, and service worker patterns.
- Svelte 5 runes, `.svelte.ts` shared reactive modules, and modern Svelte best practices.
- Supabase Postgres/RLS/Realtime/Storage patterns from the prior baseline.

Re-check official docs before implementation if versions or providers change.
