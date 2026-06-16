# LinguaServe Architecture and Engineering Rules

**Status:** Baseline architecture for a long-term SvelteKit implementation.

## 1. Architecture Goal

LinguaServe should feel light and fast to tourists, but its codebase must be structured for a larger product: customer PWA, admin dashboard, staff workflow, AI/RAG, onboarding, analytics, and future integrations.

The key decision is to use SvelteKit for the web layer while keeping business logic outside components and route files.

Product shape: one LinguaServe deployment serves many organizations and many restaurants. A restaurant receives scoped QR routes, dashboard data, and staff workflow. It does not receive a separate codebase or app build.

## 2. System Layers

```text
UI Layer
  Svelte components, layouts, visual states, local interactions

Route Layer
  SvelteKit load functions, form actions, endpoint handlers, redirects

Application Service Layer
  Use cases: publish menu, create fallback, answer chat, import menu

Domain Layer
  Types, schemas, business rules, policies, safety rules

Repository Layer
  Database queries and persistence

Provider Layer
  Supabase, LLM, OCR, WhatsApp, storage, telemetry
```

Dependency direction:

```text
UI -> Routes -> Services -> Domain
                 Services -> Repositories -> Providers
```

Reverse imports are not allowed. Domain must not import SvelteKit, Supabase, or provider SDKs.

## 3. SvelteKit Route Strategy

Use route groups to keep different products separated without changing URLs unnecessarily:

```text
src/routes/
  (public)/       Tourist QR and menu experience
  (dashboard)/    Owner/admin dashboard
  (staff)/        Staff inbox and fallback workflow
  api/            JSON endpoints and webhooks
```

Rules:

- Tourist route must stay fast and minimal.
- Tourist route must resolve restaurant/table scope before loading menu data.
- Dashboard route can load heavier admin components.
- Dashboard route must always carry organization/restaurant context from auth membership or URL state.
- Staff route must be tablet/mobile friendly.
- `+page.server.ts` is the default for private data.
- `+page.ts` is allowed only for public browser-safe data.
- `+server.ts` is for JSON APIs, chat, webhooks, and non-form interactions.
- Form actions are preferred for admin CRUD because they support progressive enhancement.

## 4. Domain Modules

Recommended domain modules:

```text
src/lib/domain/
  organization/
  restaurant/
  location/
  menu/
  table/
  session/
  preference/
  fallback/
  feedback/
  ai/
  analytics/
```

Each module should contain:

- `types.ts`
- `schema.ts`
- `policy.ts` when rules exist
- `fixtures.ts` for mock/demo data
- `*.test.ts` for domain tests

Domain examples:

- Tenant resolution rule.
- Membership role rule.
- Menu item availability rule.
- Allergen warning rule.
- Halal confidence rule.
- Fallback escalation rule.
- Language support rule.

## 5. Service Modules

Recommended services:

```text
src/lib/server/services/
  menu-service.ts
  menu-publish-service.ts
  session-service.ts
  chat-service.ts
  fallback-service.ts
  import-service.ts
  analytics-service.ts
```

Rules:

- Services orchestrate domain rules and repositories.
- Services return typed results, not raw database rows unless intentionally exposed.
- Services own transaction boundaries.
- Services should be testable with fake repositories/providers.

## 6. Repository Modules

Recommended repositories:

```text
src/lib/server/repositories/
  restaurant-repository.ts
  menu-repository.ts
  session-repository.ts
  fallback-repository.ts
  knowledge-repository.ts
  ai-event-repository.ts
```

Rules:

- Repositories contain database-specific query code.
- Repositories do not call LLM/OCR/WhatsApp providers.
- Repositories do not render UI or know route names.
- Cross-tenant filtering must be explicit and tested.
- Repository methods for tenant-owned records should accept `organizationId` and/or `restaurantId`; avoid unscoped `findById` helpers for private data.

## 6.1 Tenant Resolution Rules

Every request must resolve scope before touching tenant-owned data.

