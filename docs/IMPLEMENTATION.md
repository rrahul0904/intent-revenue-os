# Intent Revenue OS — Implementation Guide

## 1. Target stack

### Application
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- server components by default
- client components only for interactive surfaces

### Data
- PostgreSQL
- Neon-compatible production database
- Drizzle ORM
- pgvector optional for semantic retrieval in later phases

### Authentication
- Clerk or Auth.js abstraction
- workspace membership + role checks enforced server-side

### Background work
Start with a durable managed queue/workflow system. The worker boundary must be separate from request/response APIs even if deployed from the same monorepo.

Job categories:
- PRODUCT_FETCH
- PRODUCT_ANALYZE
- SOURCE_DISCOVERY
- SOURCE_INGEST
- CANDIDATE_CLASSIFY
- COMMUNITY_RULE_REFRESH
- DRAFT_REPLY
- EXECUTION
- ATTRIBUTION

### AI
Provider abstraction with:
- fast structured classification model
- stronger fallback/reasoning model
- embedding model only where retrieval materially helps
- prompt registry
- model registry
- per-generation cost persistence

### Observability
- OpenTelemetry
- structured logs
- Sentry
- product analytics
- admin telemetry backed by persisted operational records

## 2. Repository shape

```text
intent-revenue-os/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   └── admin/
│   ├── components/
│   ├── db/
│   ├── domain/
│   ├── lib/
│   ├── repositories/
│   ├── services/
│   ├── adapters/
│   │   ├── sources/
│   │   ├── ai/
│   │   ├── email/
│   │   └── analytics/
│   └── workers/
├── extension/
├── mcp/
├── tests/
├── docs/
├── drizzle/
├── Dockerfile
└── docker-compose.yml
```

The current starter uses a smaller structure; grow into this layout as Phase 1-4 lands.

## 3. Domain model

### Workspace
Tenant boundary.

Fields:
- id
- name
- slug
- plan
- created_at

### Membership
- workspace_id
- user_id
- role
- created_at

### Product
- workspace_id
- name
- canonical_url
- status
- created_at
- updated_at

### ProductProfile
Versioned AI-derived intelligence:
- summary
- ICP
- jobs_to_be_done
- pains
- differentiators
- competitors
- categories
- target_roles
- buying_signals
- disqualifiers
- approved_at
- model
- prompt_version

### SourceQuery
A monitored signal definition:
- product_id
- platform
- query_type
- query_text
- community
- priority
- enabled
- last_run_at

### SourcePost
Canonical public source fact:
- platform
- external_id
- author
- community
- title
- body
- url
- published_at
- raw_payload_hash
- ingested_at

Unique key:
`(platform, external_id)`

### Lead
Product-specific interpretation of a SourcePost:
- product_id
- source_post_id
- score
- status
- rationale
- evidence
- recommended_action
- draft_reply
- classification_version
- created_at

Unique key:
`(product_id, source_post_id)`

### LeadScore
Store score components independently:
- problem_match
- buying_intent
- product_fit
- switching_intent
- urgency
- freshness
- confidence
- final_score

### AI Generation
Every generation must have:
- id
- purpose
- model
- provider
- prompt_version
- input_hash
- structured_output
- input_tokens
- output_tokens
- cached_tokens
- cost_usd
- latency_ms
- created_at

### CommunityRuleSnapshot
- platform
- community
- rules_raw
- rules_summary
- promotion_status
- link_policy
- disclosure_policy
- fetched_at
- source_url
- confidence

### ExecutionJob
- lead_id
- channel
- state
- approved_by
- approved_at
- idempotency_key
- attempts
- last_error
- started_at
- completed_at

### OutcomeEvent
- lead_id
- event_type
- anonymous_visitor_id or external attribution id
- value
- metadata
- occurred_at

## 4. First live-data vertical slice

### Step 1 — persistence
Implement:
- database client
- migrations
- workspace repository
- product repository
- lead repository
- source-post repository
- transaction helpers

Do not let React components issue SQL directly.

### Step 2 — authentication
Implement:
- sign in
- workspace bootstrap
- protected routes
- server-side membership checks

### Step 3 — product onboarding
Endpoint:
`POST /api/products`

Input:
```json
{
  "url": "https://example.com"
}
```

Workflow:
1. canonicalize URL
2. create product row
3. enqueue PRODUCT_FETCH
4. fetch allowed public product pages
5. extract readable text
6. hash source content
7. call product-analysis model
8. persist versioned ProductProfile
9. mark ready for human review

