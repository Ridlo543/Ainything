# Lingua Deployment Overview

This guide covers deployment for Lingua using Docker/Podman and Kubernetes.

## Prerequisites
- Docker 24+ or Podman 5+ installed
- Kubernetes 1.28+ (for k8s deployment)
- Node.js 20+ (for development)
- pnpm installed

## Quick Start

### Local Development
```bash
make local              # Start Docker Compose
make local-down         # Stop Docker Compose
```

### Production Build
```bash
make build              # Build Docker image
make k8s               # Deploy to Kubernetes
```

### Load Testing
```bash
make load-test         # Run load tests with K6
```

## Deployment Options

### 1. Docker Compose (Local/Staging)
- Use for development and testing
- All services in one host
- Easy to start/stop

### 2. Kubernetes (Production)
- Use for production deployment
- Horizontal scaling
- Self-healing
- Advanced monitoring

### 3. Podman (Alternative to Docker)
- Rootless containers
- SELinux integrated
- Drop-in replacement for Docker

## Files Structure

```
.
├── docker-compose.yml          # Local development
├── docker-compose.monitoring.yml  # Monitoring stack
├── Dockerfile                  # Application image
├── Makefile                    # Deployment automation
├── k8s/                        # Kubernetes manifests
│   ├── manifests.yml          # Main deployment
│   ├── secrets.yml            # Secrets
│   ├── rbac.yml               # RBAC
│   ├── storage.yml            # PVCs
│   └── README.md              # K8s guide
├── monitoring/                 # Prometheus/Grafana configs
│   ├── prometheus.yml
│   ├── grafana-dashboard.json
│   └── prometheus-rules.yml
└── tests/load/                 # Load testing
    ├── lingua-load-test.js
    ├── Dockerfile
    └── README.md
```
