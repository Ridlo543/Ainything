# E2E Testing Guide — Ainything

Dokumen ini mencatat temuan, root causes, dan best practices yang ditemukan saat
memperbaiki semua spec E2E di repo ini. Dibaca oleh agent lain sebelum membuat
atau memperbaiki E2E test.

---

## Stack

| Layer       | Tool                                    |
| ----------- | --------------------------------------- |
| Test runner | Playwright (pnpm test:e2e)              |
| App server  | SvelteKit + adapter-node (vite preview) |
| Database    | PostgreSQL lokal (via pnpm db:reset)    |
| Auth        | bcryptjs 2.4.3 + local auth provider    |

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
const order = await withTransaction((client) => findOrderById(client, id));

// BENAR — bypass RLS untuk public routes
const order = await withDirectTransaction((client) => findOrderById(client, id));
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
page.getByRole('button', { name: /^add .+ to cart$/i });
```

### Label teks i18n

| Key                 | ID                   | EN                   |
| ------------------- | -------------------- | -------------------- |
| `cart.customerName` | Nama Anda (opsional) | Your name (optional) |
| `cart.whatsapp`     | Nomor WhatsApp       | WhatsApp number      |
| `cart.placeOrder`   | Pesan Sekarang       | Place Order          |
| `cart.trackOrder`   | Lacak pesanan        | Track order          |

Gunakan regex OR untuk support kedua bahasa:

```typescript
page.getByLabel(/nama anda|your name/i);
page.getByRole('button', { name: /pesan sekarang|place order/i });
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

| Outlet      | Slug             | checkout_mode | require_wa | payment_confirmation |
| ----------- | ---------------- | ------------- | ---------- | -------------------- |
| Taman Sate  | taman-sate       | offline       | false      | false                |
| Uma Karang  | uma-karang       | online        | true       | true                 |
| Senja Ramen | senja-ramen-bali | online        | false      | false                |

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

## Temuan Kritis: Svelte 5 Infinite Effect Loop

### Masalah

Modal tidak pernah muncul setelah button click. Browser console menunjukkan:
`[pageerror] https://svelte.dev/e/effect_update_depth_exceeded`

Button click berhasil, `onclick` handler terpanggil, tapi DOM tidak pernah diupdate.

### Root Cause

`$effect` yang me-mutate `$state` yang dibacanya — menciptakan loop reaktif tak terbatas.
Svelte 5 crash sebelum render bisa terjadi:

```svelte
<!-- SALAH — SvelteSet dibaca dan dimutate di dalam $effect yang sama -->
let expandedGroups = $state(new SvelteSet<string>());
$effect(() => {
    if (someCondition) {
        expandedGroups.add(href);
        expandedGroups = new SvelteSet(expandedGroups); // reassign $state = loop
    }
});
```

### Fix

`SvelteSet` sudah reaktif sendiri — tidak perlu `$state()` wrapper. Hitung nilai awal
langsung di deklarasi:

```svelte
<!-- BENAR — SvelteSet sudah reaktif, initial value dihitung sekali -->
let expandedGroups = new SvelteSet<string>(
    nav
        .filter((item) => item.children?.some((c) => currentPath.startsWith(c.href)))
        .map((item) => item.href)
);
```

### Cara Diagnose

Jika element ada di DOM tapi click tidak menghasilkan perubahan UI apapun:

1. Tambahkan listener di test: `page.on('pageerror', e => console.error(e.message))`
2. Jalankan dengan `--headed`
3. Cek console untuk `effect_update_depth_exceeded`

---

## Temuan Kritis: Modal URL State vs SvelteKit Navigation

### Masalah

Test helper `openCreateModal()` navigasi ke `?modal=create` — modal tidak pernah muncul
setelah diclose, atau malah tidak pernah muncul sama sekali.

### Root Cause

URL-based modal state conflict dengan SvelteKit client navigation:

- `history.replaceState()` atau SvelteKit `replaceState()` dari `$app/navigation` —
  keduanya memicu SvelteKit's popstate handler → component remount → `modalMode` reset
- `$effect` membaca `window.location.search` untuk detect `?modal=create` — jika URL
  tidak di-strip dengan benar, modal re-opens setiap render cycle

### Fix di Source Code

```typescript
// JANGAN — replaceState memicu SvelteKit navigation
function closeModal() {
	modalMode = null;
	history.replaceState(null, '', '/dashboard/team'); // SALAH
}

// BENAR — hanya set state, biarkan URL tetap
function closeModal() {
	modalMode = null;
	// URL tetap ?modal=create — tidak apa-apa, _modalOpenedFromUrl sudah true
}
```

### Fix di Test

