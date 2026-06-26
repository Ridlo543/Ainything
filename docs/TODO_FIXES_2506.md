# Bug Fix Plan — ainything Security & Correctness Audit (2506)

Generated from audit session 25 Juni 2026. All items verified from source code.

Legend: `[ ]` todo, `[/]` in progress, `[x]` done, `[!]` blocked

---

## How To Use This File

Work top to bottom within each severity level. Do not skip to lower severity while CRITICAL items remain open.

Every fix must:
1. Pass `pnpm check` (TypeScript)
2. Pass `pnpm run lint`
3. Pass relevant `pnpm test` (unit + affected DB tests)
4. Not break existing 309 passing tests

---

## CRITICAL — Fix Before Any Production Traffic

These bugs can cause data leakage, privilege escalation, or price manipulation. Must be fixed before any real user accesses the system.

### [x][C-1] DB: Duplicate `app_users` SELECT policies after migration 0010

**File:** `db/migrations/0010_platform_admin_role_bridge.sql:46`
**Problem:** Two SELECT policies on `app_users` are both active after 0010:
- `app_users_platform_admin_select` (from 0010)
- `app_users_self_or_platform_select` (older)

Migration 0020 does not DROP the old one. Having two permissive policies means PostgreSQL evaluates both — the more permissive one wins. Creates unintended access surface.

**Fix:** In a new migration (0021), explicitly DROP the old policy:
```sql
DROP POLICY IF EXISTS app_users_self_or_platform_select ON app_users;
DROP POLICY IF EXISTS app_users_platform_admin_select ON app_users;
-- Then re-create the single correct v2 policy
CREATE POLICY app_users_self_or_platform_select_v2 ON app_users
  FOR SELECT TO ainything_app
  USING (
    external_auth_id = app.current_user_external_id()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = app_users.id
        AND app.has_organization_access(m.organization_id)
    )
  );
```

**Verify:** `pnpm db:reset && pnpm test`

---

### [x][C-2] DB: `app_users_self_insert` with `WITH CHECK (true)` — impersonation risk

**File:** `db/migrations/0015_security_fixes.sql:202`
**Problem:** The insert policy uses `WITH CHECK (true)` meaning any authenticated user can insert an `app_users` row with any `external_auth_id`, including one belonging to another user.

**Fix:** Change the `WITH CHECK` to enforce the calling user's own identity:
```sql
DROP POLICY IF EXISTS app_users_self_insert ON app_users;
CREATE POLICY app_users_self_insert_v2 ON app_users
  FOR INSERT TO ainything_app
  WITH CHECK (external_auth_id = app.current_user_external_id());
```

Add this to migration 0021.

**Verify:** Unit test: attempt insert with mismatched `external_auth_id` → must fail RLS.

---

### [x][C-3] App: `staff-repository.ts` — `getRestaurantSettings` missing `organization_id` scope

**File:** `src/lib/server/repositories/staff-repository.ts:162`
**Problem:** Query is `WHERE id = $1` only. Any tenant knowing a restaurant UUID can read another tenant's settings.

**Fix:**
```typescript
// Before
WHERE id = $1

// After — add organization_id from the authenticated user's membership
WHERE id = $1 AND organization_id = $2
// Pass organizationId as second parameter, taken from event.locals.user.memberships
```

**Verify:** Add unit test: call with correct restaurant_id + wrong org_id → must return null/throw.

---

### [x][C-4] App: `staff-repository.ts` — `deleteMembership`, `deleteInvite`, `updateMembershipRole` missing `organization_id` guard

**File:** `src/lib/server/repositories/staff-repository.ts:108-140`
**Problem:** All three mutations use only `id` or `user_id` without scoping to the caller's organization. An org_owner can delete memberships belonging to another org.

**Fix:** Add `AND organization_id = $N` to all three queries:
```typescript
// deleteMembership
DELETE FROM memberships WHERE id = $1 AND organization_id = $2

// deleteInvite
DELETE FROM invites WHERE id = $1 AND organization_id = $2

// updateMembershipRole
UPDATE memberships SET role = $1 WHERE id = $2 AND organization_id = $3
```

**Verify:** Unit tests for each mutation with cross-org ids → must return 0 rows affected.

---

### [x][C-5] App: Cart/Order endpoint — price taken from client body (price manipulation)

**File:** Cart/order `+server.ts` or form action (exact path TBD — search `price` in `src/routes/`)
**Problem:** Order item prices are read from the request body. Any buyer can submit an order with `price: 0` or `price: 1`.

**Fix:** Never trust client-supplied prices. Always fetch from DB:
```typescript
// After resolving cart items from request body (product_id + quantity only),
// load canonical prices from the DB:
const items = await menuRepository.getItemsByIds(productIds, restaurantId);
const orderItems = cartItems.map(ci => ({
  ...ci,
  price: items.find(i => i.id === ci.productId)!.price // server-authoritative
}));
```

