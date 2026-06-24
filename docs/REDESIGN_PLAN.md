# UI/UX Redesign Plan — Production Ready

**Date:** 24 Juni 2026
**Status:** Planning
**Goal:** Transformasi dari MVP (restaurant-only) ke production platform (UMKM multi-tenant) dengan UI modern, warm, dan tap-first.

---

## 0. Prinsip Desain

1. **Tap-first, not type-first.** Entry utama via QR/link. User tidak perlu ketik.
2. **Warm & approachable.** Bukan corporate SaaS. Pakai rounded corners (12-16px), warm neutrals, soft shadows, friendly illustrations.
3. **Role-appropriate dashboards.** Staff = sederhana & cepat. Owner = insight & kontrol. Developer/Platform = konfigurasi & monitoring.
4. **Catalog-first, not menu-first.** Tenant jual "produk" — bisa makanan, minuman, jasa, atau merchandise. Restoran = subset.
5. **Progressive disclosure.** Jangan tunjukkan semua sekaligus. Guide user step-by-step.
6. **Consistent design language.** Semua role pakai design system yang sama (warna, spacing, typography, motion).

---

## 1. Design System Upgrade

### 1.1 Color Palette — "Fresh Growth + Warm Hospitality"

Dirancang untuk multi-tenant UMKM (bukan hanya restoran). Fresh, friendly, approachable, modern.

```
Primary:     #059669 (emerald — fresh, growth, friendly, accessible)
Secondary:   #F59E0B (amber honey — warm, approachable)
Accent:      #EC4899 (rose — modern, fun, playful)
Background:  #FAFAF9 (warm white, softer than pure white)
Surface:     #FFFFFF
Border:      #E7E5E4 (warm gray)
Text:        #1A1A2E (near black with warm undertone)
Subtle:      #78716C (warm gray)
Success:     #059669 (emerald)
Warning:     #F59E0B (amber)
Error:       #EF4444 (red)
Info:        #3B82F6 (blue)
```

