# Architecture Refactor Plan — ainything Multi-Business Platform

**Status:** Sprint CLEANUP selesai — semua old tables dropped, 308/308 tests pass  
**Date:** 25 Juni 2026 (updated)  
**Scope:** DB schema generalization + codebase refactor dari restaurant-specific ke multi-bisnis (restaurant, retail, jasa)

---

## Latar Belakang

Codebase saat ini dibangun dengan asumsi **restaurant sebagai satu-satunya bisnis**. Ini terlihat di:

- Tabel `restaurants` — nama, kolom `segment` hanya berisi nilai restaurant-specific
- Tabel `menus` / `menu_categories` / `menu_items` — terminologi menu/makanan
- Kolom `dietary_flags`, `allergens`, `menu_item_dietary_flags`, `menu_item_allergens` — restaurant-only
- Fungsi RLS `app.has_restaurant_access()` — hardcoded ke restaurant concept
- Services: `menu-admin-service.ts`, `restaurant-tables`, `restaurant_locations`
- Routes: `/r/[slug]/` — "r" untuk restaurant

Tapi visi produk ainything adalah: **platform digital presence untuk semua jenis UMKM** — restaurant, toko retail, jasa (laundry, barbershop, salon, bengkel, dll).

Core value proposition yang dipertahankan: **mengatasi kesenjangan bahasa antara pembeli/klien dengan bisnis**, lewat AI multilingual support.

---

## Prinsip Refactor

1. **Backward compatible di DB** — gunakan migrations baru, tidak hapus kolom lama
2. **Generalize naming** — `restaurant` → `outlet`, `menu` → `catalog`, `menu_item` → `product`
3. **Restaurant tetap first vertical** — fitur dietary/allergen/halal tetap ada, tapi dikondisikan per `business_type`
4. **Tidak break existing tests** — refactor bertahap, alias dulu baru rename
5. **DB-first** — schema generalization sebelum app layer

---

## Target Domain Model (Post-Refactor)

### Core Entities

```
organizations           → tidak berubah (org tetap tenant level atas)
  └── outlets           → ganti nama dari "restaurants"
        ├── outlet_locations    → ganti dari restaurant_locations
        ├── outlet_tables       → ganti dari restaurant_tables (opsional per type)
        ├── catalogs            → ganti dari menus
        │     ├── catalog_sections   → ganti dari menu_categories
        │     └── products           → ganti dari menu_items
        │           ├── product_translations  → ganti dari menu_item_translations
        │           ├── product_dietary_flags → tetap (restaurant-only, via business_type)
        │           └── product_allergens     → tetap (restaurant-only, via business_type)
        ├── knowledge_documents → tidak berubah
        ├── customer_sessions   → ganti ke "buyer_sessions"
        ├── chat_messages       → tidak berubah
        ├── fallback_requests   → tidak berubah
        ├── feedback            → tidak berubah
        ├── orders              → tidak berubah (generik)
        └── ai_events           → tidak berubah
```

### `outlets` table (ganti `restaurants`)

```sql
CREATE TABLE outlets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  public_host           text UNIQUE,
  location              text NOT NULL DEFAULT '',
  -- Generalized business type
  business_type         text NOT NULL DEFAULT 'restaurant'
                        CHECK (business_type IN (
                          'restaurant', 'cafe', 'retail', 'fashion',
                          'service', 'salon', 'laundry', 'repair',
                          'hotel', 'other'
                        )),
  -- Language support (core value prop)
  timezone              text NOT NULL DEFAULT 'Asia/Jakarta',
  default_language_tag  text NOT NULL DEFAULT 'id',
  language_tags         text[] NOT NULL DEFAULT ARRAY['id', 'en']::text[],
  -- Branding
  hero_image_url        text NOT NULL DEFAULT '',
  logo_url              text NOT NULL DEFAULT '',
  -- Business config
  accepts_orders        boolean NOT NULL DEFAULT true,
  requires_table        boolean NOT NULL DEFAULT false,  -- false untuk retail/jasa
  table_count           integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'archived')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
```

**Key changes dari `restaurants`:**

- `segment` (restaurant-specific: cafe/casual-dining/beach-club) → `business_type` (generik)
- `menu_scan_url` dihapus (dicompute dari `slug` di app layer)
- Tambah `logo_url`, `accepts_orders`, `requires_table`

### `catalogs` table (ganti `menus`)

```sql
CREATE TABLE catalogs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  -- Generalized status
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'archived')),
  -- Language
  default_language_tag text NOT NULL DEFAULT 'id',
  -- Type hint untuk UI rendering
  catalog_type    text NOT NULL DEFAULT 'menu'
                  CHECK (catalog_type IN ('menu', 'product_list', 'service_list', 'portfolio')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### `catalog_sections` table (ganti `menu_categories`)

```sql
CREATE TABLE catalog_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id      uuid NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  outlet_id       uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  display_order   integer NOT NULL DEFAULT 0,
  image_url       text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### `products` table (ganti `menu_items`)