**Verify:** Integration test: submit order with tampered price → stored price must match DB price.

---

### [x][C-6] App: `chat-repository.ts` — cross-tenant session injection

**File:** `src/lib/server/repositories/chat-repository.ts` (session create path)
**Problem:** `sessionId` supplied by client is not verified to belong to the resolved restaurant. A guest from Restaurant A can pass a session_id belonging to Restaurant B.

**Fix:** When creating or using a session, always validate that `customer_sessions.restaurant_id = resolvedRestaurantId`:
```typescript
// Before using a sessionId from client:
const session = await db.query(
  `SELECT * FROM customer_sessions WHERE id = $1 AND restaurant_id = $2`,
  [sessionId, resolvedRestaurantId]
);
if (!session.rows[0]) throw new Error('Invalid session for this outlet');
```

**Verify:** Test: use session from Restaurant A in Restaurant B endpoint → must be rejected.

---

## HIGH — Fix Before Pilot Launch

These bugs are exploitable but require authenticated access or specific conditions.

### [H-1] App: `/api/internal/metrics` — no role check

**File:** API route for `/api/internal/metrics` (search `metrics` in `src/routes/api/`)
**Problem:** Handler checks user exists but does not check role. Any authenticated user (including `staff`) can see metrics for all tenants.

**Fix:** Add explicit role guard:
```typescript
if (!['super_admin', 'org_owner', 'restaurant_admin'].includes(user.role)) {
  return json({ error: 'Forbidden' }, { status: 403 });
}
// Additionally scope by the user's restaurant_id unless super_admin
```

---

### [H-2] App: `chat-repository.ts:117` — `getRecentHistory` cross-tenant bleed

**File:** `src/lib/server/repositories/chat-repository.ts:117`
**Problem:** `getRecentHistory` does not filter by `restaurant_id` or `organization_id`. LLM context window may contain messages from other tenants.

**Fix:**
```typescript
// Add restaurant_id filter:
WHERE session_id = $1 AND restaurant_id = $2
ORDER BY created_at DESC LIMIT $3
```

---

### [H-3] App/DB: `metrics-repository.ts` — no `organization_id` scope

**File:** `src/lib/server/repositories/metrics-repository.ts`
**Problem:** All queries scope by `restaurant_id` only. A `restaurant_admin` who knows another restaurant's UUID could potentially access its metrics.

**Fix:** Add `organization_id` to all metric queries and validate it matches the caller's membership.

---

### [x][H-4] DB: `customer_sessions` UPDATE policy too permissive

**File:** `db/migrations/0002_public_menu_and_guest_write_policies.sql`
**Problem:** UPDATE policy uses `USING (true)` — any public session can update any customer session row.

**Fix:** In migration 0021, tighten to `USING (id = app.current_public_session_id())`:
```sql
DROP POLICY IF EXISTS customer_sessions_public_update ON customer_sessions;
CREATE POLICY customer_sessions_public_update_v2 ON customer_sessions
  FOR UPDATE TO ainything_app
  USING (id = app.current_public_session_id());
```

---

### [H-5] DB: `invites` table created without RLS (window between 0012 and 0015)

**File:** `db/migrations/0012_staff_invites.sql`
**Problem:** `invites` was created without `ENABLE ROW LEVEL SECURITY` in 0012. RLS was only added in 0015. On a fresh migration run this is now fine, but the policy history is dirty.

**Fix:** Verify current state with `\d invites` — confirm RLS is enabled and correct policies exist. Document in migration 0021 comments.

---

## MEDIUM — Fix Before First Public Beta

### [M-1] App: `getRecentHistory` bypasses RLS context

**File:** `src/lib/server/repositories/chat-repository.ts`
**Problem:** Calls bare `query()` instead of `withPublicSessionContext()`. RLS `app.public_session_id` is not set, so the RLS policy for public sessions is not enforced.

**Fix:** Wrap in `withPublicSessionContext(sessionId, async (client) => { ... })`.

---

### [M-2] Public bootstrap response leaks `menu_scan_url` and internal fields

**File:** Public bootstrap/tenant-resolution API (search `menu_scan_url` in `src/routes/api/public/`)
**Problem:** Internal analytics fields and `menu_scan_url` (used for admin QR generation) are exposed to the public buyer API response.

**Fix:** Explicitly allowlist fields returned in the public bootstrap response. Never use `SELECT *` for public endpoints.

---

### [M-3] Mock auth provider ignores password without warning

**File:** `src/lib/server/auth/mock-session.ts` or similar
**Problem:** In mock mode, any password is accepted. No warning is logged. Easy to accidentally deploy mock mode to staging.

**Fix:** Add a startup log warning: `[WARN] Mock auth provider is active — all passwords accepted. DO NOT use in production.`
Also add `NODE_ENV=production` guard: if `AUTH_PROVIDER=mock` and `NODE_ENV=production`, throw an error on startup.

---

### [M-4] `/register/setup` missing from protected route list

