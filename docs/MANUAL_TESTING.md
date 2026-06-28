# Manual Testing Guide

## Test Results (terbaru)

| Check        | Result                                        |
| ------------ | --------------------------------------------- |
| `db:migrate` | 28/28 migrations applied (0001–0028)          |
| `db:seed`    | Demo data seeded                              |
| `pnpm check` | 0 errors, 0 warnings                          |
| `pnpm lint`  | 0 errors                                      |
| `pnpm test`  | 380 passed, 0 failed, 21 skipped (LLM integ.) |

### Skipped Tests

- **21 tests**: LLM integration tests — `llm-eval.test.ts` (15) dan `openai-compatible-provider.integration.test.ts` (6). Memerlukan API key live. Sengaja di-skip di unit test run.
- Bukan platform-admin test. `super_admin` login tersedia via database update (lihat di bawah).

---

## Auth Modes

### Mode 1: Credentials Auth (Self-Hosted, Default)

Set di `.env`: `AUTH_PROVIDER=credentials`

Login di `/login` dengan email & password yang didaftarkan via `/register`.
Database menyimpan password sebagai bcrypt hash di `app_users.password_hash`.

### Mode 2: Mock Auth (Legacy Dev)

Set di `.env`: `AUTH_PROVIDER=mock` (alias for `credentials` in auth-factory)

Login di `/login` dengan:

| Email                            | Password apa saja | Role        | Dashboard      |
| -------------------------------- | ----------------- | ----------- | -------------- |
| `owner@bali-table.test`          | bebas             | `org_owner` | `/dashboard`   |
| `staff@jakarta-hospitality.test` | bebas             | `staff`     | `/staff/inbox` |

Tidak perlu verifikasi email. Tidak perlu koneksi eksternal.

**Note**: Mock auth tidak memiliki user `super_admin`. Untuk test platform admin, gunakan `credentials` auth dan update role secara manual (lihat di bawah).

### Mode 2: Credentials Auth (Staging/Production)

Set di `.env`: `AUTH_PROVIDER=credentials`

1. Register di `/register/restaurant` dengan email
2. Cek email untuk verification link (atau bypass jika SMTP tidak dikonfigurasi)
3. Klik verification link → diarahkan ke dashboard sesuai role

Untuk mendapatkan role `super_admin`, update langsung di DB:

```sql
-- Jalankan via psql atau database client lokal:
UPDATE app_users SET platform_role = 'super_admin'
WHERE email = 'your@email.com';
```

---

## Routes to Test

### Public QR Experience (No Login)

| URL                             | Description           |
| ------------------------------- | --------------------- |
| `/r/uma-karang/table/T01`       | Bali restaurant menu  |
| `/r/warung-nusantara/table/T01` | Bali restaurant #2    |
| `/r/sakura-izakaya/table/T01`   | Jakarta restaurant    |
| `/r/kedai-jakarta/table/T01`    | Jakarta restaurant #2 |

Test:

- Language switcher (EN, ID, ZH, JA)
- Dietary preference filters (halal, vegetarian, dll.)
- Cart flow: tambah item → checkout
- AI chat: tanya tentang menu item
- Fallback: request bantuan staff

### Owner Dashboard (`/dashboard`)

Login sebagai `owner@bali-table.test`:

- Overview: stats cards, recent orders, quick actions
- Catalog: tambah/edit/hapus produk, upload foto
- Categories: tambah/edit/hapus kategori
- Orders: filter tabs (Aktif/Selesai/Semua), detail panel
- Team: invite staff, ubah role
- Analytics: range selector, bar chart
- Settings: edit business info, QR preview

### Staff Inbox (`/staff/inbox`)

Login sebagai `staff@jakarta-hospitality.test`:

- Antrian pesanan: cards dengan status badges
- Filter tabs: Aktif / Selesai / Semua
- Tap order card → detail di `/staff/orders/[id]`
- One-tap status transitions (Proses → Siap → Selesai)
- 15s polling untuk order baru
- Chat window dengan buyer (fitur 4.4)

### Platform Admin (`/platform`)

Login dengan user `super_admin`:

- Overview: KPI sistem
- Organizations: tabel + detail
- Restaurants: tabel + detail
- API Keys: generate, copy, revoke (fitur 5.3)

---

## Demo Data

### Organizations

| Organization            | Slug                      | Segment    |
| ----------------------- | ------------------------- | ---------- |
| Bali Table Collective   | `bali-table`              | restaurant |
| Jakarta Hospitality Lab | `jakarta-hospitality-lab` | restaurant |

### Restaurants

| Restaurant       | Slug               | Organization            | Segment  |
| ---------------- | ------------------ | ----------------------- | -------- |
| Uma Karang       | `uma-karang`       | Bali Table Collective   | fine     |
| Warung Nusantara | `warung-nusantara` | Bali Table Collective   | warung   |
| Sakura Izakaya   | `sakura-izakaya`   | Jakarta Hospitality Lab | japanese |
| Kedai Jakarta    | `kedai-jakarta`    | Jakarta Hospitality Lab | local    |

### Tables per Restaurant

Setiap restaurant memiliki tabel T01–T12 dengan QR code unik.

---

## Environment Setup

| Variable        | Dev Default (`.env.development`)        |
| --------------- | --------------------------------------- |
| `AUTH_PROVIDER` | `mock`                                  |
| `DATABASE_URL`  | `postgresql://localhost:5432/ainything` |
| `REDIS_URL`     | `redis://localhost:6379`                |

Untuk menjalankan lokal:

```bash
pnpm infra:up     # Start PostgreSQL + Redis via Podman/Docker
pnpm db:reset     # Apply migrations + seed
pnpm dev          # Start dev server
```
