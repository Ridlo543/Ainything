# ainything Deployment Guide

## Overview

This guide covers deployment for ainything using Docker/Podman and Kubernetes.

## Prerequisites

- Docker 24+ or Podman 5+ installed
- Kubernetes 1.28+ (for k8s deployment)
- Node.js 20+ (for development)
- pnpm installed

## Local Development with Docker Compose

### Start Services

```bash
# Start all services
docker-compose up -d

# Or with Podman
podman-compose up -d
```

### Stop Services

```bash
docker-compose down
# or
podman-compose down
```

### View Logs

```bash
docker-compose logs -f ainything
```

### Access Services

- App: http://localhost:5173
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Production Build with Docker

### Build Image

```bash
docker build -t ainything:latest .
# or with Podman
podman build -t ainything:latest .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e USE_MOCK_BACKEND=false \
  -e DATABASE_URL=postgresql://... \
  ainything:latest
```

## Kubernetes Deployment

### Prerequisites

- kubectl configured
- access to cluster

### Deploy

```bash
# Apply namespace and resources
kubectl apply -f k8s/manifests.yml

# Check deployment status
kubectl get pods -n ainything
kubectl get svc -n ainything
```

### Scale

```bash
# Scale manually
kubectl scale deployment ainything -n ainything --replicas=5

# Or use HPA (already configured)
kubectl get hpa -n ainything
```

## Podman-Specific Instructions

### Run with Podman

```bash
# Build
podman build -t ainything:latest .

# Run with SELinux support
podman run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:Z \
  ainything:latest
```

### Troubleshooting Podman

```bash
# Disable SELinux if needed
podman run --security-opt label=disable ...

# Use host network
podman run --network host ...

# Check SELinux context
ls -Z /path/to/volume
```

## Monitoring & Logging

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Metrics

Metrics available at `/metrics` endpoint (when configured).

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build and Push Docker Image
  run: |
    docker build -t ainything:${{ github.sha }} .
    docker push ainything:${{ github.sha }}
```

### GitLab CI

```yaml
deploy:
  image: alpine/kubectl:latest
  script:
    - kubectl apply -f k8s/manifests.yml
```

## Backup & Recovery

### PostgreSQL Backup

```bash
docker exec ainything-postgres pg_dump -U postgres ainything > backup.sql
```

### Restore

```bash
docker exec -i ainything-postgres psql -U postgres ainything < backup.sql
```

## Security Best Practices

1. **Rotate secrets regularly**
2. **Use secrets manager in production**
3. **Enable HTTPS**
4. **Configure CORS properly**
5. **Keep images updated**
6. **Run as non-root user**

## Performance Optimization

1. **Enable Redis caching**
2. **Configure connection pooling**
3. **Use horizontal pod autoscaling**
4. **Optimize database queries**
5. **Enable compression**

## Next Steps

1. Setup CI/CD pipeline
2. Configure monitoring (Grafana/Prometheus)
3. Setup logging (ELK/Loki)
4. Configure CDN for static assets
5. Setup SSL/TLS certificates
