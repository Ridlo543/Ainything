# Lingua Testing Guide

## Overview

Complete testing strategy for Lingua including unit, E2E, and load testing.

## Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── auth-flow.spec.ts
│   ├── customer-flow.spec.ts
│   └── ...
├── load/                   # K6 load tests
│   ├── lingua-load-test.js
│   └── Dockerfile
└── unit/                   # Vitest unit tests
    └── ...
```

## Running Tests

### Unit Tests

```bash
pnpm test:unit           # All unit tests
pnpm test:unit -- --coverage  # With coverage
```

### E2E Tests

```bash
pnpm test:e2e            # All E2E tests
pnpm test:e2e -- --ui    # With UI mode
```

### Load Tests

#### Local (K6 installed)

```bash
k6 run tests/load/lingua-load-test.js
```

#### With Docker

```bash
docker run --rm \
  -v $(pwd):/tests \
  grafana/k6:latest \
  run /tests/tests/load/lingua-load-test.js
```

#### With Podman

```bash
podman run --rm \
  -v $(pwd):/tests:Z \
  lingua-load-test \
  run /tests/lingua-load-test.js
```

## Test Scenarios

### E2E Tests (60/60 passing)

- Authentication flow
- Customer flow (QR scan, menu, chat)
- Staff management
- Platform admin
- RTL support (Arabic)
- Onboarding flow

### Load Tests

- 100 concurrent users
- Customer burst (50 VUs, 30s)
- Staff load (ramping)
- Mixed traffic
- Spike test

### Unit Tests

- Domain logic
- Services
- Repositories
- Providers

## Test Environment

```bash
# Use mock backend for local testing
USE_MOCK_BACKEND=true

# Run with local DB
pnpm infra:up
pnpm db:reset
pnpm test
```
