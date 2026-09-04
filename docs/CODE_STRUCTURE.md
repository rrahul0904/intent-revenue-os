# Intent Revenue OS — Code Structure

## Current repository after Phase 1

```text
.
├── .env.example
├── .github/workflows/ci.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CODE_STRUCTURE.md
│   ├── IMPLEMENTATION.md
│   ├── PROJECT_PLAN.md
│   └── ROADMAP.md
├── drizzle/
│   └── 0000_phase1_persistence.sql
├── scripts/
│   └── migrate.mjs
├── src/
│   ├── app/
│   │   ├── admin/page.tsx
│   │   ├── api/
│   │   │   ├── admin/audit/route.ts
│   │   │   ├── admin/health/route.ts
│   │   │   ├── analyze/route.ts
│   │   │   ├── bootstrap/route.ts
│   │   │   ├── health/route.ts
│   │   │   ├── leads/route.ts
│   │   │   ├── products/route.ts
│   │   │   ├── products/[id]/route.ts
│   │   │   └── workspaces/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── admin-operations.tsx
│   │   └── intent-dashboard.tsx
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── http.ts
│   │   ├── mock-data.ts
│   │   ├── product-intelligence.ts
│   │   ├── scoring.ts
│   │   ├── slug.ts
│   │   ├── types.ts
│   │   └── url.ts
│   └── repositories/
│       ├── audit.ts
│       ├── operations.ts
│       ├── products.ts
│       └── workspaces.ts
├── tests/
│   ├── scoring.test.ts
│   ├── slug.test.ts
│   └── url.test.ts
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
└── ...
```

## Architectural boundaries

### `src/db`
Connection and schema only. UI and route handlers do not issue SQL directly.

### `src/repositories`
Tenant-aware persistence operations. Workspace membership checks live here so callers cannot accidentally bypass tenancy.

### `src/lib/auth.ts`
Single actor boundary. Today it supports explicit demo and trusted-header modes. Future Clerk/Auth0/SSO adapters should resolve into the same `Actor` shape.

### `src/app/api`
HTTP validation and response mapping. Business persistence remains in repositories.

### `src/components/admin-operations.tsx`
A Phase 1 operator surface for bootstrap, DB health, persisted products, and audit events.

### `drizzle` + `scripts/migrate.mjs`
SQL migrations are immutable after application. The runner records filename + SHA-256 checksum and refuses modified historical migrations.

## Phase 2 expansion

Add:

```text
src/
├── adapters/
│   ├── sources/
│   │   └── reddit/
│   └── web/
├── domain/
│   └── ingestion/
├── repositories/
│   ├── source-posts.ts
│   ├── source-queries.ts
│   └── ingestion-runs.ts
├── services/
│   ├── product-extraction.ts
│   └── query-generation.ts
└── workers/
    └── ingestion-worker.ts
```

## Engineering rule

Keep domain logic independent of Next.js and provider payloads. Source adapters normalize external data before the rest of the system sees it; repository functions enforce tenant boundaries; UI code consumes stable application contracts.
