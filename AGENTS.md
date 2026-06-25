## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter

---

# AGENTS.md

Project-specific instructions for coding agents working on Lingua.

## Repository Context

Lingua is a **production-grade multi-tenant UMKM SaaS platform** — not a prototype, not an MVP. It serves businesses of all sizes: small (warung, toko kecil), medium (chain restoran, butik), and large (enterprise UMKM with multiple outlets). The platform gives every business owner a digital product catalog, QR/link access, cart/order management, and buyer interaction — with role-based dashboards, staff workflow, and AI support — from one deployment.

Read these files before making product or technical changes:

1. `docs/PRD_Lingua.md`
2. `docs/Technical_Specification.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DESIGN_SYSTEM.md`
5. `docs/CONTEXT.md`
6. `docs/TODO.md`

Also follow the global RTK instruction from `C:\Users\Advan\.codex\RTK.md`: prefix shell commands with `rtk` where shell execution is needed.

## Product Rules

- **This is a production platform for UMKM at any scale — never treat it as MVP or prototype.**
- Lingua serves restaurants, retail shops, and service businesses — not just restaurants.
- Buyer is the UMKM owner (tenant). End user is the buyer/consumer scanning the QR.
- Customer experience is PWA-first and must not require app install or login for buyers.
- Product data (name, price, availability, ingredients, allergens, halal status) must come from owner-approved data only.
- AI must fallback rather than guess when data is missing or high-risk.
- POS, in-app payment processing, AR, native mobile apps, and marketplace aggregation are out of scope unless explicitly added.
- Every feature must work correctly under multi-tenant isolation — one tenant must never see another's data.
- Design for scale from day one: 1 tenant today, 1000+ tenants tomorrow, same codebase.

## Implementation Priorities

1. Correctness and tenant isolation first — never ship a feature that leaks data across tenants.
2. Mobile-first UX — primary target is 360px and 390px width on 4G.
3. Keep SvelteKit routes thin — domain and services own all business behavior.
4. Use provider adapters for AI/OCR/WhatsApp/email — never hard-code one vendor.
5. Test tenant isolation, AI guardrails, and RLS policies before any pilot use.
6. Performance budget: LCP ≤ 2.5s on 4G for public buyer routes.
7. Accessibility: WCAG 2.1 AA for all authenticated and public routes.

## Frontend Guidance

- Use **shadcn-svelte (next branch, Tailwind v4)** as the component base — copy-owned, not a runtime dependency.
- Use **bits-ui** as the headless accessibility primitive layer (shadcn-svelte uses it internally).
- Use **sveltekit-superforms + Zod** for complex admin forms (product CRUD, settings, invite staff).
- Design tokens live in `src/routes/layout.css` as `--lingua-*` CSS variables (Tailwind v4 `@theme` directive).
- Map shadcn CSS variables (`--primary`, `--background`, etc.) to `--lingua-*` tokens in the CSS variable mapping block.
- Use mobile-first responsive design — avoid two-column layouts below 768px.
- Tap targets: minimum 44px height for all interactive elements.
- Do not nest cards inside cards.
- Do not use decorative gradient blobs or generic AI visuals.
- Ensure long translated text, CJK text, and Arabic RTL do not break layout.
- Every major component needs: loading, empty, error, offline, and low-confidence states where relevant.
- Icons: lucide-svelte only.

## Technical Defaults

- **Frontend**: SvelteKit, Svelte 5 runes mode, TypeScript strict
- **Styling**: Tailwind CSS v4 (`@theme` directive), shadcn-svelte (copy-owned components)
- **UI Primitives**: bits-ui (headless, accessible)
- **Forms**: SvelteKit form actions + sveltekit-superforms + Zod for complex forms
- **Icons**: lucide-svelte
- **Validation**: Zod (shared across server actions, API handlers, tests)
- **Backend**: PostgreSQL (local Podman/Docker) + Redis + BullMQ
- **Auth**: Mock session (local dev) → Supabase Auth (production path)
- **AI**: Provider adapter (Anthropic / OpenAI-compatible) with prompt versioning and event logs
- **Testing**: Vitest (unit/domain), Testing Library (components), Playwright (e2e)
- **Deployment**: adapter-node → Cloudflare Workers or Vercel
- **Error monitoring**: Sentry

