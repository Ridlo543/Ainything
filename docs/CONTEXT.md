# Lingua Agent Context

This file gives future agents fast context without replacing the PRD or technical specification.

## One-Sentence Product Definition

Lingua is a multi-tenant UMKM SaaS platform that gives every business owner (restaurant, retail, jasa) their own digital product catalog, QR/link access, cart/order management, and buyer interaction — with admin dashboards, staff workflow, and AI support — all from one deployment.

## Current Product Decision

Lingua is a full B2B SaaS product for UMKM, not MVP. One deployment serves many organizations and many outlets. Each outlet gets its own QR experience, product catalog, cart/order system, admin dashboard, and staff management. A platform admin dashboard manages all tenants from a single pane.

The product is NOT a POS, payment system, hotel management tool, travel super-app, or marketplace aggregator. It is a digital presence + order management platform for UMKM, with tap-first UX designed so buyers never need to type.

Restaurants are the first vertical (AI-driven allergen/dietary support), but the core platform serves any UMKM type: retail shops, service providers, and beyond.

## Current Technical Decision

SvelteKit + Svelte 5 + TypeScript. Supabase (PostgreSQL + Auth + RLS + Storage + Realtime) as backend platform — with adapter patterns for all providers so migration to self-hosted PostgreSQL is possible without rewriting business logic.

The architecture must scale from 1 tenant to 1000+ with proper tenant isolation at the application layer (explicit WHERE scoping) and database layer (RLS policies). Domain logic, services, repositories, and providers stay outside Svelte components.

## Current Design Decision

Design system v2.0 "Fresh Growth + Warm Hospitality":

- Primary: emerald #059669 (friendly, growth, accessible)
- Secondary: amber #F59E0B (warm, approachable)
- Accent: rose #EC4899 (modern, playful)
- Warm neutrals (stone palette, not cool gray)
- Typography: Plus Jakarta Sans + Inter + JetBrains Mono
- Tap-first: 44px minimum hit targets
- Radius: 8px (controls), 12px (cards), 16px (modals)

Custom theme file: `.agents/skills/theme-factory/themes/fresh-growth.md`
Full specification: `docs/DESIGN_SYSTEM.md` v2.0

## Personas

### Pembeli / Konsumen (End User)

- Scans QR at outlet or opens link from social media
- Wants to see product catalog clearly: photos, names, prices, descriptions
- For restaurants: wants ingredient, allergen, halal, spice information
- Does not want to download an app
- May be using spotty mobile data or limited data plan
- Wants to select products and send order without waiting for staff
- No login, no install, no account

### UMKM Owner or Manager

- Owns or manages one or more outlets (restaurants, shops, service businesses)
- Wants a digital catalog that looks clean and professional
- Registers on Lingua, sets up products, generates QR codes
- Gets outlet-specific admin dashboard with catalog, orders, analytics
- Can invite staff to help operate the business
- Wants less manual ordering chaos and more business visibility

### Staff

- Works at a specific outlet
- Receives orders and fallback requests
- Sees only their assigned outlet's data
- Does not need a complex dashboard — just order queue + status buttons
- Gets real-time notifications for new orders

### Platform Admin (Super Admin / Developer)

- Operates the Lingua platform itself
- Sees all organizations, all outlets, system-wide analytics
- Can suspend/activate organizations, change plans, provision resources
- Access via `/platform` (separate route group, different navigation)
- Desktop-first, data-heavy tables, wider sidebar

## Key Domain Objects

- **Platform**: the SaaS deployment itself. Owns all organizations.
- **Organization**: tenant/billing owner. Can have 1 to N outlets.
- **Outlet**: public customer-facing venue. Has its own QR, catalog, cart, staff, dashboard. Previously called "Restaurant" — now generalized for any UMKM type.
- **Outlet Type**: classification — restaurant/café, retail/shop, service. Determines which features are enabled (e.g., dietary flags only for restaurants).
- **Table/Location**: QR-scoped entry point for a customer session (scoped to one outlet).
- **Category**: grouping for products (e.g., Makanan, Minuman, Pakaian, Layanan).
- **Product**: general catalog item — dish, drink, garment, service booking. Has name, price, image, description, category, availability.
- **Product Flag**: optional structured metadata — dietary flags (for restaurants), size/color (for retail), duration (for services).
- **Knowledge Document**: outlet-specific facts, policies, promos, cultural notes.
- **Customer Session**: anonymous session created from QR scan or link access.
- **Cart**: temporary selection of products (stored in browser or session).
- **Order**: committed cart sent from buyer → received at staff/owner dashboard. Items list, total, notes, status.
- **Order Item**: individual product within an order (name, quantity, price, notes).
- **Chat Message**: session-scoped customer/AI/staff message.
- **Fallback Request**: request for human staff help (generalized from restaurant-only).
- **AI Event**: trace of model, prompt, retrieval, confidence, latency, and cost.
- **Membership**: user → organization → outlet role binding.
- **Subscription/Plan**: billing tier with usage limits (free, starter, pro).
- **Invitation**: pending staff/admin invite to an outlet.

## User Role Hierarchy

```
super_admin         → Platform owner. Full system access. /platform.
org_owner           → Owns an organization. Can manage all outlets under it.
outlet_admin        → Manages one specific outlet. Can edit products, invite staff, view orders.
staff               → Works at one outlet. Views order queue, resolves orders and fallback requests.
anonymous (buyer)   → No auth. QR/link-scoped to one outlet.
```

## Route Groups