```typescript
// JANGAN — URL navigation ke ?modal=create memicu SvelteKit load cycle
async function openCreateModal(page: Page) {
	await page.goto('/dashboard/team?modal=create');
	await page.waitForLoadState('networkidle'); // SALAH
}

// BENAR — klik button langsung, hindari URL navigation
async function openCreateModal(page: Page) {
	await page.waitForLoadState('load');
	await page.getByRole('button', { name: /tambah staff/i }).click();
	await expect(page.locator('#create-name')).toBeVisible({ timeout: 5000 });
}
```

---

## Temuan Kritis: RLS Memblokir Semua Query `ainything_app`

### Masalah

Operasi DB berhasil (tidak throw error, success toast muncul), tapi data tidak tersimpan
atau tidak terbaca. Contoh: member list kosong `0 anggota aktif` padahal seed data ada.

### Root Cause

PostgreSQL RLS dengan role `ainything_app` membutuhkan GUC `app.user_external_id` diset
**sebelum** setiap query. Tanpa ini, semua policy yang menggunakan
`app.current_user_external_id()` akan return NULL → query diblokir (UPDATE silently returns
0 rows, SELECT returns empty result).

Ini berlaku untuk **semua** operasi: SELECT, INSERT, UPDATE, DELETE.

### Pola yang Benar

Semua repository function yang butuh user context harus:

1. Menerima `callerExternalId: string` sebagai parameter
2. Wrap query dalam `withUserContext(callerExternalId, async (client) => { ... })`

```typescript
// SALAH — RLS blokir, query return 0 rows tanpa error
export async function listMembershipsWithUsers(organizationId: string) {
	const pool = getPool();
	const { rows } = await pool.query(`SELECT ...`, [organizationId]);
	return rows;
}

// BENAR — set user context sebelum query
export async function listMembershipsWithUsers(organizationId: string, callerExternalId: string) {
	const { withUserContext } = await import('$lib/server/db/postgres');
	return withUserContext(callerExternalId, async (client) => {
		const { rows } = await client.query(`SELECT ...`, [organizationId]);
		return rows;
	});
}
```

### Daftar Policy yang Perlu `callerExternalId`

| Tabel         | Operasi        | Policy                    |
| ------------- | -------------- | ------------------------- |
| `memberships` | SELECT/INSERT/ | `has_organization_access` |
|               | UPDATE/DELETE  |                           |
| `app_users`   | SELECT         | `app.is_org_member(id)`   |
| `app_users`   | UPDATE         | `app.is_org_member(id)`   |
| `invites`     | SELECT/DELETE  | `has_organization_access` |

### UPDATE Policy `app_users` (Migration 0026)

Tanpa UPDATE policy pada `app_users`, `editStaffMember` akan:

- Return success (tidak throw)
- Toast "Data berhasil diperbarui" muncul
- Tapi nama di DB tidak berubah

Fix: tambah policy di migration:

```sql
CREATE POLICY app_users_org_update ON public.app_users
  FOR UPDATE
  USING (app.is_org_member(id))
  WITH CHECK (app.is_org_member(id));
```

### RLS Recursion (`app_users_org_select`)

Policy SELECT pada `app_users` yang query `memberships JOIN app_users` menyebabkan
infinite recursion. Gunakan SECURITY DEFINER function:

```sql
CREATE OR REPLACE FUNCTION app.is_org_member(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, app AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.memberships m1
    JOIN   public.memberships m2 ON m2.organization_id = m1.organization_id
    JOIN   public.app_users   u  ON u.id = m2.user_id
    WHERE  u.external_auth_id = app.current_user_external_id()
    AND    m1.user_id = target_user_id
  );
$$;
```

---

## Temuan: Preview Server Harus Fresh dengan `NODE_ENV=test`

### Masalah

Login selalu return false → semua test yang butuh auth langsung skip.

### Root Cause

Playwright `reuseExistingServer: true` memakai server yang sudah berjalan di port 4173
— tapi server itu mungkin distart tanpa `NODE_ENV=test`. Rate limiter aktif, memblokir
login berulang di test suite.

### Fix

Sebelum run test, pastikan tidak ada server lama yang berjalan:

```powershell
# Windows — kill proses node yang memakai port 4173
netstat -ano | findstr :4173
# Catat PID dari output, lalu:
taskkill /PID <PID> /F
```

Atau gunakan script:

```bash
pnpm build && pnpm test:e2e
```

Playwright akan start server baru dengan env yang benar dari `playwright.config.ts`.

---

## Temuan: `use:enhance` + `form` State + Modal State

### Masalah

Success toast tidak muncul setelah submit form, atau muncul sebentar lalu hilang.

### Root Cause

`closeModal()` yang memanggil `history.replaceState()` (atau SvelteKit `replaceState`)
memicu SvelteKit navigation → page invalidation → `form` prop di-reset ke `undefined`
sebelum toast sempat render.