**Kenapa bukan forest green (#2D6A4F)?**
Forest green terlalu gelap dan "corporate banking", saturasi rendah (41%) — looks dull. Emerald (#059669) saturasi tinggi (94%) — looks vivid and fresh despite similar lightness. WCAG AA contrast 3.8:1 on white (passes AA Large). Pairing dengan amber honey dan rose memberikan warmth dan playfulness tanpa terasa childish.

Lihat `docs/DESIGN_SYSTEM.md` untuk dark mode tokens dan usage guidelines lengkap.

### 1.2 Typography

- Heading: `Plus Jakarta Sans` (geometric, modern, friendly)
- Body: `Inter` (readable, clean)
- Mono: `JetBrains Mono` (code/developer sections only)

### 1.3 Spacing & Radius

- Radius: 12px (cards), 8px (buttons/inputs), 16px (modals)
- Spacing scale: 4/8/12/16/24/32/48
- Shadow: `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.08)` (soft, layered)

### 1.4 Motion

- Transitions: `150ms ease-out` (micro), `300ms cubic-bezier(0.4, 0, 0.2, 1)` (macro)
- Page transitions: slide-up fade
- Skeleton loading: pulse animation

### 1.5 Component Patterns

- Cards: border-lingua-border, shadow-sm, hover:shadow-md + translate-y-[-1px]
- Buttons: solid (primary), outline (secondary), ghost (tertiary), icon-only (actions)
- Forms: floating labels, inline validation, tap-friendly hit targets (44px min)
- Empty states: illustration + CTA
- Toast: bottom-center, auto-dismiss 4s

---

## 2. Information Architecture

### 2.1 User Roles & Entry Points

```
GUEST (no login)
└─ QR scan / link → Catalog browsing → Product selection → Order/Inquiry

AUTHENTICATED
├─ Staff        → /staff/*        (orders, tasks, quick actions)
├─ Owner        → /dashboard/*    (analytics, catalog, team, settings)
└─ Developer    → /platform/*     (tenants, API keys, monitoring, billing)
```

### 2.2 Page Structure

```
/                          Landing page (marketing)
/login                     Login
/register                  Register (tenant type selection)
/register/setup            Setup wizard (after register)

/staff/inbox               Staff: orders/tasks queue
/staff/orders/[id]         Staff: order detail
/staff/settings            Staff: personal settings

/dashboard                 Owner: overview/home
/dashboard/catalog         Owner: products (CRUD)
/dashboard/categories      Owner: product categories
/dashboard/orders          Owner: order history & analytics
/dashboard/team            Owner: staff management
/dashboard/analytics       Owner: reports & insights
/dashboard/settings        Owner: tenant config
/dashboard/integrations    Owner: POS, payment, WhatsApp
/dashboard/billing         Owner: subscription & usage

/platform                  Developer: overview
/platform/tenants          Developer: all tenants
/platform/tenants/[id]     Developer: tenant detail
/platform/api              Developer: API keys & docs
/platform/monitoring       Developer: logs, errors, costs
/platform/billing          Developer: all subscriptions
/platform/settings         Developer: platform config

/r/[slug]                  Public: tenant catalog (QR entry)
/r/[slug]/order/[id]       Public: order tracking
```

---

## 3. Flow Design (Step by Step)

### 3.1 Landing Page (`/`)

```
[Hero]
  "Kelola bisnis Anda, tanpa ribet."
  [Mulai Gratis]  [Lihat Demo]

[Features — 3 cards]
  🛒 Katalog Digital    📱 QR/Link Instan    📊 Laporan Otomatis

[How It Works — 3 steps]
  1. Daftar & setup katalog (5 menit)
  2. Bagikan QR/link ke pelanggan
  3. Terima order & pantau laporan

[Testimonials]  [Pricing]  [Footer]
```

**Key:** Tidak ada form di landing. CTA langsung ke `/register`.

### 3.2 Registration (`/register`)

```
Step 1: Tenant Type Selection (tap cards)
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  🍽️          │  │  🛍️          │  │  💼          │
│  Restoran   │  │  Toko/Retail│  │  Jasa       │
│  & Cafe     │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘

Step 2: Account Info
  - Name
  - Email
  - Password (with strength indicator)

Step 3: Business Info
  - Business name
  - Slug (auto-generated, editable)
  - Category (dropdown)
  - Location (city selector)

[Create Account]
```

**Key:** Max 3 steps. Setiap step = 1 screen, tidak scroll. Progress bar di atas.

### 3.3 Setup Wizard (`/register/setup`)

Setelah register, user diarahkan ke wizard:

```
Step 1: Tambah produk pertama (atau skip)
  [Foto] [Nama] [Harga] [Deskripsi singkat]
  [Tambah Produk]  [Skip untuk sekarang]

Step 2: Generate QR/Link
  "Katalog Anda sudah siap!"
  [QR Code preview]  [Link: lingua.app/r/your-slug]
  [Download QR]  [Copy Link]  [Lanjut ke Dashboard]

Step 3: Invite staff (optional)
  [Email staff] [Role: Staff/Manager]
  [Kirim Undangan]  [Skip]
```

**Key:** Skip selalu tersedia. User bisa langsung ke dashboard tanpa setup.

### 3.4 Login (`/login`)

```
[Lingua Logo]

[Email]
[Password]

[Login]

[Lupa password?]  [Belum punya akun? Daftar]

--- atau ---

[Google]  [Email magic link]
```

**Key:** Minimalis. Tidak ada distraksi. Setelah login → redirect berdasarkan role.

---

## 4. Dashboard — Owner (`/dashboard/*`)

### 4.1 Overview/Home (`/dashboard`)

```
┌─────────────────────────────────────────┐
│  Hi, [Name]! 👋          [🔔 3] [Avatar]│
│  [Restaurant Name] ▼                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Order │ │Revenue│ │Visits│ │Rating│  │
│  │  12  │ │Rp 2.1M│ │ 234 │ │ 4.7★ │  │
│  │ +23% │ │ +15%  │ │ +8% │ │      │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  [Recent Orders — 5 items]              │
│  ┌───────────────────────────────────┐  │
│  │ #001  Meja A3   Rp 85.000  ⏳    │  │
│  │ #002  Takeaway  Rp 42.000  ✅    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Top Products — chart]                 │
│  [Quick Actions]                        │
│  [+ Tambah Produk] [📊 Lihat Laporan]  │
└─────────────────────────────────────────┘
```

### 4.2 Sidebar Navigation (Owner)

```
🏠 Overview
─────────────────
📦 Catalog
  ├─ Products
  ├─ Categories
  └─ Inventory (future)
─────────────────
📋 Orders
  ├─ Active
  └─ History
─────────────────
📊 Analytics
  ├─ Reports
  └─ Insights
─────────────────
👥 Team
  ├─ Staff
  └─ Invites
─────────────────
⚙️ Settings
  ├─ General
  ├─ QR & Links
  ├─ Integrations
  └─ Billing
```

**Key:** Grouped by domain. Max 2 levels deep. Icons + labels. Active state = background highlight.

### 4.3 Catalog — Products (`/dashboard/catalog`)

```
[Search products...]     [+ Tambah Produk]

Filter: [All ▼] [Active ▼] [Sort: Latest ▼]

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  [Image]    │  │  [Image]    │  │  [Image]    │
│  Nasi Goreng│  │  Es Teh     │  │  Sate Ayam  │
│  Rp 25.000  │  │  Rp 8.000   │  │  Rp 30.000  │
│  ✅ Active  │  │  ✅ Active  │  │  ⏸️ Hidden  │
│  [Edit] [⋯] │  │  [Edit] [⋯] │  │  [Edit] [⋯] │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Tap actions:**

- Card tap → edit product
- Long press → multi-select (bulk actions)
- [+] button → add product wizard (foto, nama, harga, kategori, deskripsi)

### 4.4 Orders (`/dashboard/orders`)

```
Tabs: [Active (3)] [Completed] [All]

┌───────────────────────────────────┐
│ #001  Meja A3          5 min ago │
│ Nasi Goreng x2, Es Teh x3       │
│ Total: Rp 74.000                 │
│ [✅ Accept]  [❌ Reject]          │
├───────────────────────────────────┤
│ #002  Takeaway          12 min   │
│ ...                              │
└───────────────────────────────────┘
```

---

## 5. Dashboard — Staff (`/staff/*`)

**Prinsip:** Sesederhana mungkin. Staff = execution, bukan analysis.

### 5.1 Layout

```
┌─────────────────────────────────┐
│  [Logo]  Staff: [Name]  [🔔]  │
├─────────────────────────────────┤
│                                 │
│  📋 Orders Queue                │
│  ┌───────────────────────────┐  │
│  │ #001  Meja A3    ⏳ Baru  │  │
│  │ Nasi Goreng x2            │  │
│  │ [👁️ Detail]  [✅ Proses]  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ #002  Takeaway   🔄 Siap │  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│                                 │
│  [Completed Today: 24 orders]   │
└─────────────────────────────────┘
```

**Key:** No sidebar. Single column. Big buttons. Status badges. Tap = action.

### 5.2 Order Detail (tap card)

```
┌─────────────────────────────────┐
│  ← Back        Order #001       │
├─────────────────────────────────┤
│  Meja A3                        │
│  ─────────────────────────────  │
│  Nasi Goreng            x2      │
│    Note: tidak pedas            │
│  Es Teh Manis           x3      │
│  ─────────────────────────────  │
│  Total: Rp 74.000               │
│                                 │
│  [🟡 Proses]  [🟢 Selesai]     │
│  [💬 Chat Customer]             │
└─────────────────────────────────┘
```

---

## 6. Dashboard — Developer/Platform (`/platform/*`)

**Prinsip:** Data-heavy, table-based, monitoring-focused. Desktop-first.

### 6.1 Sidebar

```
📊 Overview
─────────────────
🏢 Tenants
  ├─ All Tenants
  ├─ Onboarding
  └─ Suspended
─────────────────
🔑 API & Keys
  ├─ API Keys
  ├─ Webhooks
  └─ Usage Logs
─────────────────
📈 Monitoring
  ├─ Performance
  ├─ Errors (Sentry)
  └─ AI Costs
─────────────────
💰 Billing
  ├─ Subscriptions
  └─ Invoices
─────────────────
⚙️ Settings
```

---

## 7. Public — Customer/Buyer (`/r/[slug]`)

### 7.1 Catalog View (QR Entry)

```
┌─────────────────────────────────┐
│  [Logo]  [Restaurant Name]      │
│  ⭐ 4.7  📍 Bali               │
├─────────────────────────────────┤
│                                 │
│  [🔍 Search products...]        │
│                                 │
│  Filter: [Semua] [Makanan]     │
│          [Minuman] [Dessert]    │
│                                 │
│  ┌─────────────┐ ┌─────────────┐│
│  │  [Image]    │ │  [Image]    ││
│  │  Nasi Goreng│ │  Es Teh     ││
│  │  Rp 25.000  │ │  Rp 8.000   ││
│  │  [🛒 +]     │ │  [🛒 +]     ││
│  └─────────────┘ └─────────────┘│
│  ┌─────────────┐ ┌─────────────┐│
│  │  ...        │ │  ...        ││
│  └─────────────┘ └─────────────┘│
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🛒 3 items  Rp 58.000     │  │
│  │ [Lihat Keranjang →]       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 7.2 Cart & Checkout

```
┌─────────────────────────────────┐
│  Keranjang (3)                  │
├─────────────────────────────────┤
│  Nasi Goreng x2    Rp 50.000    │
│    [- 2 +]                      │
│  Es Teh x1         Rp 8.000     │
│    [- 1 +]                      │
├─────────────────────────────────┤
│  Total: Rp 58.000               │
│                                 │
│  [📝 Tambah Catatan]            │
│  [🚀 Pesan Sekarang]            │
└─────────────────────────────────┘
```

### 7.3 Order Tracking

```
┌─────────────────────────────────┐
│  Order #001                     │
│  ─────────────────────────────  │
│  ✅ Diterima                    │
│  🔄 Sedang Diproses  ← current  │
│  ⏳ Siap Diambil                │
│  ─────────────────────────────  │
│  [💬 Chat dengan Staff]         │
│  [🔙 Kembali ke Katalog]        │
└─────────────────────────────────┘
```

---

## 8. Refactoring Plan — Phased

### Phase 1: Foundation (Week 1-2)

- [ ] Design system: colors, typography, spacing, shadows → CSS variables
- [ ] Component library: Button, Card, Input, Badge, Modal, Toast, Skeleton
- [ ] Layout shells: landing, auth, dashboard (owner), staff, platform, public
- [ ] Navigation components: Sidebar (desktop), Bottom nav (mobile), Breadcrumbs

### Phase 2: Auth Flow (Week 2-3)

- [ ] Landing page (marketing)
- [ ] Login page (email + OAuth)
- [ ] Register flow (tenant type → account → business info)
- [ ] Setup wizard (first product → QR → invite staff)
- [ ] Forgot/reset password
- [ ] Email verification

### Phase 3: Owner Dashboard (Week 3-5)

- [ ] Overview/home (stats, recent orders, quick actions)
- [ ] Catalog: products CRUD (add/edit/delete, image upload, categories)
- [ ] Catalog: categories CRUD
- [ ] Orders: active + history + detail
- [ ] Team: staff list + invite + role management
- [ ] Settings: general info, QR/links, integrations (placeholder)
- [ ] Analytics: reports (date range, top products, revenue)

### Phase 4: Staff Dashboard (Week 5-6)

- [ ] Order queue (real-time)
- [ ] Order detail + status update
- [ ] Simple settings (name, notification)

### Phase 5: Public/Customer Flow (Week 6-7)

- [ ] Catalog view (QR entry)
- [ ] Product detail
- [ ] Cart + checkout (order creation)
- [ ] Order tracking (real-time status)
- [ ] Chat with staff (WebSocket/Realtime)

### Phase 6: Platform Admin (Week 7-8)

- [ ] Tenant management (list, detail, suspend/activate)
- [ ] API keys management
- [ ] Monitoring dashboard (performance, errors, AI costs)
- [ ] Billing overview (subscriptions, usage)

### Phase 7: Polish & Launch (Week 8-10)

- [ ] Mobile responsive audit (all pages)
- [ ] Dark mode (design system + all pages)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance audit (Lighthouse >90 all metrics)
- [ ] E2E tests (critical flows)
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment

---

## 9. Migration Strategy

**Tidak hapus kode lama sekaligus.** Gunakan strangler fig pattern:

1. Buat layout baru (`(v2)/dashboard/*`) parallel dengan yang lama
2. Implementasi halaman baru satu per satu di `(v2)/`
3. Redirect route lama ke `(v2)/` setelah ready
4. Hapus kode lama setelah semua migrated

**Database:** Schema sudah support multi-tenant. Tambah:

- `tenant_type` (restaurant, retail, service) → `organizations` table
- `products` table (generalize dari `menu_items`)
- `orders` table (generalize dari `fallback_requests`)
- `order_items` table

---

## 10. Success Metrics

| Metric                           | Target        |
| -------------------------------- | ------------- |
| Time to first product            | < 5 minutes   |
| QR scan to catalog view          | < 2 seconds   |
| Order placement taps             | < 5 taps      |
| Mobile Lighthouse score          | > 90          |
| Staff task completion            | < 30 seconds  |
| User confusion (support tickets) | < 5% of users |

---

## 11. Open Questions

1. **Payment integration:** In-app payment atau cash-only untuk MVP?
2. **Real-time:** WebSocket (Supabase Realtime) atau polling untuk order status?
3. **Multi-language:** Apakah customer-facing catalog perlu i18n dari awal?
4. **Offline:** Apakah staff dashboard perlu offline support (PWA)?
5. **Notification:** Push notification untuk new orders? (PWA + browser notification)