```sql
CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      uuid NOT NULL REFERENCES catalog_sections(id) ON DELETE CASCADE,
  catalog_id      uuid NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  outlet_id       uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  price           numeric(12, 2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'IDR',
  image_url       text NOT NULL DEFAULT '',
  -- Generalized availability
  is_available    boolean NOT NULL DEFAULT true,
  stock_count     integer,  -- null = unlimited
  -- Restaurant-specific (conditional, populated only when business_type = 'restaurant'/'cafe')
  is_halal        boolean,
  spice_level     integer CHECK (spice_level BETWEEN 0 AND 5),
  -- Display
  display_order   integer NOT NULL DEFAULT 0,
  tags            text[] NOT NULL DEFAULT ARRAY[]::text[],
  -- Audit
  created_by      uuid REFERENCES app_users(id),
  updated_by      uuid REFERENCES app_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### RLS Functions (generalized)

```sql
-- Ganti app.has_restaurant_access() dengan app.has_outlet_access()
CREATE OR REPLACE FUNCTION app.has_outlet_access(p_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership_outlets mo
    JOIN memberships m ON m.id = mo.membership_id
    JOIN app_users u ON u.id = m.user_id
    WHERE mo.outlet_id = p_outlet_id
      AND u.external_auth_id = app.current_user_external_id()
  )
$$;
```

---

## Migration Strategy

### Phase 1 — Schema Extension (Additive Only)

Buat migration `0022_generalize_to_outlets.sql`:

```
- CREATE TABLE outlets (... business_type ...)
- Migrate data: INSERT INTO outlets SELECT * FROM restaurants (dengan kolom mapping)
- CREATE TABLE catalogs (... catalog_type ...)
- Migrate data dari menus
- CREATE TABLE catalog_sections
- Migrate dari menu_categories
- CREATE TABLE products (... stock_count, tags ...)
- Migrate dari menu_items
- Tambah VIEW restaurants AS SELECT ... FROM outlets WHERE business_type IN ('restaurant','cafe',...)
  → backward compat untuk kode yang belum diupdate
- Tambah VIEW menus AS SELECT ... FROM catalogs
- Tambah VIEW menu_categories AS SELECT ... FROM catalog_sections
- Tambah VIEW menu_items AS SELECT ... FROM products
```

**Strategy view-based backward compat** memungkinkan:

- Kode lama tetap jalan tanpa error
- Kode baru bisa langsung pakai nama baru
- Migrasi bertahap per service/repository

### Phase 2 — RLS Policy Update

Buat migration `0023_outlet_rls_policies.sql`:

```
- CREATE FUNCTION app.has_outlet_access()
- Buat semua policies untuk outlets, catalogs, catalog_sections, products
- Keep policies lama untuk views (backward compat)
```

### Phase 3 — App Layer Refactor

Urutan refactor di aplikasi:

```
1. src/lib/domain/ — update types dulu
   - menu/ → catalog/
   - Tambah domain/outlet/ (ganti domain/restaurant/)

2. src/lib/server/repositories/ — satu per satu
   - public-menu-repository.ts → public-catalog-repository.ts
   - menu-repository.ts → catalog-repository.ts
   - restaurant-repository.ts → outlet-repository.ts
   - Hapus alias setelah semua caller diupdate

3. src/lib/server/services/
   - menu-admin-service.ts → catalog-admin-service.ts
   - (setelah repository layer selesai)

4. src/routes/
   - (public)/r/[slug]/ — JANGAN rename dulu, URL-breaking change
   - Update internal variable names dulu
   - Slug "r" tetap untuk restaurant backward compat
   - Pertimbangkan /[slug]/ tanpa prefix untuk masa depan

