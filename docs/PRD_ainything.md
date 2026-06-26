# Product Requirements Document (PRD)

**Product Name:** ainything
**Tagline:** Multi-tenant UMKM digital presence and order management platform
**Version:** 2.0
**Date:** 24 Juni 2026
**Primary Market:** UMKM di Indonesia — kuliner (restoran, cafe, warung), retail (toko, butik), dan jasa (salon, laundry, bengkel)
**Business Model:** B2B SaaS untuk pemilik usaha, dengan pembeli/konsumen sebagai end user

---

## 0. Critical Review & Evolution

### Initial Review (v1.0 → v1.2)

Ide awal punya peluang untuk masalah komunikasi di hospitality, tetapi scope terlalu luas untuk MVP pertama: translator + rekomendasi + cultural advisor + dashboard + WhatsApp fallback + POS + reservasi + pembayaran + travel assistant sekaligus.

Keputusan produk setelah kritik:

- MVP fokus pada platform menu dan guest support multi-restoran
- Turis tidak perlu login atau install app — scan QR meja langsung pakai
- Restoran jadi pembayar dan admin data
- Satu deployment ainything melayani banyak organisasi/restoran

### Evolution to v2.0

Selama pengembangan MVP, ditemukan bahwa core platform — QR entry, product catalog, customer interaction, staff workflow — **tidak terbatas pada restoran**. Setiap UMKM punya produk yang ingin ditampilkan, pembeli yang ingin dilayani, dan staf yang perlu dikelola.

Keputusan v2.0:

- **Restaurant → UMKM multi-tenant.** Tenant bisa restoran/cafe/warung, retail (toko, butik), atau jasa (salon, laundry, bengkel).
- **Menu → Product Catalog.** Semua tenant punya katalog produk, bukan hanya makanan/minuman.
- **Browse-only → Cart + Order flow.** Pembeli bisa memilih produk dan mengirim pesanan ke dashboard staff/owner.
- **Restaurant admin → Owner dashboard.** Dashboard umum untuk semua jenis tenant.
- **Tap-first UX.** QR atau link sebagai entry point utama. User cukup tap-tap layar tanpa perlu mengetik.
- **Role-based dashboards.** Staff (sederhana, cepat), Owner (insight, kontrol), Platform admin (monitoring, konfigurasi).

---

## 1. Executive Summary

ainything adalah platform PWA + SaaS multi-tenant yang memberikan setiap tenant (UMKM) kemampuan memiliki:

- **Katalog produk digital** yang bisa diakses via QR code atau link
- **Sistem pemesanan** — pembeli pilih produk, kirim order ke dashboard
- **Dashboard owner** untuk mengelola produk, pesanan, staf, dan analytics
- **Dashboard staff** untuk memproses pesanan real-time
- **Platform admin** untuk mengelola semua tenant

Produk ini dirancang agar UMKM bisa go digital tanpa perlu website sendiri, tanpa install app, dan tanpa belajar tools yang rumit. Entry point selalu **QR atau link** — pembeli cukup tap-tap layar.

Klarifikasi model produk:

- ainything adalah satu platform untuk banyak tenant, bukan satu app per tenant.
- Tenant utama adalah `Organization` atau pemilik billing. Satu organization bisa memiliki satu atau banyak outlet/restaurant.
- `Outlet` adalah venue customer-facing yang punya katalog, QR, staff, dan dashboard sendiri.
- QR selalu mengarah ke konteks outlet tertentu, misalnya `/r/uma-karang/table/T07` atau `/r/warung-pak-hadi/meja/05`.
- Dashboard selalu scoped ke organization dan outlet yang diizinkan.

---

## 2. Problem Statement

### Masalah Pembeli/Konsumen

- Tidak semua UMKM punya website atau katalog digital yang rapi
- Sulit memahami nama produk, bahan, harga, dan ketersediaan tanpa bertanya
- Untuk restoran: takut salah pesan karena alergi, diet, halal, tingkat pedas
- Harus menunggu dilayani ketika UMKM sedang ramai
- Tidak mau install app satu per satu untuk setiap UMKM yang dikunjungi

### Masalah Pemilik UMKM

- Belum punya sistem digital untuk menampilkan produk
- Sulit memantau produk mana yang paling diminati
- Pesanan sering terlewat atau salah karena hanya dicatat manual
- Tidak punya data tentang perilaku pembeli
- Tidak punya cara mudah mengelola staf

