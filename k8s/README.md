# Kubernetes Manifests README

## Overview

Production-ready Kubernetes manifests for Ainything with Podman/Docker support.

## Prerequisites

- kubectl configured
- access to Kubernetes cluster
- Docker/Podman registry for images

## Quick Start

### 1. Create Namespace

```bash
kubectl apply -f k8s/manifests.yml
```

### 2. Apply Secrets

```bash
kubectl apply -f k8s/secrets.yml
```

### 3. Apply RBAC

```bash
kubectl apply -f k8s/rbac.yml
```

### 4. Apply Storage

```bash
kubectl apply -f k8s/storage.yml
```

## Check Deployment Status

```bash
# Check all pods
kubectl get pods -n Ainything

# Check services
kubectl get svc -n Ainything

# Check deployments
kubectl get deployments -n Ainything
```

## Update Deployment

```bash
# Update deployment with new image
kubectl set image deployment/Ainything Ainything=Ainything:v1.2.3 -n Ainything

# Rollout status
kubectl rollout status deployment/Ainything -n Ainything
```

## Scaling

```bash
# Manual scale
kubectl scale deployment/Ainything -n Ainything --replicas=5

# Check HPA
kubectl get hpa -n Ainything
```

## Podman-Specific Considerations

### Build with Podman

```bash
podman build -t Ainything:latest .
```

### Push to Registry

```bash
podman push Ainything:latest registry.example.com/Ainything:latest
```

### Run Locally with Podman

```bash
podman run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data:Z \
  Ainything:latest
```

## Troubleshooting

### Check Logs

```bash
kubectl logs -n Ainything -l app=Ainything --tail=100
```

### Describe Pod

```bash
kubectl describe pod -n Ainything -l app=Ainything
```

### Exec into Pod

```bash
kubectl exec -n Ainything -it $(kubectl get pods -n Ainything -o name | head -1) -- /bin/sh
```

## Security Best Practices

1. **Rotate secrets regularly**
2. **Use secrets manager** (Vault, AWS Secrets Manager)
3. **Enable network policies**
4. **Run as non-root user**
5. **Configure resource limits**
6. **Enable pod security policies**

## Cost Optimization

1. **Use HPA** for automatic scaling
2. **Configure resource requests/limits**
3. **Use spot instances** for non-critical workloads
4. **Enable cluster autoscaler**