5. DB migration untuk hapus lama (Phase 4, setelah semua stabil)
```

### Phase 4 — Cleanup (Setelah Semua Stabil)

```
Migration 0024_drop_old_tables.sql:
- DROP VIEW restaurants, menus, menu_categories, menu_items
- DROP TABLE restaurants, menus, menu_categories, menu_items
- DROP FUNCTION app.has_restaurant_access()
```

---

## Feature Flags per Business Type

Beberapa fitur hanya relevan untuk business type tertentu. Implementasi via `outlet.business_type`:

| Fitur                     | restaurant | cafe | retail | service | salon |
| ------------------------- | ---------- | ---- | ------ | ------- | ----- |
| Dietary flags / allergens | ✓          | ✓    | -      | -       | -     |
| Halal certification       | ✓          | ✓    | -      | -       | -     |
| Spice level               | ✓          | ✓    | -      | -       | -     |
| Table management          | ✓          | ✓    | opt    | -       | -     |
| Stock count               | -          | -    | ✓      | -       | -     |
| Service duration          | -          | -    | -      | ✓       | ✓     |
| Booking / appointment     | -          | -    | -      | ✓       | ✓     |
| Cart / orders             | ✓          | ✓    | ✓      | ✓       | -     |

---

## URL Strategy

Saat ini: `*.ainything.online/r/[slug]/menu`

Opsi untuk multi-bisnis:

1. **Tetap `/r/[slug]/`** — "/r" = "resource" bukan "restaurant" (sederhana, tidak break URL lama)
2. **`/[slug]/`** tanpa prefix — lebih clean, tapi breaking change
3. **`/b/[slug]/`** — "b" untuk "bisnis"

**Rekomendasi: Opsi 1** — ganti interpretasi "/r" jadi "resource" bukan "restaurant". Tidak ada breaking change, URL lama tetap valid.

---

## Naming Conventions (Final)

| Lama (restaurant-specific)     | Baru (generalized)                          |
| ------------------------------ | ------------------------------------------- |
| `restaurants`                  | `outlets`                                   |
| `restaurant_id`                | `outlet_id`                                 |
| `menus`                        | `catalogs`                                  |
| `menu_id`                      | `catalog_id`                                |
| `menu_categories`              | `catalog_sections`                          |
| `menu_items`                   | `products`                                  |
| `menu_item_id`                 | `product_id`                                |
| `menu_item_translations`       | `product_translations`                      |
| `menu_item_dietary_flags`      | `product_dietary_flags`                     |
| `menu_item_allergens`          | `product_allergens`                         |
| `restaurant_locations`         | `outlet_locations`                          |
| `restaurant_tables`            | `outlet_tables`                             |
| `customer_sessions`            | `buyer_sessions`                            |
| `app.has_restaurant_access()`  | `app.has_outlet_access()`                   |
| `menu-admin-service.ts`        | `catalog-admin-service.ts`                  |
| `public-menu-repository.ts`    | `public-catalog-repository.ts`              |
| `menu_scan_url`                | (computed, hapus dari schema)               |
| `segment` (cafe/casual-dining) | `business_type` (restaurant/retail/service) |

---

## Auth Strategy (Self-Hosted, bukan Supabase)

Stack saat ini: **self-hosted PostgreSQL + Redis di VPS**.  
Auth: **Auth.js (NextAuth v5)** sebagai pengganti Supabase Auth.

Implikasinya untuk DB schema:

- `app_users.external_auth_id` → tetap (Auth.js pakai provider user ID)
- `app.current_user_external_id()` → tetap via `set_config('app.user_external_id', ...)`
- Tidak ada `auth.users` table (itu Supabase-specific)
- Migration `0011_supabase_auth_bridge.sql` → skip/no-op di local
- Migration `0011_local_auth_stub.sql` → sudah benar untuk local

Tidak perlu perubahan schema untuk auth — cukup pastikan `external_auth_id` di-set dari Auth.js session di `hooks.server.ts`.

---

## Implementation Checklist

### Sprint DB-1: Schema Generalization ✅ SELESAI (25 Juni 2026)

- [x] Buat migration `0022_generalize_to_outlets.sql`
  - [x] CREATE TABLE outlets
  - [x] Migrate data dari restaurants
  - [x] CREATE TABLE catalogs, catalog_sections, products
  - [x] Migrate data dari menus, menu_categories, menu_items
  - [x] CREATE backward-compat VIEWs
- [x] Buat migration `0023_outlet_rls_policies.sql`
  - [x] CREATE FUNCTION app.has_outlet_access()
  - [x] Semua policies untuk tabel baru
- [x] `pnpm db:reset` → semua 23 migrations + seed bersih (309/309 tests pass)

### Sprint APP-1: Domain Types ✅ SELESAI

- [x] Buat `src/lib/domain/outlet/types.ts` — canonical types: Outlet, Catalog, CatalogSection, Product, OutletTable, BuyerSession, PublicCatalogBootstrap, TenantContext
- [x] Buat `src/lib/domain/outlet/schema.ts` — Zod schemas untuk outlet/catalog/product
- [x] Update `src/lib/domain/menu/types.ts` — backward-compat `@deprecated` markers + re-exports
- [x] `pnpm check` → 0 errors

### Sprint APP-2: Repository Layer ✅ SELESAI

- [x] `outlet-repository.ts` — admin CRUD outlets/catalogs/sections/products/tables
- [x] `outlet-row-mapper.ts` — row mappers + loadPublishedSections/Products
- [x] `public-catalog-repository.ts` — public QR buyer flow (outlets/buyer_sessions)
- [x] `admin-menu-repository.ts` — rewritten untuk products/catalogs; backward-compat shims
- [x] `embedding-repository.ts` — migrated ke `products` table
- [x] `platform-repository.ts` — migrated ke `outlets` table
- [x] `tenant-repository.ts` — `resolveOutletTenantContext` + `loadOutletsForMembership` via `membership_outlets`
- [x] `public-menu-repository.ts` — rewritten untuk outlets/outlet_tables
- [x] `menu-row-mapper.ts` — rewritten untuk catalog_sections/products
- [x] `retrieval-repository.ts` — migrated ke `products` table
- [x] `staff-inbox-repository.ts` — migrated ke `outlets`/`outlet_tables`
- [x] `pnpm test` → 308/308 pass

### Sprint APP-3: Service Layer ✅ SELESAI

- [x] `catalog-admin-service.ts` — new service untuk outlet-aware catalog CRUD
- [x] `outlet-management-service.ts` — new service untuk outlet CRUD/settings
- [x] `menu-admin-service.ts` — rewritten pakai outlet/catalog/product API
- [x] `chat-service.ts` — `handleCatalogChatTurn` untuk outlet context
- [x] `retrieval-service.ts` — updated
- [x] `customer-session-service.ts` — migrated ke `createBuyerSession` + `PublicCatalogBootstrap`
- [x] `guest-interaction-service.ts` — migrated ke `createFallbackRequest`/`createBuyerFeedback`

### Sprint APP-4: Route Layer ✅ SELESAI

- [x] `(dashboard)/+layout.server.ts` — pakai `?outlet=` param + `resolveOutletTenantContext`
- [x] `settings/+page.server.ts` — migrated
- [x] `api/internal/metrics`, `api/admin/embeddings`, `api/public/bootstrap`, `api/public/chat` — migrated
- [x] `public-context.ts` — `resolvePublicCatalogMenu` returning `PublicCatalogBootstrap`
- [x] `api/public/sessions`, `api/public/fallback`, `api/public/feedback` — migrated ke `resolvePublicCatalogMenu`
- [x] `cart/+page.server.ts` — migrated
- [x] URL `/r/[slug]/` tetap (tidak rename — backward compat)
- [x] `pnpm check` → 0 errors, `pnpm test` → 308/308 pass

### Sprint CLEANUP: Drop Old Tables ✅ SELESAI

- [x] Migration `0024_drop_old_tables.sql` — drops views + old tables (menu_items, menu_categories, menus, restaurants, dll); keeps feedback/fallback_requests/chat_messages/ai_events/knowledge_documents untuk migration 0026
- [x] Migration `0025_membership_outlets.sql` — CREATE TABLE membership_outlets + RLS
- [x] Migration `0026_migrate_operational_tables.sql` — ALTER knowledge_documents/chat_messages/fallback_requests/feedback/ai_events: restaurant_id→outlet_id, session_id→buyer_session_id; tambah FK ke outlets/buyer_sessions
- [x] Migration `0027_outlets_status.sql` — tambah kolom `status` ke outlets
- [x] Migration `0028_fix_rls_policies.sql` — drop `app.has_restaurant_access` CASCADE; fix RLS policies untuk knowledge_documents/chat_messages/fallback_requests/feedback/ai_events; tambah `outlets_active_public_select` + `outlet_tables_active_public_select` + `catalogs_active_public_select` + `catalog_sections_active_public_select` + `products_active_public_select`
- [x] Seed file updated — inserts ke outlets/outlet_locations/outlet_tables/catalogs/catalog_sections/products/buyer_sessions/membership_outlets; old tables removed
- [x] Test files rewritten — tenant-repository.db.test.ts, public-menu-repository.db.test.ts, migrations.db.test.ts
- [x] `pnpm db:reset` → 28 migrations + seed bersih
- [x] `pnpm check` → 0 errors
- [x] `pnpm test:unit` → 308/308 pass

---

## Risks dan Mitigasi

| Risk                                             | Mitigasi                                             |
| ------------------------------------------------ | ---------------------------------------------------- |
| Seed data rusak setelah rename                   | Update seeds di awal migration, test dengan db:reset |
| Tests referencing old table names                | Fix test fixtures setelah setiap migration           |
| RLS policy gap antara old/new tables             | Review semua policies di 0023 sebelum drop old       |
| Performance regression dari views                | Benchmark sebelum drop, views bisa jadi bottleneck   |
| URL breaking untuk existing QR codes di lapangan | Jangan rename `/r/[slug]/` — backward compat forever |