```
src/routes/
  +page.svelte              Marketing landing page
  +layout.svelte            Root layout (language detection, theme)

  /login                    Sign-in
  /register                 Registration entry (multi-step: type → account → business)
  /register/restaurant      Restaurant-first registration
  /register/organization    Organization-first registration

  (dashboard)/               Owner dashboard (redesigned layout + pages)
    /dashboard                Overview (stats, quick actions)
    /dashboard/catalog        Products CRUD
    /dashboard/orders         Order management
    /dashboard/analytics      Charts + insights
    /dashboard/team           Staff management
    /dashboard/settings       QR, integrations, billing

  (staff)/                   Staff dashboard (redesigned layout + pages)
    /staff/inbox              Order queue (real-time)
    /staff/orders/[id]        Order detail + status update
    /staff/settings           Profile, notifications

  (platform)/                Platform admin (super admin only)
    /platform                 Overview dashboard
    /platform/organizations   Manage all orgs
    /platform/tenants         Manage all tenants

  (public)/                  Public customer view (redesigned)
    /r/[slug]                 Catalog (search, filter, tap detail)
    /r/[slug]/cart            Cart review + send order
    /r/[slug]/order/[id]      Order tracking

  api/                       JSON endpoints
    /api/public/*             Buyer-facing APIs
    /api/admin/*              Admin APIs
    /api/platform/*           Platform admin APIs
```

Legacy routes archived to `routes-archive/` (outside SvelteKit routing).
    /dashboard/settings       Settings

  (staff)/                  OLD — Keep working until migrated
    /staff/inbox              Fallback request management

  (public)/                 OLD PUBLIC — Keep working
    /r/[slug]/table/[code]   QR entry point (legacy)

  api/                      JSON endpoints
    /api/public/*             Buyer-facing APIs
    /api/admin/*              Admin APIs
    /api/platform/*           Platform admin APIs
```

## Redesign Implementation Status

Active implementation plan: `docs/REDESIGN_PLAN.md` + `docs/REDESIGN_TODO.md`

Strangler fig migration complete: old routes moved to `routes-archive/`, new routes in canonical route groups.

UI stack: shadcn-svelte (copy-owned in `src/lib/ui/{component}/`) + bits-ui (headless primitives) + sveltekit-superforms + Zod. See `components.json` and `AGENTS.md` for details.

### Completed

- [x] Design system v2.0 — Fresh Growth tokens, shadcn CSS variable bridge, tw-animate-css
- [x] shadcn-svelte component library (16 components: button, badge, card, input, label, textarea, separator, skeleton, alert, dialog, select, tabs, dropdown-menu, sheet, table, sonner)
- [x] Project-owned layout components: Sidebar, BottomNav, TopBar
- [x] Priority 1: Landing page, Login, Register 3-step wizard, all layout shells (Owner, Staff, Platform, Public)
- [x] Route migration: old routes moved to `routes-archive/`, no more `(v2)` group

### In Progress

(nothing)

### Pending

- [x] Priority 2: Owner Dashboard pages ✅ DONE
  - /dashboard — overview, stat cards, recent orders, top products, quick actions
  - /dashboard/catalog — product grid, add/edit modal, image upload, status toggle
  - /dashboard/orders — tabs, order cards, detail panel, accept/reject actions
  - /dashboard/categories — category grid, add/edit modal, color picker
  - /dashboard/team — members list, invite modal, pending invites
  - /dashboard/settings — general info, QR/link section, billing plan card
  - /dashboard/analytics — range selector, stats cards, bar chart, top products
- [x] Priority 3: Staff Dashboard pages ✅ DONE (Order Queue, Order Detail, Settings)
- [x] Priority 4: Public/Customer flow ✅ PARTIAL (Catalog ✅, Cart ✅, Order Tracking, Chat)
- [ ] Priority 5: Platform Admin pages (Overview, Tenants, API, Monitoring, Billing)
- [ ] Priority 6: Polish & Launch (Responsive, Dark mode, Accessibility, Performance, Testing)

## Product Non-Negotiables

- Buyer flow must work without login or install. QR or link only.
- Tap-first UX: buyers should never need to type to complete an order.
- One deployment serves many tenants. Not one app per outlet.
- QR links resolve both outlet and table/location. Table code alone is untrusted.
- AI must not invent ingredients, halal status, allergy safety, prices, or availability.
- High-risk dietary/allergy questions escalate to staff confirmation.
- Tenant data must be tenant-isolated at both app and DB layers.
- Public routes must feel fast on mobile (LCP ≤ 2.5s on 4G).
- UI quality matters as much as backend capability. Warm, clean, modern design is not optional.
- SvelteKit routes must stay thin; business rules in domain/services.
- Every external provider behind an adapter interface with mocks committed first.
- Platform admin is a separate product from owner admin. Different routes, different mental model.

## Architecture Principles for Scale

- **Small scale (1-10 tenants):** Works on a single VPS or Supabase free tier.
- **Medium scale (10-100 tenants):** RLS + Redis for caching + rate limiting. Background jobs for embeddings/OCR.
- **Large scale (100-1000+ tenants):** Connection pooling, read replicas, CDN for published catalogs, queue for async. Adapter pattern enables provider swapping.

## Common Pitfalls to Avoid

- Building a chatbot-first app with weak product catalog browsing.
- Treating AI output as truth instead of owner-verified data.
- Designing the platform admin dashboard as just another owner dashboard.
- Forgetting that platform admin sees ALL data — no tenant scoping applies.
- Making the owner dashboard too complex for a small UMKM owner.
- Mixing platform admin and owner admin concerns in the same layout.
- Hard-coding `localhost` for database connections (use `127.0.0.1` on Windows/WSL2).
- Assuming all tenants are restaurants — dietary/allergen flags are restaurant-only, not universal.
