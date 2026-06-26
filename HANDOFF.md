# Ainything — Handoff Document

**Generated:** 2026-06-21  
**Purpose:** Session transfer — enable a fresh agent to continue with zero context loss.

---

## Project Overview

Ainything is a multi-tenant QR menu & AI guest assistant SaaS for tourist-heavy restaurants. One deployment serves many organizations/restaurants. PWA-first, no app install or login required for customers.

- **Stack:** SvelteKit 5 (runes), TypeScript, Tailwind CSS, PostgreSQL (pgvector), Redis, Podman-first
- **Frontend:** SvelteKit route groups: `(public)/` customer QR, `(dashboard)/` admin, `(staff)/` staff inbox, `api/` JSON
- **Backend:** Supabase-compatible Postgres + RLS, Redis (rate limit, SSE, AI cap), provider adapters (LLM, OCR, Auth)
- **Domain layering:** UI → Routes → Services → Domain; Services → Repositories → Providers. Domain never imports SvelteKit or infrastructure.

---

## Current State

### What's Done (MVP Complete)

- Full customer flow: QR bootstrap → language select → preferences → menu browse → item detail → chat/AI → fallback → feedback
- Full admin flow: dashboard overview, menu editor (CRUD + publish with DQG), QR table manager with print-ready export, knowledge CRUD, analytics (metrics from DB), embedding re-index button
- Full staff flow: real-time inbox (SSE via Redis pub/sub), claim/resolve fallback requests with state machine
- 9 DB migrations (core schema + RLS + pgvector + knowledge write policies + write/audit policies)
- Auth provider adapter: mock (demo cookie) and Supabase stub
- LLM provider adapter: MiniMax/TokenRouter, Anthropic; `embed()` optional on interface
- OCR provider adapter: mock with confidence per field; admin review workflow
- RAG: pgvector-based embeddings, hybrid retrieval (structured + semantic), embedding generation on publish
- i18n: English, Indonesian, Japanese, Simplified Chinese; dictionary layer with reactive `.svelte.ts`; Arabic dictionary exists but is excluded from MVP language set (TODO: restore post-MVP)
- Rate limiting (Redis, fixed-window), AI daily cost cap (500/restaurant/day), request body size limits, input sanitization
- 11 RLS isolation tests, 220+ unit tests, 17 Playwright customer E2E tests, 17 admin E2E tests
- Bundle size check script (needs fixing — see Known Issues)
- Dockerfile (adapter-node), compose.yml (pgvector + Redis), Containerfile

### What's in Progress / Blocked

| Item                                                                              | Status                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------- |
| Phase 6a last checkbox: commit repaired public-menu WIP                           | Done via later commits; 5d64eeb is latest |
| API route placeholder routes (Phase 3, line 88)                                   | Still open                                |
| Long text / Arabic RTL at 360px (Phase 8)                                         | Pending                                   |
| Narrow MVP language set per Phase 0                                               | Done (line 37 in TODO)                    |
| Email/password reset for admins                                                   | Open                                      |
| WhatsApp provider adapter                                                         | Open                                      |
| Staff inbox vs WhatsApp decision                                                  | Open                                      |
| Bundle check script (measures raw total JS+CSS, not gzipped client-only)          | Needs fix                                 |
| Playwright admin tests: missing CRUD assertions, viewport spec, login boilerplate | Needs improvement                         |
| Healthcheck missing from Dockerfile                                               | Needs fix                                 |
| ORIGIN hardcoded in old Dockerfile                                                | Already fixed? Verify                     |

### Known Uncommitted Changes

- `AGENTS.md` has local additions (DCP Compress Tool section) — do not overwrite

---

## Key Architecture Rules

1. **Domain isolation:** No `$lib/server` imports in `.svelte` files. No `$lib/server` in public bundle. No provider/repository imports from UI components.
2. **Tenant scoping:** Every query scoped by `organization_id` AND `restaurant_id`. Defense-in-depth with RLS.
3. **Provider adapters:** Every external service (LLM, OCR, Auth, WhatsApp, Storage) behind an interface + mock.
4. **Public API security:** 2-layer Zod validation (domain schema + API-specific schema), server-derived tenant IDs, rate limiting.
5. **SvelteKit conventions:** `+page.server.ts` for private data, `+page.ts` only for browser-safe public data, thin routes, form actions for admin CRUD.
6. **Secrets:** Must stay server-only. Never expose `SUPABASE_SERVICE_ROLE_KEY`, DB URLs, or session secret to browser.

