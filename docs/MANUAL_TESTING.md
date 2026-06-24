# Manual Testing Guide

## Test Results

| Check        | Result                                          |
| ------------ | ----------------------------------------------- |
| `db:migrate` | 11/11 migrations applied to Supabase            |
| `db:seed`    | Demo data seeded                                |
| `pnpm check` | 0 errors, 4 warnings (pre-existing)             |
| `pnpm lint`  | 0 errors                                        |
| `pnpm test`  | 256 passed, 8 failed (pre-existing), 28 skipped |

### Pre-existing Test Failures (not caused by recent changes)

- **6 tests**: Redis not running (ECONNREFUSED 127.0.0.1:6379) — fallback/chat SSE tests timeout
- **2 tests**: RLS policy differences on Supabase vs local Postgres
- To fix: start Redis (`docker compose up redis`) and re-run

---

## Auth Modes

### Mode 1: Mock Auth (Local Dev, Default)

Set in `.env`: `AUTH_PROVIDER=mock`

Login at `/login` with:

| Email                            | Any Password | Role        | Dashboard      |
| -------------------------------- | ------------ | ----------- | -------------- |
| `owner@bali-table.test`          | works        | `org_owner` | `/dashboard`   |
| `staff@jakarta-hospitality.test` | works        | `staff`     | `/staff/inbox` |

No email verification needed. No Supabase required.

**Note**: Mock auth has no `super_admin` user. To test platform admin, use Supabase auth.

### Mode 2: Supabase Auth (Staging/Production)

Set in `.env`: `AUTH_PROVIDER=supabase`

1. Register at `/register/restaurant` with your email
2. Check email for verification link
3. Click verification link → redirected to role-based dashboard
4. To get `super_admin` role: manually update `app_users.platform_role = 'super_admin'` in Supabase SQL Editor for your user

```sql
-- Run in Supabase SQL Editor:
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
- Dietary preference filters (halal, vegetarian, etc.)
- Menu category browsing and item detail
- Chat: ask about ingredients, allergens, halal status
- Fallback to staff request
- Feedback submission

### Restaurant Admin Dashboard

Login as `owner@bali-table.test` (mock) or register via Supabase.

| URL                    | Description              |
| ---------------------- | ------------------------ |
| `/dashboard`           | Restaurant overview      |
| `/dashboard/menu`      | Menu editor (CRUD items) |
| `/dashboard/tables`    | QR table manager         |
| `/dashboard/knowledge` | Knowledge base editor    |
| `/dashboard/analytics` | Usage analytics          |
| `/dashboard/staff`     | Staff management         |
| `/dashboard/settings`  | Restaurant settings      |

### Staff Inbox

Login as `staff@jakarta-hospitality.test` (mock).

| URL            | Description           |
| -------------- | --------------------- |
| `/staff/inbox` | Fallback request list |

Test:

- View incoming fallback requests
- Claim and resolve requests
- Real-time SSE updates (requires Redis)

### Platform Admin (Super Admin Only)

Requires `AUTH_PROVIDER=supabase` + `platform_role = 'super_admin'`.

| URL                       | Description                    |
| ------------------------- | ------------------------------ |
| `/platform`               | System-wide KPIs               |
| `/platform/organizations` | All organizations + pagination |
| `/platform/restaurants`   | All restaurants + org filter   |

Test:

- Organization list shows name, slug, plan, status, restaurant count, user count, created date
- Restaurant list shows name, slug, segment, organization, status, tables
- Pagination prev/next works correctly
- Filter restaurants by organization using `?org=<uuid>`
- Error page shows when DB is unreachable

---

## Registration Flow

| URL                      | Description                   |
| ------------------------ | ----------------------------- |
| `/register`              | Pathway chooser               |
| `/register/restaurant`   | Restaurant-first registration |
| `/register/organization` | Coming soon placeholder       |
| `/auth/callback`         | Email verification callback   |
| `/register/confirm`      | Check your email page         |

---

## Demo Seed Data

### Organizations

| Name                    | Slug                      | Plan  |
| ----------------------- | ------------------------- | ----- |
| Bali Table Group        | `bali-table-group`        | pro   |
| Jakarta Hospitality Lab | `jakarta-hospitality-lab` | pilot |

### Restaurants

| Name             | Slug               | Organization            | Segment       |
| ---------------- | ------------------ | ----------------------- | ------------- |
| Uma Karang       | `uma-karang`       | Bali Table Group        | casual-dining |
| Warung Nusantara | `warung-nusantara` | Bali Table Group        | warung        |
| Sakura Izakaya   | `sakura-izakaya`   | Jakarta Hospitality Lab | japanese      |
| Kedai Jakarta    | `kedai-jakarta`    | Jakarta Hospitality Lab | local         |

### Tables per Restaurant

Each restaurant has tables T01-T12 with unique QR codes.

---

## Environment Setup Summary

| Variable        | Current Value                                        |
| --------------- | ---------------------------------------------------- |
| `AUTH_PROVIDER` | `supabase`                                           |
| `SUPABASE_URL`  | `https://yljtcppbdwvjyziqyymv.supabase.co`           |
| `DATABASE_URL`  | Transaction pooler (aws-1-ap-northeast-2, port 6543) |
| `RUN_DB_TESTS`  | `true`                                               |

To switch back to local mock dev:

1. Comment out `AUTH_PROVIDER=supabase` in `.env`
2. Uncomment `AUTH_PROVIDER=mock`
3. Uncomment local `DATABASE_URL` and `DIRECT_URL`
