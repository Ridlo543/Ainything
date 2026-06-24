# Production Deployment Checklist

This document covers the steps to deploy Lingua to production.
Complete every section before going live with pilot restaurants.

---

## Prerequisites

- [ ] Domain purchased and DNS managed (e.g. Cloudflare)
- [ ] Supabase project created (free tier is sufficient for pilot)
- [ ] Container registry access (GHCR, Docker Hub, or self-hosted)
- [ ] Podman or Docker installed on the server
- [ ] Node 22+ and pnpm 10+ on CI runner (or use the container image)
- [ ] Redis 7+ instance (Upstash free tier or self-hosted)

---

## Step 1 — DNS Setup

```
# Root domain
A   lingua.example.com   → server IP

# Wildcard subdomain for multi-tenant workspace hosts
# Each restaurant gets  <slug>.lingua.example.com
A   *.lingua.example.com → server IP

# Optional: naked domain redirect
A   example.com          → server IP
```

**Cloudflare:** Enable proxy (orange cloud) on both records for DDoS protection.
Set SSL/TLS to "Full (strict)" once the origin certificate is in place.

---

## Step 2 — Supabase Project

1. Create a new project at <https://supabase.com>.
2. Go to **Settings → Database → Connection string** and copy:
   - `DATABASE_URL` — use the **pooled** (port 6543) connection string, replace `[YOUR-PASSWORD]`.
   - `DIRECT_URL` — use the **direct** (port 5432) string for migrations.
3. Go to **Settings → API** and copy:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (**secret, never expose to browser**)
4. Go to **Authentication → URL Configuration** and set:
   - Site URL: `https://lingua.example.com`
   - Redirect URLs: `https://lingua.example.com/auth/callback`
5. Enable **Email** provider under Authentication → Providers.
   Optionally configure custom SMTP (Settings → Auth → SMTP) to send from your domain.

---

## Step 3 — Run Migrations

```bash
# Against Supabase DIRECT_URL (bypasses pgBouncer)
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  pnpm db:migrate

# Seed demo data (optional — remove for clean production start)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  node scripts/db.mjs seed
```

All 15 migrations (0001–0015) should show as applied.

---

## Step 4 — Build and Push Container

```bash
# Build
podman build -t ghcr.io/yourorg/lingua-app:latest -f Containerfile .

# Test locally
podman run --rm -p 3000:3000 --env-file .env.production lingua-app

# Push
podman push ghcr.io/yourorg/lingua-app:latest
```

Or use the **GitHub Actions CI** workflow (`.github/workflows/ci.yml`) which
builds and tests automatically on every push to `main`.

---

## Step 5 — Environment Variables

Create `.env.production.local` on the server (never commit this file):

```bash
cp .env.production .env.production.local
# Then fill in all CHANGE_ME values
```

See `.env.production` for the full template. Key values to set:

| Variable                          | Where to get it                                                               |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `PUBLIC_APP_URL`                  | Your domain, e.g. `https://lingua.example.com`                                |
| `ORIGIN`                          | Same as `PUBLIC_APP_URL` (required for SvelteKit CSRF)                        |
| `DATABASE_URL`                    | Supabase pooled connection string                                             |
| `DIRECT_URL`                      | Supabase direct connection string                                             |
| `REDIS_URL`                       | Upstash or self-hosted Redis URL                                              |
| `SESSION_SECRET`                  | `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"` |
| `PUBLIC_SUPABASE_URL`             | Supabase project URL                                                          |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key                                                             |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service role key (secret)                                            |
| `AUTH_PROVIDER`                   | `supabase`                                                                    |
| `LLM_PROVIDER`                    | `tokenrouter` or `openai`                                                     |
| `TOKENROUTER_API_KEY`             | From tokenrouter.com                                                          |
| `SMTP_HOST`                       | Your SMTP host (or leave blank to use MockEmailProvider)                      |
| `SMTP_PORT`                       | Usually `587` (STARTTLS) or `465` (SSL)                                       |
| `SMTP_USER`                       | SMTP username                                                                 |
| `SMTP_PASS`                       | SMTP password                                                                 |
| `SMTP_FROM`                       | `Lingua <noreply@lingua.example.com>`                                         |