SvelteKit rules:

- Use `+page.server.ts` for private data and secret access.
- Use `+page.ts` only for browser-safe public data.
- Use form actions + superforms for admin/staff CRUD.
- Use `+server.ts` for JSON APIs, chat, webhooks, and non-form interactions.
- Keep domain logic out of `.svelte` files.
- Do not import repositories or provider SDKs from UI components.
- Use server load data and URL state before adding shared client state.
- Use scoped `.svelte.ts` rune modules only when shared reactive UI state is justified.
- Wrap complex third-party UI libraries behind project-owned components in `src/lib/ui/`.

If implementation chooses different tools, update `docs/Technical_Specification.md` with the reason.

## Architecture Rules

Layer order (top to bottom, no reverse imports):

```
UI Layer (.svelte)
  → Route Layer (+page.svelte, +layout.svelte, +page.server.ts)
    → Application Service Layer (src/lib/server/services/)
      → Domain Layer (src/lib/domain/)
      ← Repository Layer (src/lib/server/repositories/)
        ← Provider Layer (src/lib/server/providers/)
```

- Domain must not import SvelteKit, Supabase, or provider SDKs.
- Repositories do not call LLM/OCR/WhatsApp providers directly.
- Every tenant-owned query must scope by BOTH `organization_id` AND `restaurant_id`.
- Never rely solely on RLS — app-layer queries must be correct by construction.
- Platform admin (`super_admin`) bypasses tenant scoping for reads only.

## Component Ownership Model

shadcn-svelte components are **copy-owned code** in `src/lib/ui/`, not runtime dependencies. This means:

- Components are copied from shadcn-svelte registry into `src/lib/ui/`
- We own and can modify them freely
- Design tokens (`--lingua-*`) override shadcn's default CSS variables
- No vendor lock-in — if shadcn changes, our copies are unaffected
- bits-ui IS a runtime dependency (accessibility primitives used by shadcn components)

Component categories in `src/lib/ui/`:

- **shadcn-sourced**: Button, Input, Textarea, Badge, Card, Dialog, Alert, Skeleton, Sonner (toasts), Select, Tabs, DropdownMenu, Sheet, Table, Combobox, DatePicker, Command
- **project-owned**: Sidebar, BottomNav, TopBar, and any domain-specific components

## Safety and Verification

- Inspect current files and `git status` before edits.
- Do not overwrite user changes.
- Do not add dependencies without a clear reason and documentation update.
- Do not store secrets in the repo.
- Do not expose Supabase service role keys to the browser.
- Run the narrowest relevant verification available.
- Always run `pnpm check` after touching `.svelte` or `.ts` files.

## Database Testing Best Practices

**Always use local PostgreSQL for testing, never Supabase remote.**

Environment strategy:

| File               | Purpose                          | DB Target        |
| ------------------ | -------------------------------- | ---------------- |
| `.env.test`        | Test suite (committed)           | Local PostgreSQL |
| `.env.development` | Dev server (committed)           | Local PostgreSQL |
| `.env.production`  | Production template (committed)  | Supabase         |
| `.env`             | Developer overrides (gitignored) | Any              |

Test workflow:

```bash
pnpm infra:up         # Start PostgreSQL + Redis
pnpm db:reset         # Drop schema, apply all migrations, seed
pnpm test             # Runs with .env.test (local DB, RUN_DB_TESTS=true)
pnpm check            # TypeScript check
```

Key rules:

- `pnpm test` loads `.env.test` first via `src/test-setup.ts`, then `.env` as override.
- Never set `RUN_DB_TESTS=true` in `.env` pointing to Supabase unless explicitly integration testing.
- DB migration `0011_local_auth_stub.sql` provides a local `auth` schema stub so all 11 migrations run without Supabase.
- `0011_supabase_auth_bridge.sql` is conditional — only creates triggers when `auth.users` exists.
- Shell env vars always win over file-based env values.

When to use Supabase remote DB:

- Only for explicit integration testing: `DATABASE_URL=...supabase... pnpm test:unit -- -t "RLS"`
- Never as the default test target — it depends on network, shared state, and RLS policy drift.

## DCP Compress Tool (Context Management)

The `compress` tool manages conversation context. It is **always available** and must be used when context is full.

### Schema (range mode)

```json
{
	"topic": "Short label (3-5 words) for display - e.g., 'Auth System Exploration'",
	"content": [
		{
			"startId": "m0001",
			"endId": "m0012",
			"summary": "Complete technical summary replacing all content in range"
		}
	]
}
```

### Rules

- `startId`/`endId` format: `mNNNN` (raw messages) or `bN` (compressed blocks)
- Summaries must be **exhaustive** (capture file paths, decisions, code changes, user intent)
- But **lean** (no verbose tool output, no dead-ends)
- Use `(bN)` placeholders in summaries when referencing a previously compressed block
- Do NOT compress: active instructions, unresolved questions, or the current task
- Batch multiple non-overlapping ranges in one call
- Prioritize compressing older, closed sections first

### When to compress

- Context feels full or responses start degrading
- Research is done, implementation is verified, or exploration is exhausted
- A section is genuinely closed and raw conversation no longer needed

### Do NOT compress if

- Content is still relevant for the active task
- You need exact code, error messages, or file contents next
- The section is actively in progress

## ⚠️ CRITICAL: VERIFICATION BEFORE ANSWER

**The user has explicitly called out that I (the assistant) tend to guess/make things up instead of checking first. This must stop.**

**Rules for every technical/config question:**

1. **Schema ≠ Implementation.** Just because a config key exists in a Zod/JSON schema doesn't mean it works at runtime. Check the actual execution logic first.
2. **Check source code or documentation before answering.** If the answer depends on how a tool, library, or config actually works, I must read the relevant source code or official docs first.
3. **If unsure, say "saya cek dulu"** — do not speculate, do not guess, do not "probably" or "maybe."
4. **Verify claims with the actual source.** Every claim like "this feature exists" or "X supports Y" must be backed by either:
   - Source code (grep/read the actual files)
   - Official documentation
   - Tool output (verified with a real command)
5. **When reading code: read the full function, not just the signature.** Many bugs/incorrect answers come from reading a function name or schema and assuming what it does.
6. **Admit when wrong immediately.** If the user catches me making something up, I must verify the correct answer and fix it — no defensiveness.

## Documentation Rules

- Update PRD when product scope changes.
- Update Technical Specification when architecture, stack, data model, or APIs change.
- Update Architecture when module boundaries, dependency policy, or workflow rules change.
- Update TODO when task order or completion status changes.
- Log completed documentation or implementation milestones in `docs/COMPLETE-TODO.md`.

## Agent Skills

Available skills for specific tasks (load via skill tool):

- `svelte-code-writer` — MUST use when creating/editing any `.svelte` or `.svelte.ts` file
- `svelte-core-bestpractices` — load when writing Svelte components or modules
- `typescript-best-practices` — load when writing `.ts` files
- `tailwind-best-practices` — load when writing Tailwind utility classes
- `supabase` — load for ANY Supabase task (auth, DB, RLS, storage, realtime)
- `supabase-postgres-best-practices` — load when writing migrations or queries
- `frontend-design` — load when making design/layout decisions
- `git-commit` — load when committing changes
- `diagnose` — load when debugging hard bugs