### Masalah Staf

- Pesanan masuk dari berbagai arah: tatap muka, WhatsApp, telepon, catatan kertas
- Sulit melacak status pesanan yang sedang diproses
- Tidak ada notifikasi real-time untuk pesanan baru

### Why Now

- QR code sudah menjadi norma sosial pasca-pandemi
- Pembeli makin terbiasa browsing produk via mobile browser sebelum membeli
- UMKM kecil butuh solusi ringan tanpa investasi website sendiri
- Smartphone penetration sudah tinggi di kalangan UMKM dan konsumen

---

## 3. Product Positioning

**ainything is a multi-tenant UMKM platform that gives every business owner their own digital catalog, QR/link access, order management, and buyer interaction — all from one deployment.**

Pembeda utama:

- **Tap-first.** Entry via QR/link. Pembeli cukup tap layar — tidak perlu mengetik.
- **Multi-industry.** Bukan hanya restoran — cocok untuk retail, jasa, dan UMKM lainnya.
- **Product catalog, bukan menu static.** Setiap produk punya deskripsi, foto, harga, kategori, dan optional dietary/allergen flags (untuk restoran).
- **Cart + order flow.** Pembeli pilih produk → kirim pesanan → staff/owner terima di dashboard.
- **AI-powered (optional).** Untuk restoran: AI menjelaskan bahan, alergi, halal, dan konteks budaya. Untuk tenant lain: AI membantu customer bertanya tentang produk.
- **Staff inbox real-time.** Pesanan masuk ke staff dengan notifikasi dan ringkasan.
- **Tenant isolation.** Setiap tenant hanya melihat datanya sendiri.
- **Tidak perlu install.** PWA di mobile browser — scan QR langsung jalan.

---

## 4. Target Users

### Buyer: UMKM Owner or Manager

- Restoran/cafe/warung di area wisata maupun lokal
- Toko retail (baju, aksesoris, oleh-oleh)
- Penyedia jasa (salon, laundry, bengkel)
- Pain utama: belum punya katalog digital, pesanan tidak organized, kurang data
- Bisa single outlet atau multi-outlet operator

### End User: Pembeli / Konsumen

- Semua usia, semua bahasa
- Menggunakan smartphone pribadi
- Tidak mau install app
- Untuk restoran: bahasa awal prioritas English, Chinese, Korean, Japanese, Arabic, Hindi, French, German, Spanish, Indonesian
- Butuh jawaban cepat dari tap-tap layar

### Internal User: Staff

- Menerima dan memproses pesanan dari pembeli
- Melihat ringkasan pesanan sebelum bertindak
- Mendapat notifikasi real-time
- Tidak perlu belajar dashboard kompleks

### Internal User: Platform Admin

- Mengelola semua tenant di platform
- Monitoring usage, billing, dan system health
- Dapat suspend/activate tenant, generate API keys

---

## 5. Jobs To Be Done

### Pembeli

- Saat saya scan QR atau buka link UMKM, saya ingin langsung melihat katalog produk dalam format yang jelas
- Saat saya punya preferensi atau pantangan makan, saya ingin memfilter produk yang aman
- Saat saya ingin membeli, saya bisa memilih produk dan mengirim pesanan tanpa harus menunggu dilayani
- Saat AI tidak yakin jawaban soal produk, saya bisa hubungi staf dengan konteks yang sudah jelas

### Owner

- Saat saya mendaftar di ainything, saya ingin setup produk saya dengan cepat dan mudah
- Saat saya punya banyak produk, saya ingin mengorganisirnya di katalog yang rapi
- Saat pembeli mengirim pesanan, saya ingin menerima dan memprosesnya dengan efisien
- Saat saya ingin tahu performa bisnis, saya ingin melihat data penjualan dan produk terlaris

### Staff

- Saat ada pesanan baru, saya ingin mendapat notifikasi segera
- Saat saya melihat pesanan, saya ingin tahu apa yang dipesan dan statusnya
- Saat saya selesai memproses, saya bisa update status dengan satu tap

---

## 6. Core User Flows

### Flow 1: Buyer Flow (Tap-First)

