// Run with: node scripts/gen-hash.cjs (from project root)
// Generates bcrypt hashes for 'demo1234' and writes them directly to the seed file
// This avoids PowerShell $-interpolation issues when passing hashes via shell strings

const b = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const password = 'demo1234';

const h1 = b.hashSync(password, 12);
const h2 = b.hashSync(password, 12);

// Verify immediately
const ok1 = b.compareSync(password, h1);
const ok2 = b.compareSync(password, h2);

if (!ok1 || !ok2) {
  console.error('HASH VERIFICATION FAILED!');
  console.error('H1:', h1, 'ok:', ok1);
  console.error('H2:', h2, 'ok:', ok2);
  process.exit(1);
}

console.log('H1 (owner):', h1, '-> verify:', ok1);
console.log('H2 (staff):', h2, '-> verify:', ok2);

// Read and patch the seed file directly — no shell interpolation
const seedPath = path.join(__dirname, '..', 'db', 'seeds', '0001_demo_multi_tenant_data.sql');
let sql = fs.readFileSync(seedPath, 'utf8');

// Replace owner hash (id = '20000000-0000-0000-0000-000000000001')
// Use a function replacement to avoid $ being interpreted as capture group reference
sql = sql.replace(
  /UPDATE app_users SET password_hash = '[^']+'\s*\n(WHERE id = '20000000-0000-0000-0000-000000000001')/,
  (_, whereClause) => `UPDATE app_users SET password_hash = '${h1}'\n${whereClause}`
);

// Replace staff hash (id = '20000000-0000-0000-0000-000000000002')
sql = sql.replace(
  /UPDATE app_users SET password_hash = '[^']+'\s*\n(WHERE id = '20000000-0000-0000-0000-000000000002')/,
  (_, whereClause) => `UPDATE app_users SET password_hash = '${h2}'\n${whereClause}`
);

fs.writeFileSync(seedPath, sql, 'utf8');
console.log('Seed file updated successfully.');