**File:** `hooks.server.ts` or route guard
**Problem:** `/register/setup` is not in the public route allowlist, but also not in the protected route guard. Behavior is undefined.

**Fix:** Explicitly classify all `/register/*` routes as public (no auth required) in the route guard.

---

### [M-5] `hostValidated` calculated but not enforced server-side

**File:** Tenant resolution middleware (search `hostValidated` in `src/lib/server/tenant/`)
**Problem:** The flag is computed but not used to block requests from unvalidated hosts.

**Fix:** If `hostValidated === false`, return 403 or redirect to an error page. Do not silently serve data for unresolvable hosts.

---

### [M-6] `web_vitals` table has no `organization_id`

**File:** `db/migrations/0013_web_vitals.sql`
**Problem:** `web_vitals` stores performance data per restaurant but not per organization. Cannot do org-level analytics or billing-tier rate limiting on vitals ingestion.

**Fix:** Add `organization_id uuid REFERENCES organizations(id)` in migration 0021. Populate from the restaurant lookup at ingestion time.

---

## LOW — Fix Before V1.0

### [L-1] Hardcoded passwords in migration files

**Files:** `db/migrations/0001_core_multi_tenant_schema.sql`, `0018b_create_ainything_app_role.sql`
**Problem:** `lingua_app`/`ainything_app` role passwords are hardcoded in SQL. Not a production risk (migrations run as superuser, role passwords are rotated), but a code hygiene issue.
**Fix:** Use `ALTER ROLE ainything_app WITH PASSWORD :'ainything_app_password'` and pass via `PGSSLMODE` or env. Document in `docs/deployment/DEPLOY.md`.

---

### [L-2] Rate limiter fails open when Redis is down

**File:** `src/lib/server/services/rate-limiter.ts`
**Problem:** If Redis is unavailable, the rate limiter skips enforcement (fail-open). This could allow abuse during Redis outages.
**Fix:** Add a config flag `RATE_LIMITER_FAIL_OPEN=false` (default false). When fail-closed, return 503 if Redis is unavailable. Log the failure.

---

### [L-3] `X-Forwarded-For` spoofable in rate limiter

**File:** `src/lib/server/services/rate-limiter.ts`
**Problem:** Rate limiter uses `X-Forwarded-For` for IP-based limits. This header can be spoofed by clients.
**Fix:** Only trust `X-Forwarded-For` from known proxy IPs. Use `CF-Connecting-IP` (Cloudflare) or `X-Real-IP` (nginx) and validate the proxy chain.

---

### [L-4] `tableCode` in mock path without sanitization

**File:** Mock/test path (search `tableCode` in `src/`)
**Problem:** `tableCode` from URL params is used without sanitization in a mock code path.
**Fix:** Add Zod validation: `z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/)` for all table codes from URL params.

---

### [L-5] `analytics-repository.ts` missing `organization_id` scope

**File:** `src/lib/server/repositories/analytics-repository.ts`
**Problem:** Analytics queries scope by `restaurant_id` only. Same vector as H-3.
**Fix:** Add `organization_id` to all analytics queries.

---

## Migration 0021 — Consolidate Security Fixes

Create `db/migrations/0021_security_fixes_v2.sql` to address all DB-level findings above:

```
0021_security_fixes_v2.sql tasks:
- [ ] DROP duplicate app_users SELECT policies (C-1)
- [ ] Fix app_users_self_insert WITH CHECK (C-2)
- [ ] Tighten customer_sessions UPDATE policy (H-4)
- [ ] Confirm invites RLS is correct (H-5)
- [ ] Add organization_id to web_vitals (M-6)
```

---

## Fix Order (recommended sequence)

```
Sprint 1 (security-critical, 1-2 days):
  C-5 price manipulation → C-6 session injection → C-3/C-4 tenant isolation in staff repo

Sprint 2 (DB fixes, 1 day):
  Write migration 0021 → covers C-1, C-2, H-4, H-5, M-6

Sprint 3 (auth/access, 1 day):
  H-1 metrics role check → H-2 chat history scope → M-3 mock auth warning → M-4 register route guard

Sprint 4 (cleanup, 1 day):
  M-1 chat RLS context → M-2 bootstrap response → M-5 host validation → H-3/L-5 analytics scope

Sprint 5 (hardening, 1 day):
  L-1 hardcoded passwords → L-2 rate limiter fail-closed → L-3 forwarded-for → L-4 tableCode sanitize
```

---

## Verification Checklist (after all fixes)

- [ ] `pnpm check` — 0 errors
- [ ] `pnpm run lint` — 0 errors
- [ ] `pnpm test` — 309+ tests pass
- [ ] `pnpm db:reset` — all migrations + seed apply cleanly
- [ ] Manual: attempt cross-tenant restaurant settings read → rejected
- [ ] Manual: submit order with tampered price → stored price matches DB
- [ ] Manual: use session from wrong outlet → rejected
- [ ] Manual: call metrics API as `staff` role → 403