### Step 4 — query generation
Structured AI output:
```json
{
  "category_terms": [],
  "pain_phrases": [],
  "recommendation_phrases": [],
  "switching_phrases": [],
  "competitor_terms": [],
  "commercial_signals": [],
  "communities": []
}
```

Convert these into persisted SourceQuery rows.

### Step 5 — Reddit ingestion
Define interface:

```ts
interface SourceAdapter {
  search(query: SourceQuery, cursor?: string): Promise<SourcePage>;
  normalize(raw: unknown): NormalizedSourcePost;
}
```

The domain must not depend on provider-specific Reddit payload shapes.

### Step 6 — deduplication
For every normalized result:
1. compute canonical external key
2. upsert SourcePost
3. create candidate only when product/source pair is new
4. enqueue CANDIDATE_CLASSIFY

### Step 7 — classification
Use schema-enforced structured output:

```ts
type Classification = {
  relevant: boolean;
  problemMatch: number;
  buyingIntent: number;
  productFit: number;
  switchingIntent: number;
  urgency: number;
  confidence: number;
  rationale: string;
  evidence: string;
  recommendedAction: "public_reply" | "dm" | "observe";
};
```

Validation rule:
Evidence must be a faithful excerpt or exact pointer into the stored source content.

### Step 8 — scoring
The current baseline:

```text
28% problem match
24% buying intent
18% product fit
12% switching intent
10% urgency
 8% freshness
```

Do not freeze these weights permanently. Persist score versions and recalibrate from observed downstream outcomes.

### Step 9 — lead persistence
Only create a surfaced Lead when:
- relevant = true
- confidence passes threshold
- product/source pair is unique
- source content is not suppressed or deleted

### Step 10 — Intent Radar
Replace demo data with repository-backed queries.

Server-load:
- lead counts
- hot lead count
- average score
- newest opportunities

Client interactions:
- filters
- selection
- approval/ignore
- draft editing

## 5. API contract — initial

### Products
- POST /api/products
- GET /api/products
- GET /api/products/:id
- PATCH /api/products/:id

### Product intelligence
- GET /api/products/:id/profile
- POST /api/products/:id/profile/regenerate
- POST /api/products/:id/profile/approve

### Leads
- GET /api/leads
- GET /api/leads/:id
- PATCH /api/leads/:id
- POST /api/leads/:id/approve
- POST /api/leads/:id/ignore

### Operations
- GET /api/admin/health
- GET /api/admin/runs
- GET /api/admin/failures
- GET /api/admin/costs

## 6. Reliability requirements

### Idempotency
Required for:
- ingestion jobs
- classifier jobs
- draft generation
- execution

### Retry policy
Classify failures:
- transient
- rate limited
- provider outage
- malformed response
- permanent source removal
- policy-rejected

Do not retry permanent errors blindly.

### Queue safety
Use:
- leasing
- visibility timeout
- retry counter
- dead-letter state
- cancellation
- job correlation id

### Data correctness
- immutable raw source facts where practical
- version AI outputs instead of overwriting history
- record actor for every state change
- deterministic unique constraints at the database layer

## 7. Security

- secrets only in server-side environment variables
- scoped provider credentials
- encrypted sensitive integration tokens
- no social passwords
- strict tenant filters
- authorization checked server-side
- CSRF-safe mutation approach
- input schemas on every mutation
- rate limiting on public APIs
- auditable admin access

## 8. Cost control

Persist per-call AI cost.

Routing strategy:
1. deterministic filter
2. cheap relevance classifier
3. deeper classification only for likely matches
4. draft generation only for surfaced/selected leads
5. premium model only when quality threshold is not met

Track:
- cost / candidate
- cost / surfaced lead
- cost / approved lead
- cost / paid conversion

## 9. Testing strategy

### Unit
- scoring
- URL canonicalization
- dedupe keys
- status transitions
- cost calculation
- policy routing

### Integration
- repository/database tests
- queue claim/retry tests
- adapter normalization fixtures
- AI structured-output validation

### E2E
1. sign in
2. add product
3. approve profile
4. ingest fixture
5. classify lead
6. open radar
7. approve response
8. verify audit event

### Evaluation
Maintain a labeled lead set with:
- relevant/not relevant
- buying-intent bucket
- expected score band
- valid evidence span
- recommended action

Run evals before prompt/model changes are promoted.

## 10. Definition of done for Phase 1-4

The first core release is done only when:
- data persists;
- authentication and tenant isolation work;
- real Reddit data enters through an adapter;
- jobs are durable;
- each lead contains score + evidence + version metadata;
- operator failures are visible;
- AI costs are visible;
- tests cover the critical state transitions;
- the app can run in Docker and on the selected cloud environment.
