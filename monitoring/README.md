# Monitoring Stack for Lingua

## Overview
Complete monitoring with Prometheus, Grafana, and exporters.

## Services

### Prometheus
- Metrics collection and storage
- Port: 9090
- Configuration: `monitoring/prometheus.yml`

### Grafana
- Dashboards and visualization
- Port: 3000
- Default credentials: admin/admin

### Exporters
- PostgreSQL Exporter: Port 9187
- Redis Exporter: Port 9121

## Quick Start

```bash
# Start monitoring stack
make monitoring-up

# Stop monitoring stack
make monitoring-down

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000
```

## Metrics Collected

- HTTP request rate and latency
- Memory usage (heap, goroutines)
- Database connections
- Redis cache stats
- LLM API calls and costs

## Alerting

Configured in `monitoring/prometheus-rules.yml`:
- High error rate (>1%)
- High latency (P95 >2s)
- High memory usage (>80%)
- High CPU usage (>80%)

## Grafana Dashboards

1. Lingua Dashboard - Main application metrics
2. PostgreSQL Dashboard - Database performance
3. Redis Dashboard - Cache performance