Public customer route:

```text
host/path -> restaurant -> table -> published menu/session
```

Dashboard/staff route:

```text
auth user -> memberships -> organization -> selected restaurant -> data
```

Rules:

- `tableCode` is unique only inside a restaurant, not globally.
- Restaurant slug/subdomain is public identity, not authorization.
- Organization membership controls dashboard and staff access.
- Staff requests, chat messages, feedback, imports, storage paths, and AI events must store restaurant_id and organization_id where useful for fast filtering and audit.
- Tenant context should be a typed server object, not a loose `{ slug: string }` object passed around UI components.
- Tests must include "same table code in two restaurants" and "same user sees only assigned restaurants" cases.

## 7. Provider Adapters

Every external provider must sit behind an interface:

```text
src/lib/server/providers/
  llm/
  ocr/
  whatsapp/
  storage/
  telemetry/
```

Rules:

- No provider SDK imports in route components.
- Provider response normalization happens in the adapter.
- Provider errors become typed application errors.
- Provider usage and cost should be logged by restaurant.
- Mock providers are required before real integrations.

## 8. UI Architecture

Recommended UI structure:

```text
src/lib/ui/
  primitives/     Buttons, inputs, dialogs, sheets, badges
  layout/         Shells, navigation, responsive containers
  menu/           Customer menu components
  chat/           Chat and AI answer components
  staff/          Staff inbox components
  dashboard/      Admin dashboard components
  feedback/       Feedback components
```

Rules:

- UI components accept typed props and emit typed events.
- UI components do not fetch data directly unless they are explicitly client-only widgets.
- UI components must support loading, empty, error, offline, and low-confidence states where relevant.
- Long translated text must be tested at 360px mobile width.
- Complex third-party UI libraries must be wrapped in project-owned components.

## 9. State Management Rules

Use the smallest state mechanism that works:

1. Server load data.
2. URL/search params.
3. Form state.
4. Component local state.
5. Scoped `.svelte.ts` rune module.
6. Global app state only with explicit justification.

Do not create one large global store. For Svelte 5, prefer runes mode and `.svelte.ts` modules for shared reactive UI state.

Allowed shared state examples:

- Current customer preferences in a table session.
- Chat draft and optimistic messages.
- Staff inbox filter.
- Admin menu editor dirty state.

Not allowed as global state:

- Entire menu database.
- Authz policy results.
- Tenant data across organizations.
- Provider SDK clients.

## 10. Dependency Policy

Svelte has fewer mature enterprise UI libraries than React. This repo compensates with a strict dependency policy.

Before adding a dependency, check:

- Is it actively maintained?
- Does it support Svelte 5 or current SvelteKit?
- Is it accessible?
- Does it work with SSR?
- Does it increase public customer bundle size?
- Can it be wrapped behind a local component or adapter?
- Is there a realistic replacement if it becomes unmaintained?

Heavy dependencies are allowed only for admin routes when they do not affect the public customer route.

## 11. Performance Rules

- Public QR route is the performance budget owner.
- Admin/dashboard features must not bloat public customer bundles.
- Lazy load OCR/import, analytics, rich editors, charts, and AI debugging views.
- Precompute translations and embeddings after publish.
- Do not run OCR in the tourist flow.
- Measure bundle size before pilot.
- Use service worker caching for app shell and safe published menu data.

## 12. Testing Rules

Minimum before pilot:

- Domain tests for menu, allergen, halal, fallback, and AI safety rules.
- RLS tests for cross-tenant isolation.
- Component tests for core customer states.
- Playwright tests for customer, admin, and staff flows.
- Bundle/performance checks for public route.
- AI evaluation fixtures using real menu questions.

## 13. Review Rules

Any PR/change that touches these areas needs careful review:

- RLS policies.
- Public menu APIs.
- AI prompt/guardrail behavior.
- Allergen/halal/dietary logic.
- Provider adapters.
- Auth/session code.
- Public route bundle size.
- Service worker caching.
