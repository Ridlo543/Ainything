# Production Deployment Guide

Target: **Tencent Lighthouse** — Ubuntu 22.04, Docker 29.6.1 + Compose v5.2.0, 2 vCPU / 2GB RAM / 40GB SSD, Jakarta region.

Selesaikan setiap section secara berurutan sebelum pilot.

---

## Prerequisites

- [ ] Domain purchased, DNS dikelola via Cloudflare
- [ ] VPS provisioned (Tencent Lighthouse Ubuntu 22.04 + Docker 29)
- [ ] SSH key pair terdaftar di Tencent Cloud Console
- [ ] GitHub account dengan akses ke repo ainything (untuk GHCR image pull)
- [ ] SMTP provider dikonfigurasi: [Resend](https://resend.com) (gratis 3000 email/bulan)
- [ ] Cloudflare R2 bucket (gratis 10GB) untuk file upload produk — **opsional, bisa setup nanti**

---

## Step 0 — SSH ke Server

Dari terminal lokal (PowerShell Windows atau macOS Terminal):

```bash
ssh ubuntu@43.133.138.28
```

Jika diminta password, cek Tencent Cloud Console → Lighthouse → instance → **Reset Password** untuk set password awal. Disarankan setup SSH key agar tidak perlu password.

---

## Step 1 — Server Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# WAJIB: Buat swap 2GB sebagai safety net (RAM hanya 2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Turunkan swappiness (lebih agresif pakai RAM dulu)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verifikasi swap aktif
free -h

# Firewall — izinkan hanya SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## Step 2 — Docker Setup

Docker 29.6.1 sudah pre-installed di image Tencent Lighthouse. Verifikasi:

```bash
docker --version
# Docker version 29.6.1, build ...

docker compose version
# Docker Compose version v5.x.x

# Tambah user ubuntu ke group docker (tidak perlu sudo tiap run)
sudo usermod -aG docker ubuntu
newgrp docker

# Verifikasi
docker run --rm hello-world
```

---

## Step 3 — Directory Structure

```bash
# Buat direktori project
sudo mkdir -p /opt/ainything
sudo chown ubuntu:ubuntu /opt/ainything
cd /opt/ainything

# Direktori untuk data persistent
mkdir -p data/postgres data/redis certs
```

---

## Step 4 — DNS Setup

Di Cloudflare DNS, tambahkan:

```
# Root domain
A   ainything.online    →  43.133.138.28   (proxy ON)

# Wildcard untuk multi-tenant outlet
A   *.ainything.online  →  43.133.138.28   (proxy ON)
```

**Cloudflare SSL/TLS mode:** Set ke **Full (strict)** setelah Caddy terinstall.

TTL propagation bisa 1–5 menit dengan Cloudflare proxy aktif.

---

## Step 5 — Environment File

Buat `/opt/ainything/.env` (tidak pernah di-commit ke repo):

```bash
nano /opt/ainything/.env
```

Isi dengan:

```env
# App
NODE_ENV=production
PUBLIC_APP_URL=https://ainything.online

# Auth.js
AUTH_SECRET=        # generate: openssl rand -base64 32
AUTH_PROVIDER=credentials

# Database — gunakan nama service Docker, bukan localhost
DATABASE_URL=postgresql://ainything:GANTI_PASSWORD_KUAT@postgres:5432/ainything

# Redis — gunakan nama service Docker
REDIS_URL=redis://redis:6379

# Email (Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@ainything.online

# AI (opsional — untuk fitur AI chat)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...   # alternatif

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=ainything-uploads
R2_PUBLIC_URL=https://uploads.yourdomain.com

# Error monitoring (opsional)
# PUBLIC_SENTRY_DSN=
# SENTRY_AUTH_TOKEN=

# Internal — dipakai docker-compose untuk init postgres
POSTGRES_PASSWORD=GANTI_PASSWORD_KUAT
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## Step 6 — Docker Compose

Buat `/opt/ainything/compose.yml`:

```bash
nano /opt/ainything/compose.yml
```

Isi:

```yaml
name: ainything

services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ainything
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ainything
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - '127.0.0.1:5432:5432' # bind localhost only — tidak expose ke publik
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ainything']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    volumes:
      - ./data/redis:/data
    ports:
      - '127.0.0.1:6379:6379' # bind localhost only
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/Ridlo543/ainything-app:latest
    restart: unless-stopped
    ports:
      - '127.0.0.1:3000:3000' # Caddy forward ke sini
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/api/health/backend']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./certs:/data/caddy
    depends_on:
      - app
```

Ganti `Ridlo543` dengan GitHub username kamu jika berbeda.

---

## Step 7 — Cloudflare Origin Certificate + Caddyfile

Dengan Cloudflare proxy aktif (orange cloud), Caddy tidak bisa pakai Let's Encrypt langsung karena HTTP-01 challenge diblok Cloudflare. Solusinya: pakai **Cloudflare Origin Certificate** — cert gratis 15 tahun yang di-issue Cloudflare khusus untuk origin server.

### 7a — Buat Cloudflare Origin Certificate

Di Cloudflare Dashboard → `ainything.online` → **SSL/TLS** → **Origin Server** → **Create Certificate**:

- Key type: RSA (2048)
- Hostnames: `ainything.online`, `*.ainything.online`
- Validity: 15 years
- Klik **Create**

Copy dua value yang muncul:

- **Origin Certificate** → simpan sebagai `origin.pem`
- **Private Key** → simpan sebagai `origin.key`

### 7b — Simpan cert di server

```bash
nano /opt/ainything/certs/origin.pem   # paste Origin Certificate
nano /opt/ainything/certs/origin.key   # paste Private Key
chmod 600 /opt/ainything/certs/origin.key
chmod 644 /opt/ainything/certs/origin.pem
```

### 7c — Update compose.yml

Tambahkan mount cert ke service `caddy` di `/opt/ainything/compose.yml`:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./certs:/opt/certs:ro
      - caddy_data:/data/caddy
    depends_on:
      - app

volumes:
  caddy_data:
```

### 7d — Buat Caddyfile

```bash
nano /opt/ainything/Caddyfile
```

Isi:

```caddyfile
ainything.online, *.ainything.online {
    # Cloudflare Origin Certificate — valid 15 tahun, tidak perlu ACME/Let's Encrypt
    tls /opt/certs/origin.pem /opt/certs/origin.key

    reverse_proxy app:3000 {
        # Penting untuk SSE (staff↔buyer chat — flush langsung, tidak di-buffer)
        flush_interval -1
        transport http {
            read_timeout 5m
        }
    }
}
```

### 7e — Set Cloudflare SSL/TLS ke Full (Strict)

Di Cloudflare → SSL/TLS → Overview → pilih **Full (strict)**.

Ini memastikan traffic Cloudflare → origin dienkripsi dan cert divalidasi. Hanya Cloudflare Origin Certificate atau cert dari trusted CA yang diterima.

### 7f — Restart Caddy

```bash
cd /opt/ainything
docker compose up -d caddy
docker compose logs caddy --tail=20
```

---

## Step 8 — CI/CD Setup (GitHub Actions + GHCR)

GitHub Actions di `.github/workflows/ci.yml` mengelola seluruh build + deploy pipeline secara otomatis.

### Branch Strategy

| Branch | Trigger             | Jobs yang berjalan         |
| ------ | ------------------- | -------------------------- |
| `dev`  | push ke `dev`       | check only (type + test)   |
| `main` | push ke `main`      | check → build → deploy VPS |
| PR     | PR targeting `main` | check only                 |

### Setup GitHub Secrets

Di GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret              | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| `VPS_HOST`          | `43.133.138.28`                                          |
| `VPS_USER`          | `ubuntu`                                                 |
| `VPS_SSH_KEY`       | private key SSH (isi dengan `Get-Content ~/.ssh/id_rsa`) |
| `PUBLIC_SENTRY_DSN` | DSN dari Sentry dashboard (opsional)                     |
| `SENTRY_AUTH_TOKEN` | Auth token dari Sentry (opsional, untuk source maps)     |
| `SENTRY_ORG`        | Nama org di Sentry (opsional)                            |
| `SENTRY_PROJECT`    | Nama project di Sentry (opsional)                        |

### Setup GHCR Login di Server (sekali saja)

Server perlu login ke GHCR untuk bisa pull image private:

```bash
# Buat PAT di GitHub: Settings → Developer settings → Personal access tokens
# Centang: read:packages
docker login ghcr.io
# Username: Ridlo543
# Password: [paste PAT token]
```

### Manual Build (fallback tanpa CI)

Jika perlu build manual dari lokal:

```powershell
# Build kedua image sekaligus
docker build --target runtime  -t ghcr.io/ridlo543/ainything-app:latest .
docker build --target migrate  -t ghcr.io/ridlo543/ainything-migrate:latest .

# Login dan push
docker login ghcr.io
docker push ghcr.io/ridlo543/ainything-app:latest
docker push ghcr.io/ridlo543/ainything-migrate:latest
```

Di server setelah push manual:

```bash
cd /opt/ainything
docker pull ghcr.io/ridlo543/ainything-app:latest
docker pull ghcr.io/ridlo543/ainything-migrate:latest
```

---

## Step 9 — Run Migrations

```bash
cd /opt/ainything

# Start postgres + redis dulu, tunggu healthy
docker compose up -d postgres redis
sleep 10

# Verifikasi postgres healthy
docker compose ps

# Jalankan migrations (0001–0028)
# pnpm tidak ada di runtime image — gunakan node langsung
docker compose run --rm app node scripts/db.mjs migrate

# Seed demo data (OPSIONAL — skip untuk production bersih)
# docker compose run --rm app node scripts/db.mjs seed
```

Output harus menunjukkan semua 28 migrations applied.

---

## Step 10 — Start Semua Services

```bash
cd /opt/ainything

# Start semua services
docker compose up -d

# Cek status semua container
docker compose ps

# Pantau logs app saat startup
docker compose logs -f app
```

Tunggu hingga `app` menunjukkan healthy (sekitar 30 detik).

---

## Step 11 — Set Super Admin

Setelah register akun pertama via `/register`:

```bash
cd /opt/ainything

docker compose exec postgres \
  psql -U ainything -d ainything -c \
  "UPDATE app_users SET platform_role = 'super_admin' WHERE email = 'your@email.com';"
```

---

## Step 12 — Health Check

```bash
# Dari server
curl http://localhost:3000/api/health/backend

# Dari luar (setelah DNS propagate)
curl https://ainything.online/api/health/backend
```

Response harus `{"ok":true,"backend":{"database":"ok","redis":"ok","authProvider":"credentials"}}`.

---

## Deployment Update (Rutin)

### Via CI/CD (direkomendasikan)

Push ke branch `main` — GitHub Actions akan otomatis:

1. Run type check + unit tests
2. Build + push kedua image ke GHCR (`ainything-app` + `ainything-migrate`)
3. SSH ke VPS, pull image, run migrations, restart app, verifikasi health

```bash
git push origin main
```

Pantau progress di GitHub → Actions tab.

### Manual (fallback)

Jika CI/CD tidak tersedia:

```bash
cd /opt/ainything

# Pull image terbaru
docker pull ghcr.io/ridlo543/ainything-app:latest
docker pull ghcr.io/ridlo543/ainything-migrate:latest

# Run migrations
docker run --rm \
  --network ainything_default \
  --env-file .env \
  ghcr.io/ridlo543/ainything-migrate:latest

# Restart app saja — postgres + redis tetap berjalan
docker compose up -d --no-deps app

# Pantau startup
docker compose logs -f app
```

---

## Backup Database

Jalankan sebelum setiap migration atau release besar:

```bash
cd /opt/ainything

# Backup ke file dengan timestamp
docker compose exec postgres \
  pg_dump -U ainything ainything \
  > backup-$(date +%Y%m%d-%H%M%S).sql

# Verifikasi backup ada
ls -lh backup-*.sql
```

---

## Rollback

```bash
cd /opt/ainything

# Rollback ke image sebelumnya (ganti tag sesuai versi)
docker compose pull app ghcr.io/ridlo543/ainything-app:v1.2.3
sed -i 's|:latest|:v1.2.3|' compose.yml
docker compose up -d --no-deps app

# Atau jika perlu rollback database juga:
docker compose exec postgres \
  psql -U ainything -d ainything < backup-20260628-120000.sql
```

---

## Environment Variables Reference

| Variable               | Required | Description                                       |
| ---------------------- | -------- | ------------------------------------------------- |
| `NODE_ENV`             | Yes      | `production`                                      |
| `PUBLIC_APP_URL`       | Yes      | Base URL aplikasi (tanpa trailing slash)          |
| `AUTH_SECRET`          | Yes      | Secret untuk JWT/session signing (min 32 chars)   |
| `AUTH_PROVIDER`        | Yes      | `credentials` (production) atau `mock` (dev only) |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                      |
| `REDIS_URL`            | Yes      | Redis connection string                           |
| `SMTP_HOST`            | Yes      | SMTP host untuk email auth                        |
| `SMTP_PORT`            | Yes      | SMTP port (587 untuk STARTTLS)                    |
| `SMTP_USER`            | Yes      | SMTP username                                     |
| `SMTP_PASS`            | Yes      | SMTP password/API key                             |
| `SMTP_FROM`            | Yes      | From address untuk email                          |
| `ANTHROPIC_API_KEY`    | No       | Untuk AI chat (Anthropic Claude)                  |
| `OPENAI_API_KEY`       | No       | Alternatif untuk AI chat (OpenAI-compatible)      |
| `R2_ACCOUNT_ID`        | No       | Cloudflare R2 account ID (untuk file upload)      |
| `R2_ACCESS_KEY_ID`     | No       | Cloudflare R2 access key                          |
| `R2_SECRET_ACCESS_KEY` | No       | Cloudflare R2 secret key                          |
| `R2_BUCKET_NAME`       | No       | Nama R2 bucket                                    |
| `R2_PUBLIC_URL`        | No       | Public URL untuk R2 bucket                        |
| `PUBLIC_SENTRY_DSN`    | No       | Sentry DSN untuk error monitoring                 |
| `POSTGRES_PASSWORD`    | Yes      | Password postgres (dipakai compose untuk init)    |

---

## Pre-Pilot Checklist

- [ ] `curl https://ainything.yourdomain.com/api/health/backend` → `{"status":"ok"}`
- [ ] Register akun org_owner → `/dashboard` berfungsi
- [ ] Login sebagai staff → `/staff/inbox` berfungsi
- [ ] QR scan `/r/[slug]/table/T01` berfungsi tanpa login
- [ ] Checkout flow end-to-end berhasil
- [ ] Staff↔buyer chat SSE berfungsi (kirim pesan, pesan muncul real-time)
- [ ] Platform admin login (`/platform`) berhasil setelah set `super_admin`
- [ ] Password reset flow (forgot → email → update) berhasil
- [ ] Upload foto produk ke R2 berhasil
- [ ] `docker compose ps` → semua services `healthy`

---

## Troubleshooting

**App tidak bisa konek ke database:**

```bash
# Cek apakah postgres healthy
docker compose ps

# Cek network — app harus bisa resolve "postgres"
docker compose exec app ping -c 1 postgres
```

**Out of memory (OOM):**

```bash
# Cek memory usage
free -h
docker stats --no-stream

# Cek swap aktif
swapon --show
```

**Caddy tidak dapat TLS certificate:**

- Pastikan DNS sudah propagate: `dig ainything.yourdomain.com`
- Pastikan port 80 dan 443 tidak diblock di Tencent Lighthouse firewall rules
- Cek Caddy logs: `docker compose logs caddy`

**Support**

- Internal docs: `docs/`
- Issue tracker: GitHub Issues
