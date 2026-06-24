# Lingua Architecture and Engineering Rules

**Status:** Active — production-grade multi-tenant UMKM SaaS platform.

## 1. Architecture Goal

Lingua is a production platform serving UMKM at any scale — from a single warung to a multi-outlet enterprise chain. The codebase must be structured for the full product: customer PWA, owner dashboard, staff workflow, AI/RAG, onboarding, analytics, and future integrations.

The key decision is to use SvelteKit for the web layer while keeping business logic outside components and route files. This is not an MVP — every architectural decision must account for 1000+ tenants on day one.

Product shape: one Lingua deployment serves many organizations and many outlets. An outlet receives scoped QR routes, product catalog, cart/order management, dashboard data, and staff workflow. It does not receive a separate codebase or app build. Tenant isolation is non-negotiable — one tenant must never see another's data.

Current local backend baseline: PostgreSQL and Redis run through a vendor-neutral `compose.yml` driven by `scripts/infra.mjs` (Podman preferred, Docker fallback, rootless by default). Managed services remain optional later, but local architecture must not depend on a vendor dashboard to boot the app.

Runtime database access must use the app role from `DATABASE_URL`, not the migration owner from `DIRECT_URL`. The app role is expected to be constrained by Row Level Security. Migration and seed scripts may use `DIRECT_URL`.

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

## 3. User Roles and Access Control

Lingua has four authenticated roles plus anonymous guests:

```
super_admin         Platform owner. Full system access. Routes: /platform/*.
org_owner           Owns an organization. Can manage all restaurants under it.
restaurant_admin    Manages one specific restaurant. Menu, staff, analytics.
staff               Works at one restaurant. Inbox only.
anonymous           No auth. QR-scoped to one table at one restaurant.
```

### Role Resolution Flow

```
Request → hooks.server.ts
  → authProvider.getSessionUser(cookies, request)
    → Supabase Auth SSR → Supabase user → app_users table → role + memberships
  → event.locals.user = { id, email, name, role, memberships }
  → event.locals.session = supabase session (for token refresh)
```

### Authorization Rules

- `super_admin`: bypasses tenant scoping for read queries. Can see all orgs, all restaurants.
- `org_owner`: sees all restaurants in their own organization(s).
- `restaurant_admin`: sees only their assigned restaurant. Cannot see other restaurants even in same org.
- `staff`: sees only their assigned restaurant's inbox. No dashboard access.
- `anonymous`: sees only the restaurant/table resolved from QR. `public_session_id` enforced by RLS.

### Route-Level Role Guards

Each protected route group has a layout server load that checks the role:

| Route Group    | Required Role                     | Redirect if unauthorized |
| -------------- | --------------------------------- | ------------------------ |
| `(platform)/`  | `super_admin`                     | → `/dashboard`           |
| `(dashboard)/` | `org_owner` or `restaurant_admin` | → `/login`               |
| `(staff)/`     | `staff`                           | → `/login`               |

## 3. SvelteKit Route Strategy

Use route groups to keep different products separated without changing URLs unnecessarily:

```text
src/routes/
  +page.svelte          Marketing landing page
  /login                Sign-in
  /register/*           Registration flow
  +layout.svelte        Root layout

  (platform)/           Platform admin (super admin only)
    /platform             Overview
    /platform/organizations
    /platform/restaurants

  (dashboard)/          Restaurant admin
    /dashboard             Overview
    /dashboard/menu        Menu editor
    /dashboard/tables      QR table manager
    /dashboard/knowledge   Knowledge base
    /dashboard/analytics   Analytics
    /dashboard/staff       Staff management
    /dashboard/settings    Settings

  (staff)/              Staff inbox
    /staff/inbox          Fallback requests

  (public)/             Tourist QR (no auth)
    /r/[slug]/table/[code]

  api/                  JSON endpoints
    /api/public/*         Tourist-facing
    /api/admin/*          Admin
    /api/platform/*       Platform admin
```

Rules:

- Tourist route must stay fast and minimal.
- Tourist route must resolve restaurant/table scope before loading menu data.
- Dashboard route can load heavier admin components.
- Dashboard route must always carry organization/restaurant context from auth membership or URL state.
- Staff route must be tablet/mobile friendly.
- Platform admin route is a separate product — different layout, different nav, different data scope.
- Platform admin queries are cross-tenant and must not be accidentally scoped by RLS.
- `+page.server.ts` is the default for private data.
- `+page.ts` is allowed only for public browser-safe data.
- `+server.ts` is for JSON APIs, chat, webhooks, and non-form interactions.
- Form actions are preferred for admin CRUD because they support progressive enhancement.

## 4. Domain Modules

Recommended domain modules:

```text
src/lib/domain/
  analytics/        Analytics types and schemas
  auth/             Roles, permissions, session types
  knowledge/        Knowledge document schemas and types
  menu/             Menu types, admin schemas, publish policy
  platform/         Platform-admin-specific schemas
  session/          Guest session schemas
  sanitize.ts       Input sanitization utilities
  fallback/         Staff fallback requests
  feedback/         Guest feedback
  table/            Table management
  ai/               AI interaction events

  Deferred (post-MVP): organization/, restaurant/, location/, preference/
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
  platform-admin-service.ts  Cross-tenant queries for super admin
  menu-admin-service.ts      Menu CRUD, publish, and validation
  customer-session-service.ts Guest session lifecycle
  chat-service.ts            AI chat orchestration
  guest-interaction-service.ts Fallback requests and feedback
  staff-inbox-service.ts     Staff inbox claim/resolve workflow
  knowledge-service.ts       Knowledge base CRUD
  ocr-import-service.ts      OCR scanning and draft import
  embedding-worker.ts        Batch embedding generation
  provider-cost-tracking.ts  LLM cost aggregation
  ai-cost-cap.ts             Daily AI usage limits
  rate-limiter.ts            Redis-backed rate limiting
  usage-limits.ts            Plan tier enforcement
  retrieval-service.ts       Hybrid RAG retrieval
  input-sanitizer.ts         Request body sanitization
  table-service.ts           Table listing
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
  admin-menu-repository.ts   Admin menu CRUD (RLS-scoped via withUserContext)
  public-menu-repository.ts  Public menu reads (restaurant slug + table code)
  knowledge-repository.ts    Knowledge document CRUD
  embedding-repository.ts    pgvector upsert, search, delete
  retrieval-repository.ts    Hybrid RAG (structured + semantic)
  chat-repository.ts         Chat message persistence
  staff-inbox-repository.ts  Fallback request CRUD and state machine
  ai-events-repository.ts    AI event audit logging
  metrics-repository.ts      Analytics aggregation queries
  table-repository.ts        Table listing and management
  tenant-repository.ts       Organization + restaurant resolution
  user-repository.ts         App user lookup by external auth ID
  platform-repository.ts     Platform-wide aggregate queries
  cost-repository.ts         AI cost tracking queries (ai_events)
  menu-row-mapper.ts         Shared row-to-domain mapping utilities

  Deferred: restaurant-repository.ts (covered by tenant-repository),
            session-repository.ts (covered by chat-repository),
            fallback-repository.ts (covered by staff-inbox-repository)
```

Rules:

- Repositories contain database-specific query code.
- Repositories do not call LLM/OCR/WhatsApp providers.
- Repositories do not render UI or know route names.
- Cross-tenant filtering must be explicit and tested.
- Repository methods for tenant-owned records should accept `organizationId` and/or `restaurantId`; avoid unscoped `findById` helpers for private data.
- PostgreSQL-backed tenant queries must set `app.user_external_id` inside the same transaction before reading RLS-protected tables.

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

Platform admin route:

```text
auth user -> role check (super_admin) -> NO tenant scope -> cross-tenant aggregate data
```

Rules:

- `tableCode` is unique only inside a restaurant, not globally.
- Restaurant slug/subdomain is public identity, not authorization.
- Organization membership controls dashboard and staff access.
- Staff requests, chat messages, feedback, imports, storage paths, and AI events must store restaurant_id and organization_id where useful for fast filtering and audit.
- Tenant context should be a typed server object, not a loose `{ slug: string }` object passed around UI components.
- Tests must include "same table code in two restaurants" and "same user sees only assigned restaurants" cases.
- Platform admin (`super_admin` role) bypasses tenant scoping for read queries. Write operations on behalf of a tenant should still scope to the target restaurant/organization.
- During frontend/backend bridging, a mock session cookie may be used only as a local development stand-in. Production auth must replace it with Supabase Auth sessions and RLS-enforced memberships.
- Mock tenant fallback is allowed for local UI work when the database is unavailable. It must not hide database authorization errors in production.