### Fix

Pada callback `use:enhance`, jangan panggil `closeModal()` setelah `await update()`.
Cukup set `modalMode = null` langsung:

```typescript
// SALAH — closeModal() dengan replaceState membersihkan form state
use:enhance={() => {
    return async ({ update }) => {
        await update();
        closeModal(); // replaceState → form cleared → toast hilang
    };
}}

// BENAR — hanya set modalMode, biarkan toast render dari form state
use:enhance={() => {
    return async ({ update }) => {
        await update();
        if (!form?.errors) modalMode = null;
    };
}}
```

---

## Temuan: Strict Mode Violation — Multiple Elements Match

### Masalah

```
Error: strict mode violation, getByText(email) resolves to 2 elements
```

Terjadi saat test mencari text yang muncul di dua tempat — misalnya success toast DAN
member list card keduanya berisi email address yang sama.

### Fix

Scope locator ke elemen yang spesifik:

```typescript
// SALAH — match toast DAN list item
await page.getByText(throwawayEmail).toBeVisible();

// BENAR — scope ke elemen <p> di member list
await page.locator('p').filter({ hasText: throwawayEmail }).toBeVisible();

// BENAR — scope ke member row container
const memberRow = page.locator('div.flex.items-center').filter({
	has: page.locator('p').filter({ hasText: throwawayEmail })
});
```

---

## Cara Debug Test yang Gagal (Workflow Efisien)

### 1. Baca error context dulu

File `.md` di `tests/e2e/test-results/*/error-context.md` berisi:

- Error message + call stack
- ARIA snapshot saat kegagalan (state DOM yang sebenarnya)
- Baris test yang gagal

ARIA snapshot adalah sumber diagnosa paling cepat. Baca ini **sebelum** spekulasi.

### 2. Cek ARIA snapshot

```yaml
# Contoh: modal tidak muncul
- main:
    - button "Tambah Staff"
  # Tidak ada dialog → modal tidak terbuka
```

```yaml
# Contoh: data kosong padahal harusnya ada
- paragraph: 0 anggota aktif
# → RLS blocking SELECT
```

```yaml
# Contoh: data tidak berubah setelah edit
- status: Data anggota berhasil diperbarui.
- paragraph: Nama Lama # bukan nama baru
# → RLS blocking UPDATE (silent 0 rows)
```

### 3. Tambah debug log di source, build, run

```typescript
// Di +page.svelte — tambah sementara
function openCreate() {
	modalMode = 'create';
	console.log('[DEBUG] openCreate called, modalMode=', modalMode);
}
```

```typescript
// Di test — capture pageerror
page.on('pageerror', (e) => console.error('[PAGE ERROR]', e.message));
```

Rebuild: `pnpm build`, lalu run single test:

```bash
pnpm exec playwright test --grep "nama test" --reporter=line
```

### 4. Diagnose pola umum

| Gejala                                       | Root Cause                           | Fix                                          |
| -------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Click sukses, DOM tidak berubah              | `effect_update_depth_exceeded`       | Cek `$effect` yang mutate `$state`           |
| Button visible, modal tidak muncul           | SvelteKit navigation interference    | Jangan pakai URL navigation untuk buka modal |
| Query return empty, padahal ada data         | RLS blocking (no user context)       | Tambah `withUserContext(callerExternalId)`   |
| UPDATE sukses (no error), data tidak berubah | Missing UPDATE RLS policy            | Tambah migration untuk policy UPDATE         |
| Login return false → semua skip              | Preview server tanpa `NODE_ENV=test` | Kill proses node di port 4173, rebuild       |
| `strict mode violation`                      | Locator match 2+ elements            | Scope locator lebih spesifik                 |

---

## Checklist Sebelum Commit E2E Test Baru

- [ ] Gunakan `waitForLoadState('load')` sebelum klik button yang bergantung pada JS hydration
- [ ] Jangan navigasi ke `?modal=param` untuk buka modal — klik button langsung
- [ ] Gunakan regex OR (`/id text|en text/i`) untuk semua label/button text yang bisa i18n
- [ ] Jangan gunakan `getByLabel(/password/i)` — pakai `#password` selector
- [ ] Pastikan test tidak bergantung pada state dari test lain
- [ ] Scope locator ke elemen spesifik — hindari strict mode violation
- [ ] Untuk test dashboard yang butuh login: gunakan helper `goToTeamPage` / `loginAsOwner` pattern
- [ ] Setelah build: kill server lama di port 4173 sebelum `pnpm test:e2e`
- [ ] Jalankan `pnpm build && pnpm test:e2e --grep "nama-spec"` sebelum commit
- [ ] Jika test butuh DB write: pastikan repository function pakai `withUserContext(callerExternalId)`
