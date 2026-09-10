# Phase 2 — Intelligence Ingestion

## Purpose

Phase 2 converts a persisted product URL into durable, auditable source intelligence. It deliberately stops before AI lead qualification; Phase 3 consumes the persisted source posts and performs structured intent/evidence classification.

## End-to-end flow

```text
POST /api/products
  → persist product
  → enqueue PRODUCT_FETCH
  → worker lease
  → validate public website target
  → fetch bounded HTML
  → persist website snapshot + SHA-256
  → refresh deterministic product profile
  → generate intent queries
  → persist source_queries
  → scheduler finds due configured queries
  → enqueue SOURCE_INGEST
  → worker calls authenticated source adapter
  → normalize source records
  → upsert source_posts by (platform, external_id)
  → record ingestion_runs
  → enqueue cursor continuation when present
```

## Durable queue

`queue_jobs` is a PostgreSQL-backed durable work queue. Workers claim one job with `FOR UPDATE SKIP LOCKED`, increment the attempt count, and attach a bounded lease.

Guarantees implemented:
- idempotency key uniqueness
- priority ordering
- lease expiration and recovery
- exponential retry backoff
- provider `Retry-After` support
- maximum attempts
- terminal dead-letter state
- workspace-scoped operator visibility

Current job types:
- `PRODUCT_FETCH`
- `SOURCE_INGEST`

Later phases add classification, drafting, execution, and attribution jobs without replacing the queue contract.

## Website intelligence

The website fetcher:
- permits only HTTP/HTTPS
- resolves hostnames before access
- blocks common loopback, private, link-local, carrier-grade NAT, and unique-local ranges
- re-validates every redirect target
- uses a request timeout
- caps response bytes
- accepts HTML content only
- removes executable/non-content sections before text extraction
- stores a content hash so unchanged snapshots do not create needless profile versions

For high-security production deployments, enforce an outbound egress proxy/firewall in addition to application-level SSRF defenses.

## Signal generation

Phase 2 intentionally uses deterministic query generation instead of pretending an LLM is present. It derives:
- pain searches
- recommendation searches
- switching searches
- competitor-alternative searches
- category searches

from the persisted website evidence and existing product profile. Phase 3 can add model-assisted expansion behind versioned prompts and evaluation gates.

## Reddit adapter

The external Reddit adapter uses the authenticated OAuth Data API search path. It has no anonymous scraping fallback.

The adapter reports configured only when all of these are true:
```text
REDDIT_API_ENABLED=true
REDDIT_COMMERCIAL_ACCESS_APPROVED=true
REDDIT_ACCESS_TOKEN=<valid token>
REDDIT_USER_AGENT=<identifying user agent>
```

Before enabling a commercial deployment, confirm the deployment's use is permitted under Reddit's current Developer/Data API terms and any required commercial agreement. Credentials are never returned by the admin API; only boolean readiness signals are exposed.

## Scheduling

Generated queries begin due immediately. The worker scheduler checks due queries and enqueues only sources whose adapters are configured. Successful scheduling advances `next_run_at` so repeated worker polling does not flood the queue. Each successful ingestion run records `last_run_at` and schedules the next cycle.

## Deduplication

`source_posts` has a database uniqueness constraint on:

```text
(platform, external_id)
```

Repeated discovery refreshes the stored content/hash/retrieval time without duplicating the canonical source record.

## Operator APIs

```text
POST /api/products/:id/discover
GET  /api/products/:id/queries
POST /api/ingestion/run
GET  /api/admin/intelligence?workspaceId=...
```

## Operator UI

`/admin/intelligence` provides:
- workspace/product scope
- product discovery enqueue
- generated query inventory
- Reddit readiness indicators
- manual source-run enqueue
- queue state counts
- recent queue jobs
- recent ingestion runs and errors

## CI verification

GitHub Actions starts PostgreSQL 17 and runs:

```text
npm install
npm run db:migrate
npm run db:verify
npm run lint
npm test
npm run build
```

This ensures migrations and the application compile together rather than testing only TypeScript in isolation.

## Phase 3 handoff

Phase 3 begins from durable `source_posts`. The required next flow is:

```text
source_post
  → deterministic prefilter
  → structured AI classification
  → faithful evidence extraction
  → versioned score
  → qualified lead
  → live Intent Radar
```