## 6.2 Tenant Query Isolation and Testing

Every database query that accesses tenant-owned data must enforce tenant scope at both the application and database layers.

### Query Scoping Requirements

**Application Layer:**

- Every tenant-owned query MUST scope by both `organization_id` AND `restaurant_id` in the WHERE clause.
- Repository functions MUST require these IDs in their input parameters (not optional).
- Never rely solely on RLS for tenant isolation—application queries should be correct by construction.

**Good Example:**

```typescript
export async function loadMenusForRestaurant(
	client: DatabaseClient,
	{ organizationId, restaurantId }: { organizationId: string; restaurantId: string }
): Promise<MenuRow[]> {
	const result = await client.query<MenuRow>(
		`SELECT id, restaurant_id, version, status, published_at
     FROM menus
     WHERE restaurant_id = $1::uuid
       AND organization_id = $2::uuid
     ORDER BY version DESC`,
		[restaurantId, organizationId]
	);
	return result.rows;
}
```

**Bad Example:**

```typescript
// ❌ Missing organization_id - violates defense-in-depth
export async function loadMenusForRestaurant(
	client: DatabaseClient,
	restaurantId: string
): Promise<MenuRow[]> {
	const result = await client.query<MenuRow>(
		`SELECT id, restaurant_id, version, status
     FROM menus
     WHERE restaurant_id = $1::uuid`, // ❌ No organization_id check
		[restaurantId]
	);
	return result.rows;
}
```

**Database Layer (RLS):**

- RLS policies enforce tenant scope using `app.has_restaurant_access(restaurant_id)`.
- This function verifies the authenticated user (via `app.user_external_id`) has membership access to the restaurant.
- RLS provides defense-in-depth: even if application code omits organization_id, the database prevents cross-tenant access.
- See `db/migrations/0001_core_multi_tenant_schema.sql` for `has_restaurant_access()` implementation.
- See `db/migrations/0006_admin_menu_write_policies.sql` for write policy examples.

### Defense-in-Depth Pattern

Lingua uses a two-layer tenant isolation model:

1. **Application Layer (Primary):** Queries explicitly scope by organization_id + restaurant_id.
2. **Database Layer (Defense):** RLS policies enforce access via membership relationships.

This pattern ensures:

- Security is visible in application code (easier to audit).
- Performance optimization through explicit indexes on tenant dimensions.
- Protection against bugs in application code (RLS catches missing scopes).
- Compliance with security review requirements.

### Writing Tenant-Safe Queries

**Step 1: Resolve Tenant Context**

Always resolve tenant context before repository calls:

```typescript
// Admin operations: resolve from authenticated user
const tenant = await resolveTenantContext(user, restaurantSlug);
const { activeRestaurant } = tenant;

// Public operations: resolve from QR identifiers
const bootstrap = await resolvePublicMenu(restaurantSlug, tableCode);
```

**Step 2: Pass Tenant IDs to Repository**

Repository functions must require tenant IDs explicitly:

```typescript
const menus = await loadMenusForRestaurant(client, {
	organizationId: activeRestaurant.organizationId,
	restaurantId: activeRestaurant.id
});
```

**Step 3: Scope Queries by Both Dimensions**

All WHERE clauses must include both `organization_id` AND `restaurant_id`:

```sql
WHERE restaurant_id = $1::uuid
  AND organization_id = $2::uuid
```

**Step 4: Use Transaction Context**

Admin operations must run within `withUserContext` to set RLS session variables:

```typescript
await withUserContext(user.id, async (client) => {
	// All queries inside this block have app.user_external_id set
	const menus = await loadMenusForRestaurant(client, {
		organizationId: activeRestaurant.organizationId,
		restaurantId: activeRestaurant.id
	});
});
```

### Testing Tenant Isolation

**Unit Tests:**