---

## Critical File Map

| Path                              | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| `docs/PRD_ainything.md`           | Product requirements                               |
| `docs/Technical_Specification.md` | Stack, data model, API, AI/RAG, security           |
| `docs/ARCHITECTURE.md`            | Module boundaries, tenant isolation, testing rules |
| `docs/DESIGN_SYSTEM.md`           | Colors, typography, spacing, component states      |
| `docs/CONTEXT.md`                 | One-page agent context                             |
| `docs/TODO.md`                    | Phased task list (297 lines)                       |
| `docs/COMPLETE-TODO.md`           | Historical changelog                               |
| `src/lib/domain/`                 | Business types, Zod schemas, policies              |
| `src/lib/server/services/`        | Use cases / orchestration                          |
| `src/lib/server/repositories/`    | DB queries (tenant-scoped)                         |
| `src/lib/server/providers/`       | LLM, OCR, Auth adapters                            |
| `src/lib/i18n/`                   | Dictionary layer (en, id, zh-Hans, ja, ar)         |

---

## Git History (Last Commits)

```
5d64eeb fix(security,architecture): cross-cutting guardrails — Zod coverage, domain isolation, secrets audit
ce2b3b1 feat(admin-ocr): OCR admin review workflow
a682a80 test(rls): public policy restrictions migration test
393711e refactor(security): enforce organization_id scoping in admin queries
549e403 docs: document NODE_ENV, ORIGIN, OCR_PROVIDER in .env.example
a738bf7 test(e2e): login helper + menu/knowledge CRUD tests
d644443 feat(docker): HEALTHCHECK for Podman health monitoring
fcc4ca3 fix(security,perf): P1.1-P1.2 sanitizer wiring + bundle check
```

---

## Next Session Recommendations

### High Priority

1. Fix bundle check script (`scripts/check-bundle-size.mjs`): measure gzipped client-only JS+CSS, wire into CI
2. Add Dockerfile HEALTHCHECK + make ORIGIN a runtime env override
3. Fix Playwright admin tests: extract login to `beforeEach`, add CRUD assertions, set viewport
4. Restore Arabic i18n in MVP language set once RTL/long-text testing at 360px passes
5. Write API route placeholder routes (Phase 3 line 88)

### Medium Priority

6. Implement WhatsApp provider adapter + cost controls
7. Add email/password reset for admins
8. Add restaurant onboarding checklist
9. Add usage limits + provider cost tracking per restaurant

### Lower Priority

10. Error monitoring integration
11. Web vitals collection
12. Deployment environments (staging/production)
13. Dependency audit workflow
14. Accessibility checks

---

## Suggested Skills for Next Agent

- `svelte-code-writer` — when editing Svelte 5 components or `.svelte.ts` modules
- `typescript-best-practices` — when working on TypeScript files
- `tailwind-best-practices` — when writing Tailwind CSS classes
- `diagnose` — for hard bugs or performance regressions
- `git-commit` — for committing changes with conventional commit messages
- `context7-mcp` — for current library/framework documentation (SvelteKit, Supabase, etc.)
- `improve-codebase-architecture` — if refactoring domain/server boundaries
- `stop-slop` — when editing/writing documentation or prose

---

## Quick Commands

| Command                                   | Purpose                          |
| ----------------------------------------- | -------------------------------- |
| `pnpm check`                              | Type-check SvelteKit             |
| `pnpm test:unit`                          | Run unit tests (excl. DB)        |
| `pnpm test:unit --run`                    | Run all unit tests               |
| `pnpm test:e2e`                           | Run Playwright E2E               |
| `pnpm lint`                               | ESLint + Prettier                |
| `pnpm infra:up`                           | Start Postgres + Redis (Podman)  |
| `pnpm run db:migrate`                     | Apply DB migrations              |
| `pnpm run db:seed`                        | Seed demo data                   |
| `pnpm run bundle-check`                   | Run bundle size check            |
| `RUN_DB_TESTS=true pnpm test:unit --run`  | Run tests including DB/RLS tests |
| `RUN_LLM_TESTS=true pnpm test:unit --run` | Run tests including LLM eval     |
