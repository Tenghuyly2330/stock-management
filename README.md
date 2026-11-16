# HouseStock & Inventory Management System

A production-grade, enterprise Stock & Inventory Management Web Application built with **React 19**, **Tailwind CSS v4**, **Node.js (Express 5)**, **PostgreSQL**, **Docker**, **Nginx**, **GitHub Actions CI/CD**, **Kubernetes**, and **Prometheus & Grafana**.

---

## 1. System Architecture

```
                              +---------------------------------------+
                              |         End User / Browser            |
                              +-------------------+-------------------+
                                                  |
                                                  | HTTPS / HTTP Port 80
                                                  v
                              +---------------------------------------+
                              |         Nginx Reverse Proxy           |
                              |  - Rate Limiting (30 req/s)           |
                              |  - Gzip & Security Headers            |
                              |  - SSL / TLS Termination              |
                              +--------+---------------------+--------+
                                       |                     |
                  / (Static SPA Assets)|                     | /api/* & /uploads/*
                                       v                     v
                +------------------------------+     +-------------------------------+
                |       React 19 SPA           |     |     Express 5 REST API        |
                |  (Vite + Tailwind CSS v4)    |     |  (JWT Auth, RBAC, Metrics)    |
                +------------------------------+     +---------------+---------------+
                                                                     |
                                             +-----------------------+-----------------------+
                                             |                                               |
                                             v                                               v
                              +-------------------------------+               +-------------------------------+
                              |      PostgreSQL 16 Engine     |               |      Prometheus & Grafana     |
                              |  (Atomic TXNs, FOR UPDATE)    |               |  (Real-time HTTP/DB Telemetry)|
                              +-------------------------------+               +-------------------------------+
```

---

## 2. Core Modules (Streamlined Business Scope)

The application is tailored for **Farm Machinery & Industrial Metals** distribution across exactly 8 focused modules:

| # | Module | Route | Description |
|---|---|---|---|
| 1 | **Dashboard** | `/` | Real-time Base Warehouse valuation, inventory counts, quick movement ledger, and KPIs. |
| 2 | **Products** | `/products` | Catalog for Farm Machinery and Metals with short names, SKU, pricing, and Cloudinary image sync. |
| 3 | **Categories** | `/categories` | Exactly 2 active divisions: `Farm Machines` and `Metals`. |
| 4 | **Warehouse** | `/warehouse` | **1 is Base**: Dedicated control center for `Main Base Warehouse (BASE-01)`. |
| 5 | **History** | `/history` | **Who buy and add products**: Unified ledger tracking customer sales (deductions) and vendor restocks (additions). |
| 6 | **Suppliers** | `/suppliers` | Industrial machinery and metallurgical suppliers with order history and contact details. |
| 7 | **Users** | `/users` | Role-Based Access Control (**Admin**, **Manager**, **Staff**) with secure password management. |
| 8 | **Settings** | `/settings` | Base Warehouse configuration, company branding, and security credentials update. |
---

## 3. Default Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@gmail.com` | `123456` | Full administrative access to users, settings, and inventory |
| **Manager** | `manager@gmail.com` | `123456` | Manage products, categories, stock, suppliers, and view logs |
| **Staff** | `staff@gmail.com` | `123456` | Record customer sales (Buy) and stock additions (Add) |

---

## 5. Technology Stack

- **Frontend**: React 19, Tailwind CSS v4, Lucide React, Axios, React Router v7, Recharts.
- **Backend**: Node.js 20 LTS, Express 5, `pg` (PostgreSQL Connection Pooling), `bcryptjs`, `jsonwebtoken`, `helmet`, `prom-client`.
- **Database**: PostgreSQL 16 (Atomic transactions, strict foreign keys, check constraints preventing negative stock).
- **Media Engine**: Cloudinary Media API with automatic local disk fallback (`uploads/`).
- **DevOps & Infrastructure**:
  - **Docker & Docker Compose**: Multi-stage production container images.
  - **Nginx Reverse Proxy**: Rate-limited gateway with Gzip and security headers.
  - **CI/CD**: GitHub Actions pipeline for linting, automated unit testing, Docker image building, and GHCR registry push.
  - **Kubernetes**: Production manifests (Deployments, Services, ConfigMaps, Secrets, Ingress, Kustomize).
  - **Observability**: Prometheus metrics scraping (`/metrics`) and Grafana monitoring dashboards.

---

## 6. Running with Docker Compose

Deploy the complete multi-tier production stack (Postgres + Backend API + React Frontend + Nginx Gateway) in 1 command:

```bash
# Build and start all services in detached mode
docker-compose up --build -d

# Check running container health status
docker-compose ps
```

Access Points:
- **Application Web Portal**: `http://localhost` (Port 80)
- **Direct Backend API**: `http://localhost:5000/api`
- **Health Check**: `http://localhost/health`
- **Prometheus Telemetry**: `http://localhost/metrics`

### Optional: Launch Monitoring Stack (Prometheus + Grafana)
```bash
docker-compose --profile monitoring up -d
```
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001` (Credentials: `admin` / `admin123`)

---

## 7. GitHub Actions CI/CD Pipeline

The automated workflow located at `.github/workflows/ci-cd.yml` executes on every push and pull request:

1. **Lint & Automated Tests**:
   - Executes backend unit test suite (`npm --prefix backend test`).
   - Executes frontend code quality check (`npm --prefix frontend run lint`).
   - Runs production asset compilation (`npm --prefix frontend run build`).
2. **Container Build & Registry Publishing**:
   - Builds multi-stage Docker images with build caching (`type=gha`).
   - Tags and publishes images to GitHub Container Registry (`ghcr.io`).
3. **Continuous Deployment (CD)**:
   - Validates Kubernetes resource manifests using `kubectl apply --dry-run=client -k k8s/`.
   - Triggers rolling deployment update in Kubernetes cluster.

---

## 9. Kubernetes Deployment

Production manifests are structured in the `k8s/` directory.

### Quick Deploy with Kustomize
```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create the production secret
kubectl create secret generic stock-backend-secrets \
  --namespace stock-system \
  --from-literal=DB_URL='postgresql://postgres:password@postgres-service:5432/stock_management' \
  --from-literal=JWT_SECRET='your-production-secret-key-32-chars' \
  --from-literal=POSTGRES_PASSWORD='password'

# 3. Apply all workloads (Deployments, Services, ConfigMaps, Ingress)
kubectl apply -k k8s/

# 4. Verify pod status
kubectl get pods -n stock-system
```

---