1. Pembeli scan QR code di meja/counter atau buka link dari sosial media
2. PWA terbuka dengan katalog tenant (mobile-first, warm design)
3. Pembeli memilih bahasa (auto-detect untuk restoran di area wisata)
4. Pembeli browse katalog: foto, nama, harga, kategori, badges
5. (Restaurant-only) Pembeli filter: halal, vegetarian, vegan, nut-free, low spice
6. Pembeli tap produk → detail (deskripsi, bahan, allergens, recommendations)
7. Pembeli tap [Add to Cart] atau langsung order
8. Pembeli review cart, tambah notes jika perlu
9. Pembeli tap [Send Order] → pesanan masuk ke dashboard staff/owner
10. Pembeli bisa track status pesanan
11. (Optional) Pembeli bisa chat dengan AI atau minta bantuan staf langsung

### Flow 2: Owner Registration & Setup

1. Owner buka landing page ainything
2. Owner tap [Mulai Gratis] → halaman registrasi
3. Step 1: Pilih tipe usaha (Restoran/Cafe, Toko/Retail, Jasa/Service) — tap cards
4. Step 2: Isi informasi akun (nama, email, password)
5. Step 3: Isi informasi bisnis (nama usaha, kategori, lokasi)
6. Owner masuk ke setup wizard:
   - Add produk pertama (foto, nama, harga) + [Skip]
   - Generate QR/link untuk outlet + [Download/Copy]
   - Invite staf (email, role) + [Skip]
7. Owner masuk ke dashboard → ready to use

### Flow 3: Owner Dashboard

1. Owner login → dashboard overview
2. Lihat stats: orders today, revenue, catalog views, rating
3. Quick actions: add product, view reports, share QR
4. Navigate sidebar: Overview, Catalog, Orders, Analytics, Team, Settings
5. Kelola produk: add, edit, hide, delete, set price
6. Kelola pesanan: accept, process, complete, see history
7. Lihat analytics: revenue chart, top products, peak hours
8. Invite/manage staff
9. Configure QR codes, integrations, billing

### Flow 4: Staff Flow

1. Staff login ke dashboard sederhana
2. Lihat order queue (real-time, auto-refresh)
3. Tap pesanan → detail (items, notes, table/location)
4. Update status: [Proses] → [Selesai]
5. (Optional) Chat dengan pembeli

### Flow 5: Platform Admin

1. Admin login ke /platform (separate layout)
2. Overview: total tenants, active tenants, revenue, usage
3. Manage tenants: CRUD, suspend/activate, change plans
4. Monitoring: performance, errors, AI costs
5. Billing: subscriptions, usage, invoices

---

## 7. MVP Scope (Production v2.0)

### P0 — Must Have

**Foundation:**

- Landing page modern, warm, tap-friendly
- Registrasi multi-step (tipe usaha → akun → bisnis info)
- Login + forgot/reset password
- Setup wizard (add produk + generate QR + invite staf)

**Owner Dashboard:**

- Overview (stats cards + quick actions)
- Catalog: products CRUD, categories, search, filter
- Cart/Order management (receive, process, complete)
- QR/Link generation
- Basic analytics
- Settings (business info, QR codes, integrations)

**Staff Dashboard:**

- Order queue real-time
- Order detail + status update
- Notifications

**Public/Customer View:**

- QR/link entry (no login required)
- Product catalog (search, filter by category, tap detail)
- Add to cart + send order
- Order tracking
- (Restaurant) Dietary/allergen preferences and badges

**Platform Admin:**

- Tenant management
- Monitoring
- Basic billing

### P1 — Should Have

- OCR-assisted product import (photo → data extraction)
- AI assistant for product queries (restaurant context + general UMKM context)
- Multilingual catalog (for tourist-facing businesses)
- Staff inbox dengan ringkasan percakapan AI
- Advanced analytics (charts, export)
- WhatsApp integration (optional notification channel)

### P2 — Later

- Voice interaction (STT/TTS)
- POS integration
- Payment processing
- Loyalty programs
- Multi-table group ordering (restaurant)
- AR product visualization

---

## 8. Non-Goals

- Tidak membangun POS baru
- Tidak memproses pembayaran (di v2.0)
- Tidak membuat native mobile app
- Tidak menjadi marketplace atau aggregator
- Tidak mengklaim diagnosis medis atau jaminan 100% aman alergi
- AI tidak boleh menjawab di luar data produk yang diverifikasi
- AR, travel planning, dan hotel management — tidak di roadmap saat ini

---

## 9. Functional Requirements

### Customer PWA

