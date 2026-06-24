# E2E Test Infrastructure

## Known Issues

### Test Isolation (High Priority)

**Status:** ⚠️ Tests share database state, causing flaky failures

**Symptoms:**

- RLS violations when running multiple tests
- WebServer crashes mid-suite (connection refused errors)
- Inconsistent pass rates: 11-14 tests pass depending on run
- Individual tests sometimes pass, sometimes fail

**Root Cause:**
Tests create customer sessions and other database records that persist between tests. When multiple tests run in sequence, they can:

1. Conflict on shared resources (e.g., session IDs)
2. Trigger RLS policy violations due to state pollution
3. Cause webServer crashes from unhandled RLS errors

**Technical Details:**

- Playwright webServer runs for entire test suite (not per-test)
- All tests share same database instance
- No transaction rollback between tests
- Session creation can fail if database state is corrupted by previous test

**Workarounds:**

1. **Run tests individually:** `pnpm exec playwright test <file> -g "<test name>"`
2. **Reset database before test runs:** `pnpm db:reset && pnpm test:e2e`
3. **Accept flaky results:** ~60-70% tests pass consistently

**Proper Solution (TODO):**

**Option A: Database Reset Between Tests (Simple, Slow)**

```typescript
// tests/e2e/setup.ts
import { test as base } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const test = base.extend({
	// Reset database before each test
	page: async ({ page }, use) => {
		await execAsync('pnpm db:reset');
		await use(page);
	}
});
```

**Option B: Test-Specific Data (Better, More Work)**

```typescript
// Use unique identifiers per test to avoid conflicts
const TEST_ID = `test_${Date.now()}_${Math.random()}`;
const TEST_SESSION_ID = `session_${TEST_ID}`;
```

**Option C: Proper Cleanup (Best, Most Complex)**

```typescript
// Clean up test data after each test
test.afterEach(async ({ page }) => {
	// Delete sessions created during test
	await page.request.delete('/api/test/cleanup');
});
```

**Recommended:** Option A initially (simple, reliable), then migrate to Option B (scalable).

---

## Running Tests

### Full Suite (Flaky)

```bash
pnpm test:e2e
# Expected: 11-14 tests pass, some RLS violations
```

### Individual Test (More Reliable)

```bash
pnpm exec playwright test customer-flow.spec.ts -g "preference chips"
# More reliable, but slower overall
```

### With Fresh Database (Recommended)

```bash
pnpm db:reset && pnpm test:e2e
# Ensures clean state
```

---

## Test Categories

### ✅ Stable Tests (Usually Pass)

- "renders restaurant hero and session bootstrap"
- "language selector shows options"
- "preference chips toggle correctly"
- "menu browse renders categories"
- "menu item card shows spice, price, and badges"

### ⚠️ Flaky Tests (Test Isolation Issues)

- "feedback buttons render and respond"
- "staff fallback request flow"
- "menu category tabs scroll"
- "feedback sent confirmation persists"

### 🔴 Known Failures (Data Issues)

- "renders restaurant hero with RTL text direction" (pantai-padi 404)
- "chat panel renders correctly in RTL viewport" (pantai-padi 404)

---

## Contributing

When adding new E2E tests:

1. **Assume shared state:** Don't rely on specific database state
2. **Use TEST_URL constant:** Points to uma-karang/T07 (stable test restaurant)
3. **Avoid state mutations:** Tests should be read-only when possible
4. **Document flaky tests:** Add comments explaining known issues
5. **Test individually first:** Verify test works in isolation before adding to suite

---

## Using Test Isolation Fixtures

**New:** `tests/e2e/fixtures.ts` provides database isolation support.

### Basic Usage

```typescript
// Import from fixtures instead of @playwright/test
import { test, expect } from './fixtures';

test('my isolated test', async ({ page, cleanDatabase }) => {
	// cleanDatabase fixture automatically resets DB before this test
	await page.goto('/r/uma-karang/table/T07');
	// Test runs with fresh database state
});
```

### When to Use `cleanDatabase` Fixture

**Use for:**

- Tests that create persistent data (sessions, feedback, etc.)
- Tests that modify restaurant/table state
- Tests that need guaranteed clean state

**Don't use for:**

- Read-only tests (menu browsing, language selector)
- Tests that already run reliably
- Every test (it's slow - 10-15 seconds overhead)

### Performance Trade-off

- **With isolation:** Slower but reliable (no RLS violations)
- **Without isolation:** Faster but flaky (test order matters)

**Recommendation:** Start without `cleanDatabase`, add it only to tests that fail due to state pollution.

---

## Future Improvements

- [x] Implement test fixtures with database reset capability
- [ ] Add transaction-based test isolation (more performant)
- [ ] Create test data factories for unique identifiers
- [ ] Add retry logic for flaky tests
- [ ] Add webServer health checks between tests
