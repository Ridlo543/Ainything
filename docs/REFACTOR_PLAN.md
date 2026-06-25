# Production Readiness Refactoring Plan

**Created:** 2026-06-22
**Last updated:** 2026-06-22
**Status:** Active
**Goal:** Prepare Lingua codebase for production deployment

---

## Phase 0 — Quick Wins (Safety & Correctness)

**Priority:** Critical | **Est:** 1-2 sessions | **Risk:** Low

- [x] Sanitize error messages (prevent raw `err.message` leak to client)
- [x] Fix fail-open catch blocks in dashboard routes
- [x] Extract inline SQL from route files to repositories
- [x] Fix `as any` type casts

## Phase 1 — Repository Layer Extraction

**Priority:** High | **Est:** 2-3 sessions | **Risk:** Medium

**Goal:** Move all inline SQL out of service files into dedicated repository modules. Service files should import repositories, not call `getPool()` or `query()` directly.

- [x] Create `user-repository.ts` (done in Phase 0: `findAppUserByExternalId`)
- [x] Extract `platform-admin-service.ts` → `platform-repository.ts`
  - `getPlatformStats()` (3 aggregate counts)
  - `listOrganizations()` (join orgs + restaurants + memberships)
  - `listRestaurants()` (join restaurants + organizations)
- [x] Extract `provider-cost-tracking.ts` → `cost-repository.ts`
  - `getOrganizationCosts()` (ai_events aggregation)
  - `getRestaurantCosts()` (ai_events aggregation)
- [x] Extract `embedding-worker.ts` inline SQL → `embedding-repository.ts`
  - Menu items query (CONCAT_WS, joins)
  - Knowledge docs query
- [x] Refactor services to use repositories
- [x] Integration tests for new repositories (existing service tests pass: 11/11)

## Phase 2 — Test Coverage for Critical Services

**Priority:** High | **Est:** 2-3 sessions | **Risk:** Medium

| Service                 | Test file                    | Tests    |
| ----------------------- | ---------------------------- | -------- |
| `menu-admin-service.ts` | `menu-admin-service.test.ts` | 9 tests  |
| `ocr-import-service.ts` | `ocr-import-service.test.ts` | 4 tests  |
| `embedding-worker.ts`   | `embedding-worker.test.ts`   | 5 tests  |
| `table-service.ts`      | `table-service.test.ts`      | 4 tests  |
| `public-api-helpers.ts` | `public-api-helpers.test.ts` | 13 tests |

## Phase 3 — UI Component Extraction

**Priority:** Medium | **Est:** 1-2 sessions | **Risk:** Low

**Goal:** Extract repeated UI patterns into shared, testable components under `src/lib/ui/`.

- [x] Extend `Badge` with `shape` prop — unify badge usage across dashboard, platform, staff routes
- [x] Create `DataTable` — replace inlined tables in platform/organizations and platform/restaurants
- [x] Create `EmptyState` — consistent empty state for all list views
- [x] Create `Pagination` — reusable pagination with limit/offset
- [x] Create `AlertBanner` — success/error/warning banners
- [x] Skip `LayoutShell` — Platform and Dashboard use distinct layout paradigms (flex vs grid) and unifying them would require breaking design system conventions
- [x] Refactor routes to use components

## Phase 4 — Missing Domain Modules

**Priority:** Medium | **Est:** 1-2 sessions | **Risk:** Low

**Goal:** Create dedicated domain modules for product features that currently lack structured types, schemas, and policies.

- [x] Create `domain/fallback/` — types, schema, policy for staff fallback requests
- [x] Create `domain/feedback/` — types, schema for guest feedback
- [x] Create `domain/table/` — types, schema, policy for table management
- [x] Create `domain/ai/` — types, schema, policy for AI interaction events

## Phase 5 — Documentation Sync

**Priority:** Low | **Est:** 0.5 session | **Risk:** None

**Goal:** Bring `docs/ARCHITECTURE.md` in line with actual codebase structure.

- [x] Fix domain modules list
- [x] Fix services list
- [x] Fix repositories list
- [x] Fix UI directory tree
- [x] Mark deferred provider adapters in ARCHITECTURE.md
- [x] Remove non-existent module references

## Phase 6 — Infrastructure for Scale

**Priority:** High | **Status:** Production Readiness

- [x] Queue system (BullMQ + Redis for embedding/OCR background jobs)
- [x] Observability (Sentry for SvelteKit SSR/CSR and Node backend)
- [x] CI/CD pipeline (GitHub Actions for lint, typecheck, and unit tests)
- [x] Subdomain resolver
- [x] CDN integration
- [ ] i18n runtime
- [ ] DB partitioning strategy