- Harus bisa dipakai di mobile browser tanpa install
- Layout mobile-first dengan tap targets minimal 44px
- Harus punya loading, empty, error, offline, dan low-confidence states
- Harus mendukung teks panjang (DE, AR RTL, CJK, nama produk lokal)
- Floating cart button dengan counter
- Responsive di 360px, 390px, 768px, 1024px, 1440px

### Owner Dashboard

- Harus multi-tenant: owner hanya melihat outlet yang dikelola
- Harus mendukung organization dengan banyak outlet + outlet switcher
- Harus punya CRUD produk lengkap (add, edit, hide, delete, categorize)
- Harus punya order management (receive, process, complete)
- Harus menampilkan QR code per meja/lokasi
- Harus punya public preview customer view
- Harus punya analytics dasar (revenue, orders, top products)

### Staff Dashboard

- Harus sederhana — order queue + detail + status buttons
- Harus real-time atau near-real-time
- Harus punya notifikasi untuk pesanan baru
- Tidak perlu sidebar atau navigasi kompleks

### Platform Admin

- Desktop-first, data-heavy tables
- Wider sidebar (280px)
- Full tenant CRUD
- System monitoring (performance, errors, costs)
- Subscription management

### AI Assistant (Restaurant Context)

- Harus mengambil konteks dari produk, restaurant profile, dan knowledge base
- Harus menolak menjawab jika di luar cakupan
- Harus memberi confidence/fallback signal untuk alergi, halal, bahan tidak pasti
- Harus menyimpan trace untuk debugging
- Harus fallback ke staf ketika tidak yakin

### Data Quality Gate

- Produk hanya publish jika punya nama, harga, dan status ketersediaan
- Allergen/halal flags punya nilai confidence eksplisit
- "Unknown → staff confirm" default, bukan kosong atau ditebak
- AI tidak boleh menaikkan kepastian melebihi data yang diverifikasi

---

## 10. UX and UI Principles

### Design Philosophy

ainything harus terasa **modern, warm, friendly, dan approachable** — bukan corporate SaaS.

