# E2E Testing Guide — Ainything

Dokumen ini mencatat temuan, root causes, dan best practices yang ditemukan saat
menyelesaikan `tests/e2e/checkout-flow.spec.ts`. Dibaca oleh agent lain sebelum
membuat atau memperbaiki E2E test di repo ini.

---

## Stack

| Layer       | Tool                                |
|-------------|-------------------------------------|
| Test runner | Playwright (pnpm test:e2e)          |
| App server  | SvelteKit + adapter-node (vite preview) |
| Database    | PostgreSQL lokal (via pnpm db:reset) |
| Auth        | bcryptjs 2.4.3 + local auth provider |

---

## Cara Jalankan

```bash
# 1. Reset DB (migrations + seed)
pnpm db:reset

# 2. Build production bundle
pnpm build

# 3. Jalankan semua E2E
pnpm test:e2e

# 4. Jalankan satu spec file saja
pnpm test:e2e --grep "checkout-flow"
```

Playwright config (`playwright.config.ts`) menjalankan `vite preview` sebagai
webServer. Jangan lupa kill proses node lama sebelum run jika build baru diperlukan:

```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

---

## Temuan Kritis: Svelte Hydration Race Condition

### Masalah

Test `addFirstItemToCart` berhasil click button di DOM, tapi `localStorage` tidak
pernah ditulis — cart selalu kosong saat navigasi ke `/cart`.

### Root Cause

SvelteKit dengan adapter-node men-serve halaman sebagai **SSR HTML terlebih dulu**.
Svelte hydration (yang meng-attach `onclick` handlers) terjadi **setelah** event
`load` selesai. Playwright default menunggu event `load` sebelum kembali dari
`page.goto()` — tapi hydration belum tentu selesai saat itu.

Akibatnya:
- Button ada di DOM (dari SSR)
- CSS `:active` state terpicu saat click — terlihat seolah click berhasil
- Tapi `onclick={(e) => quickAdd(item, e)}` belum di-attach oleh Svelte
- `cart.add()` tidak pernah dipanggil → localStorage tidak ditulis

### Fix

Tambahkan `waitForLoadState('networkidle')` **sebelum** interaksi apapun yang
bergantung pada Svelte reactivity:

```typescript
async function addFirstItemToCart(page: Page) {
    // Tunggu sampai Svelte hydration selesai
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const quickAddBtn = page.getByRole('button', { name: /^add .+ to cart$/i }).first();
    await quickAddBtn.waitFor({ state: 'visible', timeout: 10000 });
    await quickAddBtn.click();

    await page.waitForTimeout(300); // flush Svelte reactivity
}
```

### Aturan

> **Setiap kali test berinteraksi dengan elemen yang punya Svelte event handler
> (onclick, oninput, onchange, dll), panggil `waitForLoadState('networkidle')`
> setelah `page.goto()` dan sebelum interaksi pertama.**

Ini berlaku untuk semua halaman SvelteKit di repo ini.

---

## Temuan: `getByLabel` Strict Mode

Playwright `getByLabel` mencari semua elemen yang di-associate dengan label, **termasuk
elemen hidden**. Jika halaman punya multiple match (misalnya SSR render dan client
render bersamaan), gunakan `.first()` atau `.nth(n)`.

Contoh yang sudah dipakai di spec:

```typescript
const nameInput = page.getByLabel(/nama|name/i).first();
```

---

## Temuan: RLS (Row Level Security) PostgreSQL

### Masalah

Query yang berjalan sebagai role `ainything_app` (bukan superuser) diblokir RLS
walaupun policy `WITH CHECK (true)` sudah ada.

### Root Cause

Beberapa policy menggunakan `STABLE` function dengan `SECURITY DEFINER` yang
berperilaku berbeda dalam konteks RLS — function tersebut tidak selalu mendapat
GUC (`app.user_external_id`) yang diperlukan.

### Fix

Gunakan `withDirectTransaction` (superuser pool) untuk operasi publik yang tidak
butuh user context:

- `createBuyerSession` — `src/lib/server/repositories/public-catalog-repository.ts`
- `insertOrder` (public cart) — `src/routes/(public)/r/[slug]/cart/+page.server.ts`
- `findOrderById` (public order page) — `src/routes/(public)/r/[slug]/order/[id]/+page.server.ts`

```typescript
// JANGAN — RLS blokir ainything_app
const order = await withTransaction(client => findOrderById(client, id));

// BENAR — bypass RLS untuk public routes
const order = await withDirectTransaction(client => findOrderById(client, id));
```

---

## Temuan: Auth — bcryptjs + Proxy + Private Methods

### bcryptjs versi

Gunakan `bcryptjs@2.4.3`. Versi 3.x crash di Node v24 karena konflik `SubtleCrypto`.

### compareSync vs compare

`bcrypt.compare()` (async) di dalam Proxy class melempar error:
`"Receiver must be an instance of class anonymous"`. Gunakan `bcrypt.compareSync()`.

### Proxy binding

`auth-factory.ts` menggunakan Proxy untuk inject instance. Setiap method yang
di-get dari Proxy harus di-bind ke instance asli:

```typescript
get(_target, prop) {
    const val = (_instance as any)[prop];
    return val && typeof val === 'function' ? val.bind(_instance) : val;
}
```

Tanpa ini, private class methods (`#resolveUser` dll.) tidak bisa diakses.

