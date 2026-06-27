# Production Deployment Checklist

Deploy ainything ke VPS self-hosted (Hetzner CX23 Singapore atau setara).
Selesaikan setiap section sebelum pilot.

---

## Prerequisites

- [ ] Domain purchased, DNS dikelola via Cloudflare
- [ ] VPS provisioned (Ubuntu 22.04+, min 2 vCPU / 4GB RAM)
- [ ] PostgreSQL 16 dan Redis 7 siap (self-hosted di VPS yang sama atau terpisah)
- [ ] Container registry access (GHCR, Docker Hub, atau self-hosted)
- [ ] Podman atau Docker terinstall di server
- [ ] Node 24+ dan pnpm 10+ di CI runner (atau gunakan container image)
- [ ] SMTP provider dikonfigurasi (Resend, Postmark, atau Brevo) untuk email auth

---

## Step 1 — DNS Setup

```
# Root domain
A   ainything.example.com   → server IP

# Wildcard subdomain untuk multi-tenant
# Setiap restaurant mendapat <slug>.ainything.example.com
A   *.ainything.example.com → server IP

# Optional: naked domain redirect
A   example.com             → server IP
```

**Cloudflare:** Enable proxy (orange cloud) di kedua record untuk DDoS protection.
Set SSL/TLS ke "Full (strict)" setelah origin certificate terpasang.

---

## Step 2 — Database Setup

```bash
# Buat user dan database PostgreSQL
psql -U postgres <<'SQL'
CREATE USER ainything_app WITH PASSWORD 'your-strong-password';
CREATE DATABASE ainything OWNER ainything_app;
\c ainything
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
SQL
```

Catat connection strings:

- `DATABASE_URL=postgresql://ainything_app:password@localhost:5432/ainything`

---

## Step 3 — Run Migrations

```bash
# Clone repo dan install deps
git clone https://github.com/yourorg/ainything.git
cd ainything
pnpm install

# Apply semua migrations (0001–0028)
DATABASE_URL="postgresql://ainything_app:password@localhost:5432/ainything" \
  pnpm db:migrate

# Seed demo data (opsional — hapus untuk production bersih)
DATABASE_URL="postgresql://ainything_app:password@localhost:5432/ainything" \
  node scripts/db.mjs seed
```

Semua 28 migrations (0001–0028) harus menunjukkan status applied.

---

## Step 4 — Environment Variables

Buat file `.env` di server (jangan commit ke repo):

```env
# App
NODE_ENV=production
PUBLIC_APP_URL=https://ainything.example.com
AUTH_SECRET=<random 32+ char string — gunakan: openssl rand -base64 32>

# Auth
AUTH_PROVIDER=credentials

# Database
DATABASE_URL=postgresql://ainything_app:password@localhost:5432/ainything

# Redis
REDIS_URL=redis://localhost:6379

# Email (pilih salah satu provider)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<resend api key>
SMTP_FROM=noreply@ainything.example.com

# AI (opsional — untuk fitur AI chat)
ANTHROPIC_API_KEY=<key>
# atau
OPENAI_API_KEY=<key>

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret key>
R2_BUCKET_NAME=ainything-uploads
R2_PUBLIC_URL=https://uploads.ainything.example.com

# Error monitoring (opsional)
PUBLIC_SENTRY_DSN=<sentry dsn>
SENTRY_AUTH_TOKEN=<sentry auth token>
```

---

## Step 5 — Build and Push Container

```bash
# Build image
podman build -t ghcr.io/yourorg/ainything-app:latest .

# Push ke registry
podman push ghcr.io/yourorg/ainything-app:latest
```

Atau gunakan GitHub Actions CI yang sudah ada — setiap push ke `main` akan
build dan push otomatis.

---

## Step 6 — Run Container

```bash
# Pull image terbaru
podman pull ghcr.io/yourorg/ainything-app:latest

# Run container
podman run -d \
  --name ainything-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/ainything/.env \
  ghcr.io/yourorg/ainything-app:latest
```

---

## Step 7 — Reverse Proxy (Nginx atau Caddy)

### Caddy (direkomendasikan — auto TLS)

