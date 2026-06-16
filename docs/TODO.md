# LinguaServe TODO

This plan starts with product/design/frontend, then backend, then AI. Field research items that cannot be executed by an agent are marked as deferred/skipped for now.

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

Legend: `[x]` done, `[ ]` todo, `[~]` intentionally skipped/deferred.

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

- [ ] Initialize Supabase project and migrations.
- [ ] Create core tables from `docs/Technical_Specification.md`.
- [ ] Implement server-only tenant resolver for host/path -> organization/restaurant/table.
- [ ] Add Row Level Security policies.
- [ ] Add RLS tests for:
  - [ ] Same table code in two restaurants.
  - [ ] User assigned to one restaurant cannot read another restaurant.
  - [ ] Organization manager can see all restaurants in the organization.
- [ ] Add seed data for local development.
- [ ] Add Supabase Auth for admin/staff.
- [ ] Add SvelteKit server-only Supabase client.
- [ ] Add public scoped API/server load for published menu.
- [ ] Add customer session creation.
- [ ] Add chat message persistence.
- [ ] Add fallback request persistence.
- [ ] Add feedback persistence.
- [ ] Add Realtime staff inbox.
- [ ] Add Storage bucket for menu imports and item images.
- [ ] Write API contract tests.
- [ ] Write RLS isolation tests.

## Phase 7 - AI, OCR, and RAG

- [ ] Define AI provider adapter interface.
- [ ] Implement mocked AI provider for frontend and tests.
- [ ] Implement first real LLM provider.
- [ ] Define prompt templates and prompt versioning.
- [ ] Implement menu retrieval scoped by restaurant.
- [ ] Add embeddings for menu items and knowledge documents.
- [ ] Implement chat answer endpoint.
- [ ] Implement guardrails:
  - [ ] Do not answer outside restaurant scope.
  - [ ] Do not invent ingredients.
  - [ ] Escalate allergy/halal uncertainty.
  - [ ] Respect unavailable/sold-out items.
- [ ] Implement AI event logging.
- [ ] Implement OCR import prototype.
- [ ] Add admin review workflow for OCR extraction.
- [ ] Add AI evaluation fixtures with dummy and later real menu questions.

## Phase 8 - Integrations and Operations

- [ ] Decide staff inbox only vs WhatsApp integration for pilot.
- [ ] If WhatsApp is used, create provider adapter and cost controls.
- [ ] Add email/password reset flow for admins.
- [ ] Add restaurant onboarding checklist.
- [ ] Add QR code generation and print-ready export.
- [ ] Add usage limits per restaurant.
- [ ] Add provider cost tracking per restaurant.
- [ ] Add error monitoring.
- [ ] Add web vitals collection.
- [ ] Add deployment environments: local, staging, production.
- [ ] Choose and document SvelteKit adapter target:
  - [ ] Cloudflare Pages/Workers, or
  - [ ] Vercel, or
  - [ ] Node adapter for custom server.
- [ ] Add bundle size checks for public QR route.
- [ ] Add dependency audit workflow for Svelte ecosystem risk.

## Phase 9 - QA and Pilot Readiness

- [x] Run Playwright smoke tests for customer, admin, and staff routes.
- [ ] Run full Playwright customer flow on multiple viewport sizes.
- [ ] Run full Playwright admin flow on tablet and desktop.
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