| Principle            | Implementation                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| **Tap-first**        | Entry via QR/link. Semua interaksi utama via tap, bukan type           |
| **Warm & clean**     | Warm neutrals (#FAFAF9 bg), minimal shadows, 8-12px radius             |
| **Fresh primary**    | Emerald (#059669) — growth, friendly, accessible. Bukan corporate dark |
| **Warm secondary**   | Amber (#F59E0B) — approachable, sweet                                  |
| **Playful accent**   | Rose (#EC4899) — modern, fun                                           |
| **44px tap targets** | Semua tombol dan interactive elements min 44px                         |
| **Progressive**      | Jangan tampilkan semua sekaligus. Guide step-by-step                   |
| **Consistent**       | Design system sama di semua role dan halaman                           |

### Layout Patterns

- **Mobile**: Bottom navigation (4 icons) + slide-out sidebar. Single column.
- **Tablet**: Collapsible sidebar. 2-column content.
- **Desktop**: Fixed sidebar (250px owner, 280px platform). Multi-column grids.

### Component Standards

- Button: solid/outline/ghost/danger variants, sm/md/lg sizes, loading spinner
- Card: header/body/footer snippets, hoverable, clickable
- Input: floating label, icon slots, error/helper text, accessible
- Badge: 6 color variants, 2 sizes
- Modal: backdrop, escape key, slide-up, size variants
- Toast: 4 types, auto-dismiss, swipe to dismiss
- Skeleton: text/circle/rect/card, pulse animation
- EmptyState: illustration + title + description + CTA

### Typography

- **Heading**: Plus Jakarta Sans (geometric, modern, friendly)
- **Body**: Inter (readable, clean, universal)
- **Mono**: JetBrains Mono (code/developer sections only)

### Design System

Full specification: `docs/DESIGN_SYSTEM.md` v2.0

Custom theme: `.agents/skills/theme-factory/themes/fresh-growth.md`

---

## 11. Success Metrics

### Pilot Metrics

- 10 UMKM pilot aktif dalam 90 hari
- Minimal 60% pilot tenant tetap aktif setelah 60 hari
- Minimal 30% QR aktif selama jam operasi
- Minimal 50 sesi customer per outlet per bulan

### Product Metrics

- p95 first screen load <= 2.5 detik di 4G
- p95 AI answer <= 5 detik (restaurant AI mode)
- Fallback rate 10-25%
- Customer feedback helpful >= 80%
- Owner setup time: produk pertama live <= 15 menit

### Measurement Method

- Fallback rate = fallback_requests / total_sessions
- Helpful feedback = feedback.helpful / total_feedback
- Latency p95 = persentil latency per tipe
- Scan/sesi aktif = customer_sessions per outlet per periode

### Cost Control

- Setiap outlet punya cap harian AI-call
- Public routes pakai rate limit per sesi dan per IP
- Pre-compute translations untuk bahasa prioritas

### Business Metrics

- Pilot tenant bersedia bayar setelah trial
- Minimal 3 testimoni owner/staff
- Bukti awal upsell: produk rekomendasi dilihat/dipilih lebih sering

---

## 12. Business Model

### Free Tier

- 1 outlet per organization
- Up to 50 products
- Basic QR/link
- Limited analytics (7 hari)

### Starter

- Up to 3 outlets
- Unlimited products
- AI assistant (restaurant mode)
- Advanced analytics
- Staff management

### Pro

- Unlimited outlets
- Priority support
- Custom integrations
- SLA
- WhatsApp integration
- White-label option

---

## 13. Go-To-Market

### Phase 1: Restaurant Pilot

- 3-5 restoran pilot (existing MVP contacts)
- Focus: validate tap-based ordering, AI accuracy, staff workflow
- Installation package: QR cards, admin training, staff workflow

### Phase 2: Multi-Tenant Expansion

- Expand to 10 UMKM (restaurant + retail + jasa mix)
- Validate multi-industry fit
- Refine onboarding for non-restaurant tenants

### Phase 3: Growth

- Referral from pilot tenants
- Partnerships with UMKM communities
- Self-serve registration flow

---

## 14. Risks and Mitigations

| Risk                       | Impact | Mitigation                                                            |
| -------------------------- | ------ | --------------------------------------------------------------------- |
| AI salah soal alergi/halal | High   | Confidence gate, verified flags, disclaimer, staff fallback           |
| Owner tidak update produk  | Medium | Simple admin UX, sold-out toggle, reminders                           |
| Onboarding produk lambat   | High   | OCR-assisted import, manual review UI, spreadsheet import             |
| Latensi AI tinggi          | High   | Precompute, cache, streaming, smaller model for simple tasks          |
| Biaya LLM naik             | Medium | Provider adapter, usage caps, prompt caching                          |
| Adopsi rendah              | High   | Pilot scripts, QR placement, staff training, measurable ROI dashboard |
| Privacy/compliance         | Medium | Data minimization, retention policy, consent                          |
| UMKM tidak tech-savvy      | High   | Tap-first UX, setup wizard, minimal typing, in-app guidance           |
| Order spam/abuse           | Medium | Rate limiting per session, tenant-level order caps                    |

---

## 15. Roadmap

### Month 0-1: Design System + Foundation

- [x] Design system v2.0 (colors, typography, components)
- [ ] Landing page redesign
- [ ] Registration flow (multi-step, tap-friendly)
- [ ] Login + forgot password
- [ ] Setup wizard
- [ ] Layout shells (Owner, Staff, Platform, Public)

### Month 1-3: Owner Dashboard

- [ ] Overview, Catalog (CRUD), Orders management
- [ ] QR/Link generation
- [ ] Basic analytics
- [ ] Team management
- [ ] Settings

### Month 3-4: Public/Customer Flow

- [ ] QR entry → product catalog → cart → order
- [ ] Order tracking
- [ ] AI assistant (restaurant mode)
- [ ] Multilingual support

### Month 4-5: Staff Dashboard + Platform Admin

- [ ] Staff order queue (real-time)
- [ ] Staff order detail + status update
- [ ] Platform admin tenant management
- [ ] Platform monitoring

### Month 5-6: Pilot & Polish

- [ ] Restaurant pilot (5 outlets)
- [ ] Multi-tenant expansion (5 UMKM non-restaurant)
- [ ] Responsive audit (360px-1440px)
- [ ] Dark mode audit
- [ ] Accessibility audit (WCAG AA)
- [ ] Performance (Lighthouse >90)

---

## 16. Open Questions

- Which UMKM segment (restaurant vs retail vs jasa) has the strongest willingness to pay?
- Do customers prefer browsing first or searching first?
- How much product data can small UMKM owners verify without friction?
- How should the cart work for service-type businesses (salon: book a service vs restaurant: order food)?
- Should WhatsApp integration be in v2.0 or deferred?
- How to handle multi-language for non-restaurant UMKM (retail product names in Indonesian + English)?
