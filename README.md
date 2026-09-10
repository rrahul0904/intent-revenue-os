# SignalOS — Intent Revenue OS

An AI-native revenue intelligence platform for discovering high-intent public conversations, explaining why each opportunity matters, recommending the safest next action, and learning which signals actually produce revenue.

This project is an original implementation in the same problem category as ReplyHey. It does not copy ReplyHey source code, proprietary data, branding, or private implementation details.

## Current status

### Phase 0 — product foundation
Complete:
- responsive Intent Radar dashboard
- seeded Reddit / X / LinkedIn opportunities
- explainable 0–100 lead scoring
- evidence + score dimensions
- approval / ignore workflow
- credential-free product analysis demo
- health and lead APIs

### Phase 1 — persistent SaaS foundation
Implemented:
- PostgreSQL persistence via Drizzle + `postgres`
- checksum-protected SQL migrations
- workspace + membership tenancy
- tenant-safe product persistence
- versioned product-profile storage
- actor/session abstraction
- audit events
- persistent workspace/product APIs
- database-aware health checks
- admin bootstrap / operations UI
- Docker migration-before-start workflow

Open `/admin` after starting with Docker Compose to initialize the first workspace and persist a product.

### Phase 2 — intelligence ingestion
Implemented:
- live public-website extraction with redirect re-validation, response limits, and private-network blocking
- persisted website snapshots and source hashes
- deterministic product-intelligence refresh from website evidence
- intent-signal/query generation
- source-query scheduling
- Postgres-backed durable queue with leases, idempotency, retries, and dead-letter states
- separate Docker worker process
- authenticated Reddit OAuth search adapter
- explicit Reddit commercial-access/configuration gate; no anonymous scraping fallback
- canonical source-post normalization and deduplication
- cursor pagination through separate idempotent jobs
- ingestion run/failure telemetry
- `/admin/intelligence` control plane
- migration verification in CI

Creating a persistent product now enqueues a `PRODUCT_FETCH` job automatically. The worker turns that product URL into a website snapshot, refreshed product profile, and generated intent queries.

Reddit collection remains intentionally disabled until the deployment has valid approved Data API access and explicitly sets the required environment variables.

## Documentation

- [Project Plan](docs/PROJECT_PLAN.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Implementation Guide](docs/IMPLEMENTATION.md)
- [Code Structure](docs/CODE_STRUCTURE.md)
- [Delivery Roadmap](docs/ROADMAP.md)
- [Phase 2 Ingestion Design](docs/PHASE_2_INGESTION.md)

## Core product flow

```text
Product URL
    ↓
Product Intelligence
    ↓
Signal / Query Generation
    ↓
Source Ingestion
    ↓
Normalize + Deduplicate
    ↓
Intent Classification
    ↓
Evidence-backed Scoring
    ↓
Community Policy Intelligence
    ↓
Opportunity Queue
    ↓
Human Approval
    ↓
Safe Execution
    ↓
Outcome / Revenue Attribution
    ↓
Closed-loop Ranking
```

## Persistent API surface

```text
POST /api/bootstrap
GET  /api/workspaces
POST /api/workspaces

GET  /api/products?workspaceId=...
POST /api/products
GET  /api/products/:id
PATCH /api/products/:id

GET  /api/admin/health
GET  /api/admin/audit?workspaceId=...
GET  /api/health
```

## Authentication boundary

Phase 1 ships with two explicit adapters:

- `AUTH_MODE=demo` — local development only
- `AUTH_MODE=trusted-header` — accepts identity injected by a trusted upstream auth gateway

Demo authentication is blocked in production unless `ALLOW_DEMO_AUTH_IN_PRODUCTION=true` is explicitly set. A managed identity provider such as Clerk can be added behind the same `requireActor()` boundary without changing repository/domain code.

## Local development

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

## Docker — recommended first run

```bash
docker compose up --build
```

Compose waits for Postgres, runs migrations, and only then starts the Next.js service.

Open:

- `http://localhost:3000` — Intent Radar
- `http://localhost:3000/admin` — persistent control plane

## Verification

```bash
npm run lint
npm test
npm run build
```

## Next milestone

Phase 2 is the first live intelligence path:

**Persisted source posts → Phase 3 structured intent classification → evidence extraction → persisted qualified leads → live Intent Radar.**
