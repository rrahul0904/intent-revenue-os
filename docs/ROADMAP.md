# Delivery Roadmap

## Phase 0 — Foundation ✅
- Production-shaped Next.js app shell
- Original high-signal Intent Radar UI
- Product URL onboarding endpoint in deterministic demo mode
- Explainable weighted scoring engine
- Seed lead feed and approval-state interaction
- Typed domain objects
- Postgres/Drizzle control-plane schema
- Health and leads APIs
- Docker + Compose
- Unit tests + CI workflow

## Phase 1 — Persistent application ✅ core foundation
Implemented in `phase-1-persistent-saas`:

- Real Postgres runtime using `postgres` + Drizzle
- Checksum-tracked SQL migration runner
- Docker Compose database health checks and migration gate
- Workspace and membership model
- Product persistence and version-1 product profile persistence
- Tenant-safe workspace/product repositories
- Actor/session abstraction with explicit demo and trusted-header modes
- Workspace bootstrap API
- Workspace CRUD API
- Product CRUD API
- Audit event persistence
- Database-aware public health endpoint
- Tenant-scoped admin health/audit APIs
- `/admin` operations/bootstrap UI
- URL canonicalization and slug tests

Production identity-provider provisioning (for example Clerk) remains a deployment integration choice; the application boundary is already isolated behind `requireActor()`.

## Phase 2 — Intelligence ingestion ← NEXT
- Source adapter contract
- Reddit adapter first
- Scheduled collection and durable queue
- Deduplication and canonical source storage
- Product-intelligence website extraction
- Query expansion and community discovery
- Ingestion run/failure observability

## Phase 3 — AI enrichment
- Structured intent classifier
- Evidence extraction
- Draft generation
- Prompt/version registry
- Per-call token/cost telemetry
- Evaluation set and false-positive review loop

## Phase 4 — Policy + execution
- Community-rule snapshots
- Public-reply vs DM router
- Approval queue
- Manifest V3 extension
- Idempotency, locking, retry state machine, rate controls

## Phase 5 — Agent/API ecosystem
- MCP Streamable HTTP server
- Scoped API keys
- Claude/Codex/Cursor workflows
- Webhooks and outbound CRM events

## Phase 6 — Revenue intelligence
- Click/signup/trial/paid attribution
- Lead-to-revenue analytics
- Conversion-calibrated ranking
- Competitor and brand intelligence
- Content opportunity engine

## Phase 7 — Scale and operations
- Multi-source workers
- Queue partitioning and backpressure
- Retention controls
- Cost budgets and model routing
- SLOs, OpenTelemetry, error budgets
- Admin certification dashboard
