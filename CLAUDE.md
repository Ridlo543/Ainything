## Project Configuration

-**Language**: TypeScript

-**Package Manager**: pnpm

-**Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter

---

# CLAUDE.md

Project-specific instructions for coding agents working on LinguaServe.

## Repository Context

LinguaServe is a documentation-first project for a QR-based AI menu assistant for tourist-heavy restaurants. The repo currently contains planning documents and may later contain the web app, backend, migrations, and tests.

Read these files before making product or technical changes:

1.`docs/PRD_Lingua.md`

2.`docs/Technical_Specification.md`

3.`docs/ARCHITECTURE.md`

4.`docs/DESIGN_SYSTEM.md`

5.`docs/CONTEXT.md`

6.`docs/TODO.md`

Also follow the global RTK instruction from `C:\Users\Advan\.codex\RTK.md`: prefix shell commands with `rtk` where shell execution is needed.

## Product Rules

- MVP is a restaurant/cafe menu assistant, not a travel super-app.
- Buyer is the restaurant. End user is the tourist.
- Customer experience is PWA-first and must not require app install or login.
- Menu data, ingredients, allergens, halal status, prices, and availability must come from restaurant-approved data.
- AI must fallback rather than guess when data is missing or high-risk.
- POS, payments, reservation, AR, native mobile apps, and travel planning are post-MVP unless the user explicitly changes scope.

## Implementation Priorities

1. Keep scope narrow and verifiable.
2. Build frontend and UI flows before backend complexity.
3. Preserve polished mobile UX on 360px and 390px widths.
4. Keep SvelteKit routes thin; domain and services own behavior.
5. Add backend only after route/data contracts are clear.
6. Use provider adapters for AI/OCR/WhatsApp instead of hard-coding one vendor deeply.
7. Test tenant isolation and AI guardrails before pilot use.

## Frontend Guidance

- Use the actual app experience as the first screen, not a marketing landing page.
- Use mobile-first responsive design.
- Use clear icon buttons where icons are familiar.
- Keep cards at 8px radius or less unless the design system changes.
- Do not nest cards inside cards.
- Do not use decorative gradient blobs or generic AI visuals.
- Ensure long translated text, CJK text, and Arabic RTL do not break layout.
- Every major component needs loading, empty, error, offline, and low-confidence states where relevant.

## Technical Defaults

- Frontend: SvelteKit, Svelte 5 runes mode, TypeScript, Tailwind CSS.
- Backend: Supabase Postgres/Auth/RLS/Storage/Realtime.
- Tests: Vitest, Testing Library, Playwright.
- Icons: lucide-svelte.
- Validation: Zod.
- AI: provider adapter with prompt versioning and event logs.

SvelteKit rules:

- Use `+page.server.ts` for private data and secret access.
- Use `+page.ts` only for browser-safe public data.
- Use form actions for admin/staff CRUD when progressive enhancement helps.
- Use `+server.ts` for JSON APIs, chat, webhooks, and non-form interactions.
- Keep domain logic out of `.svelte` files.
- Do not import repositories or provider SDKs from UI components.
- Use server load data and URL state before adding shared client state.
- Use scoped `.svelte.ts` rune modules only when shared reactive UI state is justified.
- Wrap complex third-party UI libraries behind project-owned components.

If implementation chooses different tools, update `docs/Technical_Specification.md` with the reason.

## Safety and Verification

- Inspect current files and `git status` before edits.
- Do not overwrite user changes.
- Do not add dependencies without a clear reason.
- Do not store secrets in the repo.
- Do not expose Supabase service role keys to the browser.
- Run the narrowest relevant verification available.
- If no app exists yet, verify documentation changes by reading the files and checking git diff.

## Documentation Rules

- Update PRD when product scope changes.
- Update Technical Specification when architecture, stack, data model, or APIs change.
- Update Architecture when module boundaries, dependency policy, or workflow rules change.
- Update TODO when task order or completion status changes.
- Log completed documentation or implementation milestones in `docs/COMPLETE-TODO.md`.
