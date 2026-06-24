# Lingua Deployment - Quick Start Guide

## Overview
This guide covers deployment for Lingua using Docker/Podman and Kubernetes.

## Prerequisites
- Docker 24+ or Podman 5+ installed
- Kubernetes 1.28+ (for k8s deployment)
- Node.js 20+ (for development)
- pnpm installed

## Quick Start

### 1. Local Development with Docker Compose
```bash
# Start all services
docker-compose up -d
```

### 2. Production Build with Docker
```bash
# Build image
docker build -t lingua:latest .
```

### 3. Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f k8s/manifests.yml
```

## File Structure

```
.
├── docker-compose.yml          # Local development
├── Dockerfile                  # Application image
├── Makefile                    # Deployment automation
├── k8s/                        # Kubernetes manifests
└── tests/load/                 # Load testing
```

## Next Steps

1. Review DEPLOYMENT.md for detailed deployment guide
2. Check k8s/README.md for Kubernetes deployment details
3. Setup CI/CD pipeline
4. Setup monitoring with Prometheus/Grafana