---

## Temuan: Locator Best Practices untuk Repo Ini

### aria-label i18n

Quick-add button di catalog menggunakan **hardcoded English** aria-label:
```svelte
aria-label="Add {item.name} to cart"
```

Test bisa match dengan regex case-insensitive:
```typescript
page.getByRole('button', { name: /^add .+ to cart$/i })
```

### Label teks i18n

| Key                    | ID                      | EN                      |
|------------------------|-------------------------|-------------------------|
| `cart.customerName`    | Nama Anda (opsional)    | Your name (optional)    |
| `cart.whatsapp`        | Nomor WhatsApp          | WhatsApp number         |
| `cart.placeOrder`      | Pesan Sekarang          | Place Order             |
| `cart.trackOrder`      | Lacak pesanan           | Track order             |

Gunakan regex OR untuk support kedua bahasa:
```typescript
page.getByLabel(/nama anda|your name/i)
page.getByRole('button', { name: /pesan sekarang|place order/i })
```

### Password input strict mode

Login page punya toggle button "Tampilkan password" yang bisa match `/password/i`.
Gunakan `#password` selector langsung:

```typescript
await page.locator('#password').fill('demo1234');
// BUKAN: page.getByLabel(/password/i)  ← strict mode violation (2 elements)
```

---

## Temuan: `listOrdersWithItems` SQL

Query di `order-repository.ts:listOrdersWithItems` memiliki subquery yang
menggunakan alias tabel berbeda dari outer query. Pastikan kondisi di subquery
menggunakan nama tabel yang benar (bukan alias outer):

```sql
-- SALAH (alias outer query bocor ke subquery)
WHERE o.outlet_id = $1

-- BENAR (nama tabel eksplisit di dalam subquery)
WHERE orders.outlet_id = $1
```

---

## Temuan: `loadProductsForOutlet` — Kolom Tidak Ada

Kolom `p.spice_level` tidak ada di tabel `products`. Jika query menggunakannya,
ganti dengan `0 AS spice_level`. Periksa **semua overload/fungsi** dengan nama
sama di file yang sama — ada 2 definisi `loadProductsForOutlet` di
`admin-menu-repository.ts`.

---

## Temuan: Env Vars di Module Scope

`src/lib/server/db/postgres.ts` dan file server lain tidak boleh membaca
`process.env.*` di module scope (top-level). Pada build adapter-node, `private_env`
belum tersedia saat module di-load.

Semua pembacaan env harus di dalam fungsi:

```typescript
// SALAH
const pool = new Pool({ connectionString: env.DATABASE_URL }); // top-level

// BENAR
function getPool() {
    return new Pool({ connectionString: env.DATABASE_URL }); // lazy, inside function
}
```

---

## Seed Data

File: `db/seeds/0001_demo_multi_tenant_data.sql`

| Outlet        | Slug            | checkout_mode | require_wa | payment_confirmation |
|---------------|-----------------|---------------|------------|----------------------|
| Taman Sate    | taman-sate      | offline       | false      | false                |
| Uma Karang    | uma-karang      | online        | true       | true                 |
| Senja Ramen   | senja-ramen-bali| online        | false      | false                |

Login untuk dashboard test:
- Email: `owner@bali-table.test`
- Password: `demo1234`

---

## Test 17 — Conditional Skip

Test `selecting a pending order shows confirm/reject actions` melakukan skip jika
tidak ada pending orders di DB. Ini expected — test bergantung pada data dinamis
(orders yang dibuat oleh test sebelumnya tidak persistent antar test run karena
`db:reset` membersihkan tabel).

Untuk membuat test 17 consistently pass: jalankan test suite secara berurutan
(bukan parallel) sehingga orders yang dibuat di test 8/13 tersedia untuk test 17.
Atau tambahkan seed data dengan pending order langsung di seed file.

---

## Checklist Sebelum Commit E2E Test Baru

- [ ] Tambahkan `waitForLoadState('networkidle')` sebelum interaksi pertama di halaman baru
- [ ] Gunakan regex OR (`/id text|en text/i`) untuk semua label/button text yang bisa i18n
- [ ] Jangan gunakan `getByLabel(/password/i)` — pakai `#password` selector
- [ ] Pastikan test tidak bergantung pada state dari test lain (gunakan `beforeEach` atau helper independen)
- [ ] Untuk test dashboard yang butuh login: gunakan `test.describe` dengan `beforeEach` login
- [ ] Jalankan `pnpm build && pnpm test:e2e --grep "nama-spec"` sebelum commit
