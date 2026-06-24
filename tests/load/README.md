# Load Testing Guide for Lingua

## Overview

Load testing infrastructure using K6 for 100+ concurrent users.

## Quick Start

### Local (K6 installed)

```bash
k6 run tests/load/lingua-load-test.js
```

### With Docker

```bash
docker run --rm \
  -v $(pwd):/tests \
  grafana/k6:latest \
  run /tests/tests/load/lingua-load-test.js
```

### With Podman

```bash
podman run --rm \
  -v $(pwd):/tests:Z \
  lingua-load-test \
  run /tests/lingua-load-test.js
```

## Test Scenarios

1. **Customer Burst** - 50 VUs, 30s constant load
2. **Staff Load** - Ramping 10→20→0 VUs
3. **Mixed Traffic** - 100 iterations, 30 VUs
4. **Spike Test** - Ramping arrival rate 100 VUs

## Metrics Thresholds

- P95 Latency: < 2000ms
- P99 Latency: < 3000ms
- Failure Rate: < 1%

## Output Formats

```bash
# JSON output
k6 run tests/load/lingua-load-test.js --out json=output.json

# InfluxDB (for Grafana)
k6 run tests/load/lingua-load-test.js --out influxdb=http://localhost:8086/lingua
```

## Integration

- GitHub Actions: `.github/workflows/ci-cd.yml`
- GitLab CI: `.gitlab-ci.yml`
- Makefile: `make load-test`
