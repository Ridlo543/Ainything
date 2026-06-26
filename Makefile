# Ainything Deployment Makefile
# Production deployment automation with Docker/Podman and Kubernetes

.PHONY: help build push deploy k8s k8s-delete local local-down load-test check lint test

help: ## Show this help
	@echo "Ainything Deployment Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development Commands

local: ## Start local development with Docker Compose
	@echo "Starting local development environment..."
	@docker-compose up -d
	@echo "Local environment started. Visit http://localhost:5173"

local-down: ## Stop local development environment
	@echo "Stopping local development environment..."
	@docker-compose down
	@echo "Local environment stopped."

local-build: ## Build local Docker images
	@echo "Building Docker images..."
	@docker-compose build
	@echo "Docker images built."

# Docker Commands

build: ## Build production Docker image
	@echo "Building production Docker image..."
	@docker build -t ainything:latest .
	@echo "Docker image built: ainything:latest"

build-tag: ## Build with specific tag
	@echo "Building Docker image with tag: $(tag)..."
	@docker build -t ainything:$(tag) .
	@echo "Docker image built: ainything:$(tag)"

push: ## Push Docker image to registry
	@echo "Pushing Docker image to registry..."
	@docker push ainything:latest

podman-build: ## Build with Podman
	@echo "Building with Podman..."
	@podman build -t ainything:latest .
	@echo "Podman image built: ainything:latest"

podman-push: ## Push with Podman
	@echo "Pushing with Podman..."
	@podman push ainything:latest

# Kubernetes Commands

k8s: ## Deploy to Kubernetes
	@echo "Deploying to Kubernetes..."
	@kubectl apply -f k8s/manifests.yml
	@kubectl apply -f k8s/secrets.yml
	@kubectl apply -f k8s/rbac.yml
	@kubectl apply -f k8s/storage.yml
	@echo "Deployment complete. Check status: kubectl get pods -n ainything"

k8s-delete: ## Delete Kubernetes deployment
	@echo "Deleting Kubernetes deployment..."
	@kubectl delete -f k8s/manifests.yml
	@kubectl delete -f k8s/secrets.yml
	@kubectl delete -f k8s/rbac.yml
	@kubectl delete -f k8s/storage.yml
	@echo "Kubernetes deployment deleted."

k8s-scale: ## Scale Kubernetes deployment
	@echo "Scaling Kubernetes deployment..."
	@kubectl scale deployment/ainything -n ainything --replicas=$(replicas)
	@echo "Scaled to $(replicas) replicas."

k8s-logs: ## Show Kubernetes logs
	@echo "Showing Kubernetes logs..."
	@kubectl logs -n ainything -l app=ainything --tail=100 -f

# Testing Commands

load-test: ## Run load tests
	@echo "Running load tests..."
	@k6 run tests/load/ainything-load-test.js

load-test-docker: ## Run load tests with Docker
	@echo "Running load tests with Docker..."
	@docker run --rm -v $(PWD):/tests grafana/k6:latest run /tests/tests/load/ainything-load-test.js

check: ## Run TypeScript check
	@echo "Running TypeScript check..."
	@pnpm check

lint: ## Run ESLint
	@echo "Running ESLint..."
	@pnpm lint

test: ## Run unit tests
	@echo "Running unit tests..."
	@pnpm test:unit

test-e2e: ## Run E2E tests
	@echo "Running E2E tests..."
	@pnpm test:e2e

# Monitoring Commands

monitoring-up: ## Start monitoring stack
	@echo "Starting monitoring stack..."
	@docker-compose -f docker-compose.monitoring.yml up -d
	@echo "Monitoring stack started. Prometheus: http://localhost:9090, Grafana: http://localhost:3000"

monitoring-down: ## Stop monitoring stack
	@echo "Stopping monitoring stack..."
	@docker-compose -f docker-compose.monitoring.yml down
	@echo "Monitoring stack stopped."

# Helper Commands

status: ## Show deployment status
	@echo "Deployment Status:"
	@echo ""
	@kubectl get pods -n ainything
	@echo ""
	@kubectl get svc -n ainything
	@echo ""
	@kubectl get hpa -n ainything

clean: ## Clean Docker artifacts
	@echo "Cleaning Docker artifacts..."
	@docker system prune -a --volumes -f
	@echo "Docker artifacts cleaned."

rollback: ## Rollback Kubernetes deployment
	@echo "Rolling back Kubernetes deployment..."
	@kubectl rollout undo deployment/ainything -n ainything
	@echo "Rollback complete."

wait: ## Wait for deployment to complete
	@echo "Waiting for deployment to complete..."
	@kubectl rollout status deployment/ainything -n ainything --timeout=180s
