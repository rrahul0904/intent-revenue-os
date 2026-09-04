# Delivery Roadmap

## Phase 0 — Foundation (this commit)
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

## Phase 1 — Persistent application
- Clerk/Auth.js workspace auth
- Real Postgres repositories and migrations
- Workspace/product CRUD
- Audit trail and role model
- Admin operations view

## Phase 2 — Intelligence ingestion
- Reddit source adapter first
- Scheduled collection and durable queue
- Deduplication and canonical source storage
- Product-intelligence website extraction
- Query expansion and community discovery

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
