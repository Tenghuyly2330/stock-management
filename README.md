# Enterprise Stock & Inventory Management System (StockSync)

A production-style, multi-warehouse inventory control and procurement tracking platform built with **React**, **Node.js**, **Express**, and **PostgreSQL**.

---

## System Architecture Overview

```
                                  +------------------------------+
                                  |     Client Web Browser       |
                                  |  (React 19, Tailwind CSS v4) |
                                  +---------------+--------------+
                                                  |
                                                  | HTTP / REST (JSON)
                                                  v
                                  +------------------------------+
                                  |     Express REST API         |
                                  |    (Node.js, Helmet, CORS)   |
                                  +---------------+--------------+
                                                  |
                                                  | Connection Pool (pg)
                                                  v
                                  +------------------------------+
                                  |     PostgreSQL Engine        |
                                  |   (Neon / Local Docker DB)   |
                                  +------------------------------+
```

---

## Project Structure

```
stock-management-system/
├── backend/
│   ├── scripts/
│   │   └── test-db.js               # CLI database health & latency test
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # PostgreSQL connection pool with SSL
│   │   │   └── env.js               # Validated environment configuration
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Global error handling middleware
│   │   │   ├── notFoundHandler.js   # 404 Route handler
│   │   │   └── requestLogger.js     # Morgan HTTP access logger
│   │   ├── routes/
│   │   │   ├── healthRoutes.js      # System & database health probes
│   │   │   └── index.js             # API route aggregator
│   │   ├── utils/
│   │   │   └── response.js          # Standardized JSON response helpers
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entry point & graceful shutdown
│   ├── .env.example                 # Backend environment template
│   ├── .env                         # Local environment secrets (Git-ignored)
│   └── package.json
│
├── frontend/
│   ├── public/                      # Static assets & icons
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js             # Pre-configured Axios instance + interceptors
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ConnectionBadge.jsx # Real-time DB & API health indicator
│   │   │   │   └── StatusCard.jsx      # KPI dashboard metric card
│   │   │   └── layout/
│   │   │       ├── DashboardLayout.jsx # Master layout wrapper
│   │   │       ├── Navbar.jsx          # Top bar with user profile & diagnostics
│   │   │       └── Sidebar.jsx         # Collapsible navigation drawer
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Production-grade status & analytics view
│   │   │   ├── PlaceholderPage.jsx  # Feature roadmap placeholder
│   │   │   └── NotFound.jsx         # 404 view
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx        # React Router v7 configuration
│   │   ├── App.jsx                  # Root component
│   │   ├── index.css                # Tailwind CSS v4 directives
│   │   └── main.jsx                 # Client entry point
│   ├── .env.example                 # Frontend environment template
│   ├── .env                         # Frontend environment settings (Git-ignored)
│   ├── vite.config.js               # Vite + Tailwind compiler setup
│   └── package.json
│
├── .gitignore                       # Enterprise ignore rules
├── package.json                     # Monorepo root scripts
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.x (Current: v24.21.0)
- npm >= 10.x
- PostgreSQL instance (Neon cloud database or local PostgreSQL)

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
DB_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
JWT_SECRET=super_secure_jwt_secret_key_stock_mgmt_2026_dev
JWT_EXPIRES_IN=24h
```

**Frontend (`frontend/.env`):**
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Terminal Commands & Scripts

### Test Database Connection
```bash
npm run test:db
# Or from backend directory:
cd backend && node scripts/test-db.js
```

### Start Backend Development Server (Port 5000)
```bash
npm run dev:backend
# Or:
cd backend && npm run dev
```

### Start Frontend Development Server (Port 3000)
```bash
npm run dev:frontend
# Or:
cd frontend && npm run dev
```

### Build Frontend for Production
```bash
npm run build:frontend
```

---

## Health Check Probes
- Server Uptime & Memory: `GET http://localhost:5000/api/health`
- Live PostgreSQL Ping: `GET http://localhost:5000/api/health/db`