Test repository functions with different tenant IDs to verify isolation:

```typescript
test('loadMenusForRestaurant returns only menus for specified organization', async () => {
	const org1Menus = await loadMenusForRestaurant(client, {
		organizationId: org1.id,
		restaurantId: restaurant1.id
	});

	const org2Menus = await loadMenusForRestaurant(client, {
		organizationId: org2.id,
		restaurantId: restaurant1.id
	});

	expect(org1Menus).not.toContainEqual(expect.objectContaining({ id: org2Menu.id }));
});
```

**RLS Tests:**

Test database policies enforce cross-tenant isolation:

```typescript
test('RLS prevents cross-organization menu access', async () => {
	await withUserContext(org1User.id, async (client) => {
		// Should not see org2's menus even if we try to query them
		const result = await client.query('SELECT * FROM menus WHERE restaurant_id = $1', [
			org2Restaurant.id
		]);
		expect(result.rows).toHaveLength(0);
	});
});
```

**Integration Tests:**

Test full flows with multiple tenants:

```typescript
test('same table code in different restaurants creates separate sessions', async () => {
	const session1 = await createSession({ restaurantSlug: 'cafe-a', tableCode: 'T1' });
	const session2 = await createSession({ restaurantSlug: 'cafe-b', tableCode: 'T1' });

	expect(session1.restaurantId).not.toBe(session2.restaurantId);
});
```

### Recent Fixes (2024-06-20)

Fixed 4 repository functions that were missing `organization_id` scoping:

1. **`loadMenusForRestaurant`** - Now requires `{ organizationId, restaurantId }` instead of just `restaurantId`.
2. **`countMenuItems`** - Now requires `{ organizationId, restaurantId, menuId }` instead of just `menuId`.
3. **`setMenuItemAvailability`** - Now requires `organizationId` in addition to `restaurantId` and `itemId`.
4. **`publishMenu`** - Now requires `organizationId` and scopes both UPDATE statements.

All callers in `menu-admin-service.ts` updated to pass complete tenant context.

See TODO.md line 19 for the cross-cutting guardrail this implements.

## 7. Provider Adapters

Every external provider must sit behind an interface:

```text
src/lib/server/providers/
  llm/
  ocr/
  storage/
  whatsapp/       (Deferred — Phase K)
  telemetry/      (Deferred — Phase K)
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
  primitives/     Buttons, inputs, badges, stat tiles, QR display
  DataTable.svelte  Generic snippet-based data tables
  EmptyState.svelte Consistent empty state placeholders
  Pagination.svelte URL-based pagination controls
  AlertBanner.svelte Success/error/warning/info banners
  menu/           Customer menu: MenuItemCard, ChatPanel, SafetyBadges, PreferenceChips
  staff/          Staff inbox: StaffRequestCard
  Navbar.svelte   Top navigation
  Footer.svelte   Site footer
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

### 12.1 Local Database Testing Infrastructure

All DB tests run against **local PostgreSQL** (Podman/Docker), never Supabase remote.

**Environment strategy:**

| File               | Purpose                          | DB Target        |
| ------------------ | -------------------------------- | ---------------- |
| `.env.test`        | Test suite (committed)           | Local PostgreSQL |
| `.env.development` | Dev server (committed)           | Local PostgreSQL |
| `.env.production`  | Production template (committed)  | Supabase         |
| `.env`             | Developer overrides (gitignored) | Any              |

**Test workflow:**

```bash
pnpm infra:up         # Start PostgreSQL + Redis
pnpm db:reset         # Drop schema, apply all migrations, seed
pnpm test             # Runs with .env.test (local DB, RUN_DB_TESTS=true)
pnpm check            # TypeScript check
```

**Key rules:**

- `pnpm test` loads `.env.test` first via `src/test-setup.ts` (Vitest `globalSetup`), then `.env` as override.
- Never set `RUN_DB_TESTS=true` in `.env` pointing to Supabase unless explicitly integration testing.
- Migration `0011_local_auth_stub.sql` provides a local `auth` schema stub so all migrations run without Supabase.
- `0011_supabase_auth_bridge.sql` is conditional — only creates triggers when `auth.users` exists.
- Shell env vars always win over file-based env values.
- DB tests use `DIRECT_URL` (superuser) for admin setup/teardown, `DATABASE_URL` (app role) for RLS verification.

**Playwright E2E tests:**

- `playwright.config.ts` uses `lingua_app` role (NOT superuser) to validate actual security boundaries.
- E2E tests verify RLS policies work correctly in realistic browser→API→DB flows.
- Using superuser would bypass RLS and create false confidence (testing without security).
- Environment overrides prevent inheriting `.env` Supabase remote config.
- `webServer.timeout: 120_000`, `reuseExistingServer: false`, `test.timeout: 60_000`.
- `stdout` and `stderr` piped for error visibility.
- Current status: 14/21 customer-flow tests pass; 7 failures are UI/DOM/seed issues, not RLS.

### 12.2 Test Naming and Coverage

- Repository DB tests: `*.db.test.ts` — opt-in via `RUN_DB_TESTS=true`.
- Integration tests: `*.integration.test.ts` — opt-in via `RUN_LLM_TESTS=true`.
- Unit tests: `*.test.ts` — always run, no infra dependencies.

## 13. Review Rules

Any PR/change that touches these areas needs careful review:

- RLS policies.
- Public catalog/menu APIs.
- AI prompt/guardrail behavior.
- Allergen/halal/dietary logic (restaurant vertical only).
- Provider adapters.
- Auth/session code.
- Public route bundle size.
- Tenant isolation (any query on tenant-owned data).

## 14. Component Ownership Model

shadcn-svelte components are **copy-owned code** in `src/lib/ui/` — not runtime dependencies.

### How it works

- Components are copied from the shadcn-svelte registry (next branch, Tailwind v4) into `src/lib/ui/`
- Once copied, they are owned and maintained by this project
- Design tokens (`--lingua-*` CSS variables) override shadcn's default CSS variables
- bits-ui IS a runtime dependency — it provides accessible headless primitives (keyboard nav, ARIA, focus trap) used internally by shadcn components
- sveltekit-superforms is a runtime dependency — used for complex admin forms with Zod validation

### Component categories in `src/lib/ui/`

| Category | Components | Source |
| -------- | ---------- | ------ |
| shadcn-sourced | Button, Input, Textarea, Badge, Card, Dialog, Alert, Skeleton, Sonner, Select, Tabs, DropdownMenu, Sheet, Table, Combobox, Command, DatePicker | Copied from shadcn-svelte registry |
| project-owned | Sidebar, BottomNav, TopBar, and domain-specific components | Built in-project, may use bits-ui primitives |

### Why copy-owned, not installed

- Full control over accessibility, tokens, and behavior
- No version lock-in — if shadcn-svelte updates, our copies are unaffected
- Design system tokens (`--lingua-*`) can be applied without fighting the library
- Components can be modified to match UMKM-specific UX patterns

### CSS variable mapping

shadcn-svelte uses standard CSS variable names (`--primary`, `--background`, `--card`, etc.). These are mapped to `--lingua-*` tokens in `src/routes/layout.css`:

```css
/* shadcn CSS variable bridge */
:root {
  --background: var(--color-lingua-bg);
  --foreground: var(--color-lingua-text);
  --primary: var(--color-lingua-primary);
  --primary-foreground: #ffffff;
  --secondary: var(--color-lingua-secondary);
  --muted: var(--color-lingua-muted);
  --muted-foreground: var(--color-lingua-subtle);
  --border: var(--color-lingua-border);
  --ring: var(--color-lingua-primary);
  --radius: var(--radius-md);
}
```

## 15. Scale Architecture Notes

The same codebase must work at all scales:

| Scale | Tenants | Strategy |
| ----- | ------- | -------- |
| Small | 1–10 | Single VPS or Supabase free tier. Redis optional. |
| Medium | 10–100 | RLS + Redis caching + rate limiting. BullMQ for embeddings/OCR. |
| Large | 100–1000+ | Connection pooling (PgBouncer), read replicas, CDN for published catalogs, queue for all async work. Adapter pattern enables provider swapping. |

**Public buyer routes own the performance budget.** Admin/AI/analytics code must be lazy-loaded and must never bloat the public catalog bundle.
- Service worker caching.
