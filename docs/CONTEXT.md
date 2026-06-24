# Lingua Agent Context

This file gives future agents fast context without replacing the PRD or technical specification.

## One-Sentence Product Definition

Lingua is a multi-tenant SaaS platform that gives restaurants in tourist areas their own QR menu + AI guest support experience, with admin dashboards, staff inbox, and analytics — all from one deployment.

## Current Product Decision

Lingua is a full B2B SaaS product, not an MVP. One deployment serves many organizations and many restaurants. Each restaurant gets its own subdomain, QR experience, admin dashboard, and staff management. A platform admin dashboard manages all tenants from a single pane.

The product is NOT a POS, payment system, hotel management tool, or travel super-app. It is a guest communication platform for restaurants serving international tourists.

## Current Technical Decision

SvelteKit + Svelte 5 + TypeScript. Supabase (PostgreSQL + Auth + RLS + Storage + Realtime) as backend platform — with adapter patterns for all providers so migration to self-hosted PostgreSQL is possible without rewriting business logic.

The architecture must scale from 1 restaurant to 1000+ with proper tenant isolation at the application layer (explicit WHERE scoping) and database layer (RLS policies). Domain logic, services, repositories, and providers stay outside Svelte components.

## Personas

### Tourist (End User)

- Wants to understand food names, ingredients, spice, allergens, halal, and cultural context.
- Does not want to download an app.
- May be using spotty mobile data.
- Scans QR → gets instant menu in their language.
- No login, no install, no account.

### Restaurant Owner or Manager

- Owns or manages one or more restaurants.
- Wants fewer repeated questions from foreign guests and fewer wrong orders.
- Registers on Lingua, creates restaurant(s), uploads menu, prints QR codes.
- Gets a restaurant-specific admin dashboard.
- Can invite staff to help manage their restaurant.

### Staff

- Works at a specific restaurant.
- Receives fallback requests from tourists via the staff inbox.
- Sees only their assigned restaurant's data.
- Does not need a complex dashboard.

### Platform Admin (Super Admin / Developer)

- Operates the Lingua platform itself.
- Sees all organizations, all restaurants, system-wide analytics.
- Can suspend/activate organizations, change plans, provision resources.
- Access via `/platform` (separate route group, different navigation).
- This is NOT the same persona as a restaurant owner with multiple restaurants.

## Key Domain Objects

- **Platform**: the SaaS deployment itself. Owns all organizations.
- **Organization**: tenant/billing owner. Can have 1 to N restaurants.
- **Restaurant**: public customer-facing venue. Has its own subdomain, menu, QR tables, staff, dashboard.
- **Restaurant Location**: optional branch/location under a restaurant brand (post-MVP).
- **Table**: QR-scoped entry point for a customer session (scoped to one restaurant).
- **Menu**: versioned set of categories and items (published vs draft).
- **Menu Item**: dish/drink with structured flags and translations.
- **Knowledge Document**: restaurant-specific facts, policies, promos, cultural notes.
- **Customer Session**: anonymous table session created from QR scan.
- **Chat Message**: session-scoped customer/AI/staff message.
- **Fallback Request**: request for human staff help.
- **AI Event**: trace of model, prompt, retrieval, confidence, latency, and cost.
- **Membership**: user → organization → restaurant role binding.
- **Subscription/Plan**: billing tier with usage limits (free, starter, pro).
- **Invitation**: pending staff/admin invite to a restaurant.

## User Role Hierarchy

```
super_admin         → Platform owner. Full system access. /platform.
org_owner           → Owns an organization. Can manage all restaurants under it.
restaurant_admin    → Manages one specific restaurant. Can edit menu, invite staff, view analytics.
staff               → Works at one restaurant. Views inbox, resolves fallback requests.
anonymous (tourist) → No auth. QR-scoped to one table at one restaurant.
```

## Route Groups

```
src/routes/
  +page.svelte              Marketing landing page
  +layout.svelte            Root layout (language detection, theme)

  /login                    Sign-in (Supabase Auth)
  /register                 Registration entry (hybrid pathway)
  /register/restaurant      Restaurant-first registration
  /register/organization    Organization-first registration

  (platform)/               Platform admin (super admin only)
    /platform                Overview dashboard
    /platform/organizations   Manage all orgs
    /platform/restaurants     Manage all restaurants

  (dashboard)/              Restaurant admin dashboard
    /dashboard               Overview (restaurant-scoped)
    /dashboard/menu           Menu editor
    /dashboard/tables         QR table manager
    /dashboard/knowledge      Knowledge base
    /dashboard/analytics      Restaurant analytics
    /dashboard/staff          Staff management
    /dashboard/settings       Restaurant settings

  (staff)/                  Staff inbox
    /staff/inbox              Fallback request management

  (public)/                 Tourist QR experience (no auth)
    /r/[slug]/table/[code]   QR entry point

  api/                      JSON endpoints
    /api/public/*             Tourist-facing APIs
    /api/admin/*              Admin APIs
    /api/platform/*           Platform admin APIs
```

## Product Non-Negotiables

- Tourist flow must work without login or install.
- One deployment serves many tenants. Not one app per restaurant.
- QR links resolve both restaurant and table. `tableCode` alone is untrusted.
- AI must not invent ingredients, halal status, allergy safety, prices, or availability.
- High-risk dietary/allergy questions escalate to staff confirmation.
- Restaurant data must be tenant-isolated at both app and DB layers.
- Public routes must feel fast on mobile (LCP ≤ 2.5s on 4G).
- UI quality matters as much as backend capability.
- SvelteKit routes must stay thin; business rules in domain/services.
- Every external provider behind an adapter interface with mocks committed first.
- Platform admin is a separate product from restaurant admin. Different routes, different mental model.

## Architecture Principles for Scale

- **Small scale (1-10 restaurants):** Works on a single VPS or Supabase free tier. All queries scoped by org/restaurant.
- **Medium scale (10-100 restaurants):** RLS handles tenant isolation. Redis for caching + rate limiting. Background jobs for embeddings/OCR.
- **Large scale (100-1000+ restaurants):** Database connection pooling (PgBouncer). Read replicas for analytics queries. CDN for published menu data. Queue system for async work. Adapter pattern enables provider swapping without rewrites.

## Common Pitfalls to Avoid

- Building a chatbot-first app with weak structured menu browsing.
- Treating AI output as truth instead of restaurant-verified data.
- Designing the platform admin dashboard as just another restaurant dashboard.
- Forgetting that platform admin sees ALL data — no tenant scoping applies.
- Making the restaurant admin dashboard too complex for a small cafe owner.
- Mixing platform admin and restaurant admin concerns in the same layout.
- Hard-coding `localhost` for database connections (use `127.0.0.1` on Windows/WSL2).