---

## Step 6 — Run on Server

### Option A: Podman (recommended)

```bash
podman run -d \
  --name lingua-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/lingua/.env.production.local \
  ghcr.io/yourorg/lingua-app:latest

# Check health
podman ps --filter name=lingua-app
podman logs lingua-app --tail 50
```

### Option B: Docker Compose

```bash
# Uses docker-compose.yml at repo root
docker compose up -d lingua-app
docker compose ps
docker compose logs lingua-app --tail 50
```

### Option C: Systemd unit (rootless Podman)

```bash
podman generate systemd --name lingua-app --new --files
mv container-lingua-app.service ~/.config/systemd/user/
systemctl --user enable --now container-lingua-app
```

---

## Step 7 — Reverse Proxy (nginx or Caddy)

### Caddy (recommended — auto HTTPS)

```caddyfile
linguaai.example.com *.linguaai.example.com {
  reverse_proxy localhost:3000
  tls {
    dns cloudflare {env.CF_API_TOKEN}
  }
}
```

### nginx

```nginx
server {
  listen 443 ssl http2;
  server_name lingua.example.com *.lingua.example.com;

  ssl_certificate     /etc/letsencrypt/live/lingua.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/lingua.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection 'upgrade';
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

> **Important:** Pass `X-Forwarded-For` so rate limiting keys on real IPs.

---

## Step 8 — Smoke Test

```bash
# Health check
curl -I https://lingua.example.com/api/health/backend

# Public menu bootstrap (replace slug + table with your seed data)
curl 'https://lingua.example.com/api/public/bootstrap?restaurant=uma-karang&table=T01'

# Verify redirect
curl -I https://lingua.example.com/dashboard     # should → /login
curl -I https://lingua.example.com/platform      # should → /login
```

---

## Step 9 — Monitoring

- **Sentry:** Set `SENTRY_DSN` and `PUBLIC_SENTRY_DSN` in `.env.production.local`.
  Both client and server errors will be captured automatically.
- **Supabase logs:** Check **Logs → API** in the Supabase dashboard.
- **Health endpoint:** `/api/health/backend` returns 200 when DB + Redis are reachable.
  Wire this into UptimeRobot or Betterstack for uptime monitoring.
- **Container logs:** `podman logs lingua-app --tail 100 --follow`

---

## Step 10 — Pre-Pilot Checklist

Before handing to the first pilot restaurant:

- [ ] All migrations applied (`pnpm db:migrate` shows all skipped)
- [ ] Registration flow tested end-to-end (register → verify email → setup → onboard)
- [ ] At least one restaurant created with tables + published menu
- [ ] QR codes printed and scanned from a real mobile device
- [ ] Staff inbox tested (guest scans, sends request, staff sees it in inbox)
- [ ] AI chat tested with a real question about a menu item
- [ ] Password reset tested (forgot → email → update)
- [ ] Invite a staff member → accept invite → verify dashboard access
- [ ] Platform admin login tested (`/platform`)
- [ ] Sentry receiving errors (trigger a 404, confirm in Sentry)
- [ ] `/api/health/backend` returns 200
- [ ] Load test run: `k6 run tests/load/k6-public-endpoints.js -e BASE_URL=https://lingua.example.com`

---

## Rollback

```bash
# Pull previous image version
podman pull ghcr.io/yourorg/lingua-app:previous-tag

# Restart with previous image
podman stop lingua-app
podman rm lingua-app
podman run -d --name lingua-app ... ghcr.io/yourorg/lingua-app:previous-tag
```

Database rollbacks are manual — keep a `pg_dump` before each migration.

```bash
pg_dump $DIRECT_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## Support

- Internal docs: `docs/`
- Issue tracker: GitHub Issues
- Email: support@lingua.ai
