# Intent Revenue OS — Project Plan

## 1. Product vision

Build an AI-native revenue intelligence platform that continuously discovers high-intent public conversations, explains why each opportunity matters, recommends the safest next action, requires human approval for outbound execution, and learns from downstream conversion outcomes.

The product is inspired by the public problem category demonstrated by tools such as ReplyHey, but the implementation, information architecture, scoring model, UI, data model, and brand are original.

## 2. Primary users

### Founder / solo operator
Needs a daily list of the best conversations worth responding to without manually searching Reddit, X, LinkedIn, Hacker News, communities, or forums.

### Growth / demand generation team
Needs scalable signal monitoring, lead qualification, brand/competitor intelligence, safe reply drafting, campaign attribution, and team workflows.

### Sales / revenue team
Needs intent-qualified opportunities with context, evidence, urgency, ownership, CRM integration, and measurable revenue attribution.

### Agency
Needs multi-client workspaces, product-specific targeting, safe approvals, auditability, and client reporting.

## 3. Core jobs to be done

1. Understand what a product sells and who should care.
2. Generate high-recall buying-signal searches automatically.
3. Collect relevant public conversations from supported platforms.
4. Normalize, deduplicate, and enrich the candidate stream.
5. Score purchase intent, urgency, switching intent, and product fit.
6. Explain every score with source evidence.
7. Understand community rules and safe engagement options.
8. Draft a useful public reply or private outreach message.
9. Require explicit approval before execution by default.
10. Track reply, click, signup, trial, opportunity, and paid outcomes.
11. Learn which signals actually produce revenue.
12. Expose the platform through UI, API, and MCP.

## 4. MVP success definition

The first production-capable vertical slice is complete when a user can:

- sign in;
- create a workspace;
- add a product URL;
- receive a generated product intelligence profile;
- approve keywords, pains, competitors, and target communities;
- ingest real Reddit conversations;
- see deduplicated candidates;
- see an evidence-backed intent score;
- open a lead detail page;
- edit and approve a recommended reply;
- persist all state in Postgres;
- inspect ingestion and AI cost telemetry in an admin surface.

Autonomous posting is not required for the MVP.

## 5. Product surfaces

### User application
- Onboarding
- Intent Radar
- Lead Queue
- Lead Detail
- Product Intelligence
- Communities
- Competitors
- Brand Intelligence
- Content Opportunities
- Campaigns
- Conversations
- Analytics
- AI Agents / MCP
- Workspace Settings
- Billing

### Admin / operations
- Daily ingestion
- Source health
- Queue depth
- Failed jobs
- AI calls / model / prompt version
- Token usage and cost
- Lead score distribution
- False-positive review
- User registrations
- Active workspaces
- Product count
- Reply approvals
- Execution attempts
- Subscription and MRR metrics
- Infrastructure health

## 6. Architecture principles

- Modular monolith first; extract services only when load or ownership requires it.
- PostgreSQL remains the system of record.
- Raw source posts are immutable facts; product-specific leads are derived entities.
- Every AI classification stores structured evidence and prompt/model version.
- Ingestion and AI work run asynchronously through durable jobs.
- All external actions are idempotent.
- Human approval is the default execution policy.
- Costs are first-class telemetry.
- Platform adapters are isolated behind contracts.
- Demo mode is always available without third-party credentials.

## 7. Phase plan

### Phase 0 — Foundation
Status: initial draft implemented.

Deliverables:
- Next.js application shell
- Intent Radar demo UI
- typed lead and scoring domain
- health/leads/analyze API routes
- Drizzle schema
- Docker setup
- CI
- architecture and roadmap documentation

### Phase 1 — Persistent SaaS foundation
Deliverables:
- authentication
- workspaces and memberships
- product CRUD
- real Neon/Postgres connection
- migrations
- repository/data-access layer
- audit events
- protected application shell

Exit criteria:
All current demo flows persist and reload from Postgres.

### Phase 2 — Product intelligence
Deliverables:
- URL fetch/extraction
- page cleaning
- structured product profile generation
- ICP, pain, job-to-be-done and competitor extraction
- keyword/signal expansion
- human review screen
- prompt/model/cost telemetry

Exit criteria:
A user can paste a real product URL and receive a reviewable intelligence profile.

### Phase 3 — Reddit ingestion
Deliverables:
- source adapter contract
- Reddit provider implementation
- monitored-query scheduler
- durable candidate queue
- source normalization
- canonical post identity
- deduplication
- ingestion observability

Exit criteria:
New public Reddit candidates arrive automatically and are stored exactly once.

### Phase 4 — Intent intelligence
Deliverables:
- deterministic prefilters
- structured LLM classifier
- evidence extraction
- weighted score engine
- calibration/evaluation dataset
- score explanation UI
- false-positive review workflow

Exit criteria:
Every candidate receives a reproducible versioned classification with evidence.

### Phase 5 — Engagement intelligence
Deliverables:
- community rule snapshots
- policy classifier
- reply-vs-DM recommendation
- contextual draft generation
- voice/tone controls
- explicit approval workflow

Exit criteria:
A qualified lead can move from discovered to approved with a traceable decision path.

### Phase 6 — Execution
Deliverables:
- Manifest V3 browser extension
- execution job queue
- browser session checks
- idempotent state machine
- retry/rate-limit safeguards
- send verification
- audit events

Exit criteria:
An approved job can be executed safely without collecting a user's social password.

### Phase 7 — MCP and API ecosystem
Deliverables:
- scoped API keys
- MCP Streamable HTTP endpoint
- tools for products, leads, approvals, actions and analytics
- webhook events
- integration documentation

### Phase 8 — Revenue attribution
Deliverables:
- tracked links
- conversion events
- CRM/webhook ingestion
- signup/trial/paid attribution
- expected revenue scoring
- source/community conversion analytics

### Phase 9 — Multi-source expansion
Order:
1. X
2. LinkedIn
3. Hacker News
4. GitHub
5. Product Hunt
6. other compliant sources

## 8. Initial KPIs

### Product
- time to first qualified lead
- qualified leads / product / day
- hot-lead approval rate
- false-positive rate
- weekly active workspaces
- retained active workspaces

### Intelligence
- classifier precision
- classifier recall
- evidence-validity rate
- score-to-conversion calibration

### Revenue
- lead → reply
- reply → click
- click → signup
- signup → trial
- trial → paid
- revenue per 100 surfaced leads

### Operations
- candidates ingested / day
- deduplication rate
- queue latency
- failed job rate
- AI cost / qualified lead
- infrastructure cost / active workspace

## 9. Guardrails

- Do not scrape or automate against a platform in ways that violate applicable terms or law.
- Prefer official APIs or compliant data providers where practical.
- Store the minimum data required for product functionality.
- Never ask users for social-platform passwords.
- Preserve source URLs and evidence for explainability.
- Require confirmation for irreversible external actions.
- Implement suppression, retention, rate limiting, and deletion controls before scaling execution.

## 10. Near-term execution priority

The next engineering milestone is not another UI redesign. It is the first live-data path:

Product URL → persisted product intelligence → Reddit ingestion → candidate normalization → AI classification/evidence → persisted lead → Intent Radar.

That single path proves the core product before browser automation or additional social sources are introduced.
