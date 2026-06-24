# Redesign TODO — Action Items

**Based on:** `docs/REDESIGN_PLAN.md`
**Last Updated:** 24 Juni 2026
**Status:** Ready for Implementation

---

## 🔥 Priority 0: Foundation ✅ DONE

### 0.1 Design System Setup ✅ DONE

- [x] **Create design tokens** in `src/routes/layout.css`
  - Colors: primary (#059669 emerald), secondary (#F59E0B amber), accent (#EC4899 rose), neutrals (warm stone)
  - Typography: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (code)
  - Spacing: 4/8/12/16/24/32/48 scale
  - Shadows: xs, sm, md, lg, xl, glow
  - Radius: sm (8px), md (12px), lg (16px), xl (24px), full
  - Motion: 150ms (fast), 250ms (base), 400ms (slow) + easing curves
  - Dark mode tokens, warm stone neutrals
  - Utility classes: .surface, .tap-target, animations (fade-in, fade-in-up, slide-up, pulse-soft)
- [x] **Update `layout.css`** with new tokens (done, includes focus ring, glow shadow)
- [x] **Test dark mode compatibility** with new tokens

### 0.2 Component Library ✅ DONE

All components in `src/lib/ui/` with barrel exports in `index.ts`.

- [x] **Button** component (`src/lib/ui/Button.svelte`)
  - Variants: solid, outline, ghost, danger
  - Sizes: sm, md, lg
  - States: loading, disabled
  - Full-width option, icon slots
- [x] **Card** component (`src/lib/ui/Card.svelte`)
  - Header, body, footer snippets
  - Hover, clickable, padding options
- [x] **Input** component (`src/lib/ui/Input.svelte`)
  - Floating label, icon slots, error/helper text, accessible
- [x] **Textarea** component (`src/lib/ui/Textarea.svelte`)
  - Floating label, error/helper, accessible
- [x] **Badge** component (`src/lib/ui/Badge.svelte`)
  - Colors: default, success, warning, error, info, primary; Sizes: sm, md
- [x] **Modal** component (`src/lib/ui/Modal.svelte`)
  - Backdrop, ESC + outside click, slide-up, size variants, header/footer snippets
- [x] **Toast** component (`src/lib/ui/Toasts.svelte` + `toast-store.ts`)
  - Types: success, error, warning, info. Auto-dismiss (4s)
- [x] **Skeleton** component (`src/lib/ui/Skeleton.svelte`)
  - Variants: text, circle, rect, card. Pulse animation, multi-line
- [x] **AlertBanner** component (`src/lib/ui/AlertBanner.svelte`)
  - Backward-compatible: old `type`/`message` + new `variant`/`children`

---

## 🎯 Priority 1: Layout & Navigation (Week 1-2)

### 1.1 Landing Page (`src/routes/+page.svelte`) ✅ DONE

- [x] **Hero section**
  - Headline: "Kelola bisnis Anda, tanpa ribet"
  - Subheadline: value proposition
  - CTA buttons: [Mulai Gratis] [Lihat Demo]
  - Hero image/illustration
- [x] **Features section** (3 cards)
  - 🛒 Katalog Digital
  - 📱 QR/Link Instan
  - 📊 Laporan Otomatis
- [x] **How It Works** (3 steps)
- [x] **Testimonials**
- [x] **Pricing** (3 tiers: Free, Starter, Pro)
- [x] **Footer**
- [x] **Responsive:** mobile-first

### 1.2 Auth Flow ✅ PARTIAL

- [x] **Login page** (`src/routes/login/+page.svelte`)
  - Clean, centered card
  - Email + password inputs
  - [Login] button (solid, full-width)
  - [Lupa password?] link
  - [Belum punya akun? Daftar] link
  - Divider: "--- atau ---"
  - [Google] [Email magic link] buttons (outline)
- [x] **Register page** (`src/routes/register/+page.svelte`) — 3-step wizard
  - Step 1: Tenant type selection (3 tap cards: Restoran, Toko, Jasa)
  - Step 2: Account info (name, email, password)
  - Step 3: Business info (name, slug, category, location)
  - Progress bar at top
  - Each step = 1 screen (no scroll)
- [ ] **Setup wizard** (`src/routes/register/setup/+page.svelte`)
  - Step 1: Add first product (photo, name, price, description) + [Skip]
  - Step 2: Generate QR/link (preview + download/copy)
  - Step 3: Invite staff (email + role) + [Skip]
  - [Lanjut ke Dashboard] button at end
- [ ] **Forgot password** (`src/routes/auth/forgot-password/+page.svelte`)
  - Email input
  - [Kirim Link Reset] button
  - Success message
- [ ] **Reset password** (`src/routes/auth/update-password/+page.svelte`)
  - New password + confirm
  - Password strength indicator
  - [Update Password] button

### 1.3 Dashboard Layout (Owner) ✅ DONE

- [x] **New layout** (`src/routes/(dashboard)/+layout.svelte`)
  - Sidebar (desktop: 250px fixed, mobile: slide-out)
  - Top bar: tenant name, notifications, user avatar
  - Main content area
  - Mobile: bottom navigation (4 icons)
- [x] **Sidebar component** (`src/lib/ui/Sidebar.svelte`)
  - Logo at top
  - Nav groups (Overview, Catalog, Orders, Analytics, Team, Settings)
  - Active state: bg-lingua-primary-soft + text-lingua-primary-strong
  - Collapse on mobile (hamburger menu)
  - Restaurant/tenant switcher dropdown
- [x] **Bottom nav** (`src/lib/ui/BottomNav.svelte`)
  - 4 icons: Home, Catalog, Orders, Settings
  - Active indicator (dot or background)
  - Mobile only (< lg breakpoint)
- [x] **Top bar** (`src/lib/ui/TopBar.svelte`)
  - Breadcrumbs (optional)
  - Tenant switcher
  - Notifications bell (badge with count)
  - User avatar + dropdown (profile, settings, logout)

### 1.4 Staff Layout ✅ DONE

- [x] **New layout** (`src/routes/(staff)/+layout.svelte`)
  - No sidebar
  - Top bar: logo, staff name, notifications
  - Single column, full-width
  - Big buttons, tap-friendly
- [ ] **Order queue layout**
  - Cards with status badges
  - Tap card → detail view
  - Floating action button (if needed)

### 1.5 Platform Layout ✅ DONE

- [x] **New layout** (`src/routes/(platform)/+layout.svelte`)
  - Sidebar (wider: 280px)
  - Data-heavy tables
  - Desktop-first
  - Sidebar groups: Overview, Tenants, API, Monitoring, Billing, Settings

### 1.6 Public Layout (Customer) ✅ DONE

- [x] **New layout** (`src/routes/(public)/r/[slug]/+layout.svelte`)
  - Mobile-first
  - Top bar: tenant logo + name
  - Floating cart button (bottom-right)
  - No navigation (single-page app feel)

---

## 📦 Priority 2: Owner Dashboard Pages (Week 3-5)

### 2.1 Overview (`/dashboard`) ✅ DONE

- [x] **Stats cards** (4 cards in grid) — orders, revenue, catalog views, rating with trend arrows
- [x] **Recent orders** (5 clickable cards with status badges)
- [x] **Top products** (progress bars with food images)
- [x] **Quick actions** (Tambah Produk, Lihat Katalog)
- [x] **Responsive:** 2-column (mobile) → 4-column (desktop)

### 2.2 Catalog — Products (`/dashboard/catalog`) ✅ DONE

- [x] **Product grid** (cards with Unsplash images, name, price, status badge, orders count)
- [x] **Search bar** (filter by name)
- [x] **Category tabs** (filter by category)
- [x] **Status filter** (all/active/hidden dropdown)
- [x] **Add product button**
- [x] **Product card actions:** [⋯] menu → edit, toggle visibility, duplicate, delete
- [x] **Add/edit product modal** — photo upload (file input + preview), name, price (Rp prefix), category, description, availability toggle
- [x] **Empty state** with CTA

### 2.3 Catalog — Categories (`/dashboard/categories`) ✅ DONE

- [x] **Category grid** (cards with color dot, name, product count, description)
- [x] **Add/Edit category modal** (name, description, color picker)
- [x] **Delete action**
- [x] **Empty state**

### 2.4 Orders (`/dashboard/orders`) ✅ DONE

- [x] **Tabs:** Aktif | Selesai | Semua with counts
- [x] **Order cards** (ID, table/location, items, total, status badge, time)
- [x] **Search** by ID or table
- [x] **Order detail panel** (right side on desktop)
  - Status, location, time
  - Items list with quantity and notes
  - Total
  - Actions: Terima & Proses / Tandai Selesai / Tolak
- [x] **Empty state** per tab

### 2.5 Team (`/dashboard/team`) ✅ DONE

- [x] **Members list** with avatar photos, name, email, role badge
- [x] **Per-member actions:** Ubah Peran, Hapus dari Tim (non-owner only)
- [x] **Pending invites section** with cancel option
- [x] **Invite modal** — email input, role selector cards (Staff/Manager)

### 2.6 Analytics (`/dashboard/analytics`) ✅ DONE

- [x] **Range selector** (7 Hari / 30 Hari / 90 Hari)
- [x] **Summary stats** (4 cards: orders, revenue, catalog views, avg order)
- [x] **Bar chart** — orders per day (CSS-only, no external chart lib)
- [x] **Top products** with progress bars and food photos

### 2.7 Settings (`/dashboard/settings`) ✅ DONE

- [x] **General info** — business name, slug (lingua.app/r/ prefix), description, location
- [x] **QR & Link section** — QR preview, copy link button, open catalog link
- [x] **Billing / plan** — current plan card with usage limits
- [x] **Save with visual feedback** (Check icon + Tersimpan! state)

---

## 👨‍🍳 Priority 3: Staff Dashboard Pages (Week 5-6)

### 3.1 Order Queue (`/staff/inbox`)

- [ ] **Real-time order list** (auto-refresh or WebSocket)
- [ ] **Order cards** (ID, table/location, items preview, total, time, status badge)
- [ ] **Status filters:** New | Processing | Ready
- [ ] **Tap card → order detail**
- [ ] **Empty state** ("Belum ada order baru")

### 3.2 Order Detail (`/staff/orders/[id]`)

- [ ] **Back button**
- [ ] **Order info:** ID, table/location, customer name (if provided), time
- [ ] **Items list:** name, quantity, notes (e.g., "tidak pedas")
- [ ] **Total**
- [ ] **Status buttons:** [🟡 Proses] [🟢 Selesai] (big, tap-friendly)
- [ ] **Chat button** (if enabled)
- [ ] **Status timeline** (visual progress)

### 3.3 Staff Settings (`/staff/settings`)

- [ ] **Name** (read-only or editable)
- [ ] **Notifications** (toggle: new order alerts)
- [ ] **Logout button**

---

## 🛒 Priority 4: Public/Customer Flow (Week 6-7)

### 4.1 Catalog View (`/r/[slug]`)

- [ ] **Top bar:** tenant logo + name + rating
- [ ] **Search bar** (filter products)
- [ ] **Category tabs** (horizontal scroll: Semua, Makanan, Minuman, etc.)
- [ ] **Product grid** (2-column on mobile, 3-4 on desktop)
  - Image, name, price
  - [🛒 +] button (add to cart)
- [ ] **Tap product → detail modal**
  - Larger image
  - Full description
  - Dietary badges (vegetarian, halal, spicy)
  - Quantity selector
  - [Add to Cart] button
- [ ] **Floating cart button** (bottom-right)
  - Badge with item count
  - Tap → cart view
- [ ] **Empty state** (if no products)

### 4.2 Cart (`/r/[slug]/cart`)

- [ ] **Item list** (name, quantity, price, subtotal)
  - [- 2 +] quantity controls
  - [🗑️ Remove] button
- [ ] **Notes field** (per item or global)
- [ ] **Total**
- [ ] **Customer info** (optional: name, table number)
- [ ] **[Pesan Sekarang]** button (full-width, solid)
- [ ] **Empty state** ("Keranjang kosong")

### 4.3 Order Tracking (`/r/[slug]/order/[id]`)

- [ ] **Order ID + status**
- [ ] **Status timeline** (visual: ✅ Received → 🔄 Processing → 🟢 Ready)
- [ ] **Items summary** (collapsed)
- [ ] **Total**
- [ ] **[💬 Chat with Staff]** button (if enabled)
- [ ] **[🔙 Kembali ke Katalog]** button

### 4.4 Chat (Optional, Week 7-8)

- [ ] **Chat interface** (simple, real-time)
- [ ] **Message bubbles** (customer left, staff right)
- [ ] **Input + send button**
- [ ] **Auto-scroll to latest**
- [ ] **Typing indicator** (optional)

---

## 🔧 Priority 5: Platform Admin Pages (Week 7-8)

### 5.1 Overview (`/platform`)

- [ ] **Stats cards** (total tenants, active tenants, revenue, usage)
- [ ] **Recent activity** (new signups, suspensions)
- [ ] **Quick links** (to tenants, monitoring, billing)

### 5.2 Tenants (`/platform/tenants`)

- [ ] **Tenant table** (name, owner, plan, status, created)
- [ ] **Search + filters** (plan, status)
- [ ] **Tap row → tenant detail**
- [ ] **Tenant detail page** (`/platform/tenants/[id]`)
  - Info, usage stats, activity log
  - Actions: [Suspend] [Activate] [Delete]
- [ ] **Bulk actions** (optional)

### 5.3 API Keys (`/platform/api`)

- [ ] **Key list** (name, created, last used, status)
- [ ] **Generate new key** (modal)
- [ ] **Revoke key** (with confirmation)
- [ ] **Usage logs** (table: endpoint, timestamp, status)

### 5.4 Monitoring (`/platform/monitoring`)

- [ ] **Performance** (response time, uptime)
- [ ] **Errors** (Sentry integration, recent errors)
- [ ] **AI costs** (provider, tokens, cost per day)
- [ ] **Alerts** (if any thresholds breached)

### 5.5 Billing (`/platform/billing`)

- [ ] **Subscription list** (tenant, plan, status, MRR)
- [ ] **Usage overview** (total tenants per plan)
- [ ] **Invoices** (if integrated with payment provider)

---

## 🎨 Priority 6: Polish & Launch (Week 8-10)

### 6.1 Responsive Audit

- [ ] Test all pages at: 360px, 390px, 768px, 1024px, 1440px
- [ ] Fix layout breaks
- [ ] Optimize touch targets (44px min)
- [ ] Test on real devices (iOS Safari, Android Chrome)

### 6.2 Dark Mode

- [ ] Audit all components with dark mode
- [ ] Fix contrast issues
- [ ] Test readability

### 6.3 Accessibility

- [ ] Keyboard navigation (all interactive elements)
- [ ] Screen reader testing
- [ ] ARIA labels
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators

### 6.4 Performance

- [ ] Lighthouse audit (target: >90 all metrics)
- [ ] Optimize images (WebP, lazy loading)
- [ ] Code splitting (route-based)
- [ ] Bundle size audit

### 6.5 Testing

- [ ] E2E tests for critical flows:
  - Register → setup → add product
  - Login → dashboard → add product
  - QR scan → catalog → add to cart → order
  - Staff: receive order → process → complete
- [ ] Unit tests for new components
- [ ] Visual regression tests (optional)

### 6.6 Security

- [ ] Input sanitization audit
- [ ] CSRF protection
- [ ] Rate limiting (API endpoints)
- [ ] RLS policy review
- [ ] Dependency audit

### 6.7 Deployment

- [ ] Production environment setup
- [ ] Database migrations
- [ ] DNS + SSL
- [ ] Monitoring (Sentry, logs)
- [ ] Smoke tests
- [ ] Rollback plan

---

## 📊 Success Criteria

| Task            | Done When                                  |
| --------------- | ------------------------------------------ |
| Design system   | All tokens defined, 5+ components built    |
| Landing page    | Responsive, all sections, CTA works        |
| Auth flow       | Register → login → setup wizard complete   |
| Owner dashboard | All 7 pages functional, CRUD works         |
| Staff dashboard | Order queue + detail + status update works |
| Public catalog  | QR scan → view → add to cart → order works |
| Platform admin  | Tenant CRUD + monitoring dashboard works   |
| Polish          | Lighthouse >90, WCAG AA, no critical bugs  |

---

## 🚧 Migration Notes

**Parallel implementation:**

- Keep old routes (`/dashboard/*`, `/staff/*`, `/platform/*`) working
- Build new routes under `(v2)/` route group
- Use feature flag or env var to toggle between old/new
- Gradually redirect old routes to new after testing

**Database changes:**

- Add `tenant_type` to `organizations` (restaurant, retail, service)
- Create `products` table (generalize `menu_items`)
- Create `orders` + `order_items` tables (generalize `fallback_requests`)
- Add `categories` table (if not exists)
- Migration script to convert existing data

**Breaking changes:**

- None for existing tenants (backward compatible)
- New tenants use new schema from start

---

## 📝 Notes for Next Agent

1. **Design system (Priority 0) is DONE** ✅ — tokens in `layout.css`, 10 components in `src/lib/ui/`, barrel exports in `index.ts`
2. **Start with Priority 1** — Landing page, Auth flow, Layout shells
3. **Test on mobile early** — 360px width is the constraint
4. **Use mock data** for development, connect to real backend later
5. **Follow existing code patterns** — check `src/lib/server/services/` for service layer style
6. **Update this file** as you complete tasks
7. **Commit frequently** — small, focused commits (feat:, fix:, style:)
8. **Use design tokens** — all new components should use `bg-lingua-*`, `text-lingua-*`, etc. No hardcoded colors.
9. **Palette reference**: primary=#059669, secondary=#F59E0B, accent=#EC4899 (see `layout.css` or `DESIGN_SYSTEM.md`)
10. **Ask for clarification** if requirements are unclear

**PRD v2.0** (`docs/PRD_Lingua.md`) covers: multi-tenant scope, tap-first UX, product catalog + cart/order, role-based dashboards. Read it before starting Priority 1.

**Good luck!**
