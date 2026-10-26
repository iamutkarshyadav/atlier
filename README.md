# ATELIER — Solo Designer E-Commerce Monorepo

A scalable, production-grade monorepo architecture engineered for a solo designer's e-commerce platform. Built with **Turborepo**, **pnpm workspaces**, **Next.js 14+ (App Router)**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, Storage, SSR)**.

---

## 🏛️ System Architecture & Physical Separation

To avoid routing collisions, ensure isolated deployment pipelines, and maintain strict security boundaries, this system enforces **complete physical separation** between consumer shopping, administrative management, and delivery logistics:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ATELIER MONOREPO                              │
│                (Turborepo + pnpm Workspaces)                          │
└──────┬─────────────────────────┬───────────────────────────────┬───────┘
       │                         │                               │
       ▼                         ▼                               ▼
┌───────────────┐        ┌───────────────┐               ┌───────────────┐
│ apps/storefront│       │  apps/admin   │               │ apps/delivery │
│  (Port 3000)  │        │  (Port 3001)  │               │  (Port 3002)  │
│ Consumer Store│        │ Designer Portal│              │Courier Dispatch│
└──────┬────────┘        └───────┬───────┘               └───────┬───────┘
       │                         │                               │
       └─────────────────────────┼───────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │       Shared Packages         │
                 ├───────────────────────────────┤
                 │ • @repo/ui (Tailwind & UI)    │
                 │ • @repo/supabase (SSR & DB)   │
                 │ • @repo/config-typescript     │
                 │ • @repo/config-eslint         │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    Supabase Cloud     │
                     │  Postgres + SSR Auth  │
                     │  RLS Security Guard   │
                     └───────────────────────┘
```

---

## 📁 Repository Structure

```
├── apps/
│   ├── storefront/             # Port 3000: Public customer e-commerce store
│   │   ├── src/app/
│   │   │   ├── page.tsx        # Hero, featured designer collections
│   │   │   ├── shop/           # Product catalog with category filtering
│   │   │   ├── product/[id]/   # Product detail, material specifications
│   │   │   ├── cart/           # Shopping bag, quantity modifiers
│   │   │   └── checkout/       # Shipping destination & order review
│   │   └── package.json        # Imports @repo/ui, @repo/supabase
│   │
│   ├── admin/                  # Port 3001: Private studio owner operations
│   │   ├── src/
│   │   │   ├── middleware.ts   # Enforces Supabase admin authentication
│   │   │   └── app/
│   │   │       ├── login/      # Designer authentication page
│   │   │       └── (dashboard)/
│   │   │           ├── dashboard/  # Revenue KPIs, order pipeline, stock health
│   │   │           ├── inventory/  # Product creation, inline stock editor
│   │   │           ├── orders/     # Order fulfillment, courier assignment
│   │   │           └── customers/  # Patrons & user role management
│   │   └── package.json        # Imports @repo/ui, @repo/supabase
│   │
│   └── delivery/               # Port 3002: Courier & white-glove logistics portal
│       ├── src/
│       │   ├── middleware.ts   # Enforces Supabase delivery partner role
│       │   └── app/
│       │       ├── login/      # Courier authentication
│       │       ├── assigned-deliveries/         # Courier manifest & route filter
│       │       └── order/[id]/update-status/    # Live status & proof updater
│       └── package.json        # Imports @repo/ui, @repo/supabase
│
├── packages/
│   ├── supabase/               # Shared Supabase SSR clients, schema, and types
│   │   ├── src/
│   │   │   ├── types/          # Database TypeScript interfaces (products, orders, users)
│   │   │   ├── clients/        # Browser, Server SSR, and Edge Middleware clients
│   │   │   ├── utils/          # Query utilities (getProducts, updateOrderStatus, etc.)
│   │   │   └── index.ts        # Primary package exports
│   │   ├── schema.sql          # Complete DDL: Enums, tables, triggers, and RLS
│   │   └── package.json
│   │
│   ├── ui/                     # Shared Tailwind design system & React components
│   │   ├── src/components/     # Button, Input, Card, Badge, Table, Modal
│   │   ├── tailwind.preset.js  # Luxury designer color palette & styling tokens
│   │   └── package.json
│   │
│   ├── config-typescript/      # Shared tsconfig bases (base, nextjs, react-library)
│   └── config-eslint/          # Shared ESLint configurations
│
├── turbo.json                  # Turborepo task pipeline orchestration
├── pnpm-workspace.yaml         # pnpm workspace glob patterns
└── package.json                # Root package configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v18.18.0` or higher (recommended: `v20.x`)
- **pnpm**: `v9.0.0` or higher (`pnpm -v`)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
Copy `.env.example` to your apps or root `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup (Supabase)
Run the script in [`packages/supabase/schema.sql`](file:///packages/supabase/schema.sql) in your Supabase SQL Editor. It automatically provisions:
- `users` table synced with Supabase `auth.users` via trigger
- `products` table with stock tracking and category indexing
- `orders` and `order_items` tables with courier assignment
- Row Level Security (RLS) policies for customers, delivery partners, and studio admins
- Sample starter seed data

### 5. Run All Applications Concurrently
```bash
pnpm dev
```
Turborepo will start all three applications simultaneously:
- 🛍️ **Storefront**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Admin Portal**: [http://localhost:3001](http://localhost:3001)
- 🚚 **Delivery Logistics**: [http://localhost:3002](http://localhost:3002)

---

## 🔒 Security & Supabase SSR Middleware

Authentication is strictly isolated per application:

| Application | Access Control | Role Enforced | Middleware |
|---|---|---|---|
| **`storefront`** | Public read access | Any / Guest | None (Public) |
| **`admin`** | Restricted | `role = 'admin'` | `apps/admin/src/middleware.ts` |
| **`delivery`** | Restricted | `role = 'delivery'` | `apps/delivery/src/middleware.ts` |

All apps utilize `@repo/supabase/middleware` via `@supabase/ssr` to validate user sessions and database roles on Edge runtime prior to rendering protected routes.