```caddyfile
ainything.example.com, *.ainything.example.com {
  reverse_proxy localhost:3000
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name ainything.example.com *.ainything.example.com;

    ssl_certificate     /etc/letsencrypt/live/ainything.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ainything.example.com/privkey.pem;

    # Penting untuk SSE (staff↔buyer chat)
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400; # untuk SSE connections
    }
}
```

---

## Step 8 — Redis Setup

```bash
# Via Podman
podman run -d \
  --name ainything-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  -v ainything-redis-data:/data \
  redis:7-alpine redis-server --appendonly yes

# Atau via system package
sudo apt install redis-server
sudo systemctl enable redis-server
```

---

## Step 9 — First Super Admin

Setelah app berjalan, set platform role di database:

```sql
-- Jalankan via psql di server
UPDATE app_users SET platform_role = 'super_admin'
WHERE email = 'your@email.com';
```

---

## Step 10 — Health Check

```bash
# App health
curl https://ainything.example.com/api/health/backend

# Verify container running
podman ps

# View logs
podman logs ainything-app --tail 50
```

---

## Environment Variables Reference

| Variable               | Required | Description                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| `NODE_ENV`             | Yes      | `production`                                    |
| `PUBLIC_APP_URL`       | Yes      | Base URL aplikasi (tanpa trailing slash)        |
| `AUTH_SECRET`          | Yes      | Secret untuk JWT/session signing (min 32 chars) |
| `AUTH_PROVIDER`        | Yes      | `credentials` (production) atau `mock` (dev)    |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                    |
| `REDIS_URL`            | Yes      | Redis connection string                         |
| `SMTP_HOST`            | Yes      | SMTP host untuk email auth                      |
| `SMTP_PORT`            | Yes      | SMTP port (587 untuk TLS)                       |
| `SMTP_USER`            | Yes      | SMTP username                                   |
| `SMTP_PASS`            | Yes      | SMTP password/key                               |
| `SMTP_FROM`            | Yes      | From address untuk email                        |
| `ANTHROPIC_API_KEY`    | No       | Untuk AI chat (Anthropic Claude)                |
| `OPENAI_API_KEY`       | No       | Alternatif untuk AI chat (OpenAI-compatible)    |
| `R2_ACCOUNT_ID`        | No       | Cloudflare R2 account ID (untuk file upload)    |
| `R2_ACCESS_KEY_ID`     | No       | Cloudflare R2 access key                        |
| `R2_SECRET_ACCESS_KEY` | No       | Cloudflare R2 secret key                        |
| `R2_BUCKET_NAME`       | No       | Nama R2 bucket                                  |
| `R2_PUBLIC_URL`        | No       | Public URL untuk R2 bucket                      |
| `PUBLIC_SENTRY_DSN`    | No       | Sentry DSN untuk error monitoring               |

---

## Pre-Pilot Checklist

- [ ] `GET /api/health/backend` mengembalikan 200
- [ ] Login sebagai org_owner → `/dashboard` berfungsi
- [ ] Login sebagai staff → `/staff/inbox` berfungsi
- [ ] QR scan `/r/[slug]/table/T01` berfungsi tanpa login
- [ ] Checkout flow end-to-end berhasil
- [ ] Staff↔buyer chat SSE berfungsi
- [ ] Platform admin login (`/platform`) berhasil
- [ ] Password reset flow (forgot → email → update) berhasil
- [ ] Upload foto produk ke R2 berhasil
- [ ] Sentry menerima error (trigger 404, konfirmasi di Sentry)
- [ ] Load test: `k6 run tests/load/k6-public-endpoints.js -e BASE_URL=https://ainything.example.com`

---

## Rollback

```bash
# Pull image versi sebelumnya
podman pull ghcr.io/yourorg/ainything-app:previous-tag

# Restart dengan image lama
podman stop ainything-app
podman rm ainything-app
podman run -d --name ainything-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/ainything/.env \
  ghcr.io/yourorg/ainything-app:previous-tag
```

Database rollback manual — selalu buat `pg_dump` sebelum setiap migration:

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## Support

- Internal docs: `docs/`
- Issue tracker: GitHub Issues
- Email: support@ainything.ai
