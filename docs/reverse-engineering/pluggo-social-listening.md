# RE-237 — Pluggo social listening and community discovery

Status: research/specification slice  
Canonical product: Intent Revenue OS  
Canonical repository: rrahul0904/intent-revenue-os  
Source thread: https://www.reddit.com/r/SideProject/s/ji7Sx2QChz  
Public product: https://pluggo.ai/  
Evidence date: 2026-09-24

## 1. Scope and clean-room boundary

This dossier reverse-engineers only publicly observable product behavior and maps the useful capabilities into Intent Revenue OS. It does not claim knowledge of Pluggo's private source code, infrastructure, prompts, ranking weights, database schema, model choices, or internal provider contracts.

The current public product is in maintenance mode and is not accepting normal new subscriptions. Public pages still expose enough product behavior to map the user journey, monitoring model, opportunity feed, community discovery, Slack workflow, analysis concepts, and free research surfaces.

## 2. Product identity

The originating Reddit post describes a tool that starts from a target customer's problem space, searches social networks for relevant communities and conversations, remembers which communities are productive, and helps the operator catch conversations where the product can genuinely help. Links generated in the thread resolve to Pluggo community-result pages.

Current Pluggo public materials position the product around AI-assisted social listening, brand monitoring, opportunity detection, community discovery, research, Slack alerts, and continuous filtering from operator feedback.

## 3. Observable end-to-end journey

### A. Product context
A user supplies company/product context, commonly beginning with a URL or brand/problem description.

### B. Monitoring setup
The system converts the context into monitoring terms, source queries, target-community hypotheses, and analysis rules. The user can refine what counts as relevant.

### C. Community discovery
The product searches for communities/pages/groups where the target audience is likely to discuss the relevant problem. Results can be ranked and surfaced as reusable monitoring targets.

### D. Source acquisition
Eligible public sources are monitored on a schedule or through supported provider mechanisms. Public Pluggo surfaces reference several social/community networks over time; the implementation must treat each source as an independent adapter with its own access policy rather than assume universal scraping access.

### E. Normalize and deduplicate
Provider-specific posts become a canonical conversation/post shape. Duplicate URLs, cross-posts, pagination replay, and scheduler retry must not create duplicate opportunities.

### F. AI analysis
Each conversation is evaluated against product context and monitoring rules. Useful output includes a relevance decision, intent, sentiment/context, evidence, matched rule/keyword, why the post matters, and a confidence/score representation.

### G. Opportunity inbox
Qualified signals enter a feed. Public UI evidence shows lead/opportunity cards, filtering by source/type/keyword, match/reason context, and lifecycle actions such as save/reply-style handling.

### H. Notification and workflow
High-value signals can be delivered to Slack. Delivery is a workflow surface, not the source of truth: the canonical opportunity and feedback record remains durable in the application.

### I. Assisted reply
The system can prepare a context-aware response suggestion. The operator remains responsible for whether and where to engage.

### J. Feedback loop
Save/ignore/replied and positive/negative signal feedback should become explicit events. Those events can tune rule thresholds, community priority, ranking, and future recommendations without mutating historical evidence.

### K. Research and analytics
The product family includes research-oriented surfaces plus analytics around mentions, sentiment, communities/sources, competitors/trends and share-of-voice style measurements.

## 4. Product surfaces to recreate as capabilities

1. Intent/opportunity radar
2. Community discovery/search
3. Community detail and monitoring target registry
4. Monitor configuration and custom analysis rules
5. Source ingestion health/status
6. Opportunity inbox with evidence and lifecycle
7. Slack delivery and feedback
8. Evidence-backed reply drafts
9. Research copilot/report view
10. Mentions/sentiment/source/community analytics
11. Share-of-voice/trend analysis
12. Selected public discovery/free-tool surfaces
13. Workspace, auth, audit, integration and billing/admin boundaries

## 5. Canonical mapping

Pluggo should not become a new standalone repository.

Intent Revenue OS already implements:
- product URL ingestion and website evidence capture;
- durable product profiles;
- signal/query generation;
- PostgreSQL persistence and tenancy;
- durable queue, leases, retries and dead-letter states;
- separate worker execution;
- authenticated Reddit OAuth search adapter;
- an explicit Reddit commercial-access/configuration gate;
- canonical source-post normalization;
- deduplication and cursor pagination;
- ingestion run/failure telemetry;
- an Intent Radar/dashboard foundation.

Pluggo therefore maps cleanly as a donor for the missing community-discovery, classification, workflow-feedback and social-listening analytics layers.

Adjacent repositories are references, not the destination:
- rrahul0904/n8n-automated-linkedin-engagement-oppurtunities-finder: legacy Buyer Intent Radar / workflow automation;
- rrahul0904/tractionmesh: broader growth/distribution operating system;
- rrahul0904/social-growth-os: broader content/social publishing loop.

## 6. Proposed domain model

These names describe our clean-room implementation, not Pluggo internals.

### Workspace and product
- Workspace
- ProductProfile
- ProductEvidenceSnapshot
- MonitoringPlan

### Sources and communities
- SourceConnection
- SourceAdapterCapability
- Community
- SourceCommunity
- CommunityCandidate
- CommunityEvidence
- CommunityScoreReceipt
- IngestionCursor
- IngestionRun

### Conversations and analysis
- SourcePost
- NormalizedConversation
- ClassificationReceipt
- RuleDefinition
- RuleEvaluation
- EvidenceSpan
- Opportunity
- OpportunityEvidence
- OpportunityTransition

### Engagement and feedback
- ReplyDraft
- ApprovalDecision
- DeliveryAttempt
- FeedbackEvent
- OutcomeEvent

### Research and analytics
- ResearchQuery
- ResearchReport
- MetricSnapshot
- ShareOfVoiceSnapshot
- TrendWindow

## 7. Key service boundaries

### ProductIntelligenceService
Turns product evidence into durable context and versioned monitoring inputs.

### CommunityDiscoveryService
Generates candidate communities, attaches evidence, scores candidates deterministically, and preserves score receipts.

### SourceAdapter
Provider-neutral interface for search/monitor/fetch with explicit capability flags, scopes, cursors and rate-limit metadata.

### IngestionScheduler
Creates idempotent jobs and respects provider-specific pacing.

### NormalizationService
Produces canonical source-post/conversation records and stable dedupe keys.

### ClassificationPipeline
Produces a versioned ClassificationReceipt containing decision, dimensions, evidence and model/rule metadata.

### AnalysisRuleEngine
Applies deterministic include/exclude rules before and after AI classification as appropriate.

### OpportunityService
Creates one durable opportunity for one accepted evidence identity and manages auditable transitions.

### NotificationRouter
Delivers opportunities through Slack or future channels using idempotency keys and retry/dead-letter behavior.

### ReplyDraftService
Creates evidence-linked drafts; it does not publish them by default.

### FeedbackService
Records explicit operator feedback as append-only events.

### AnalyticsAggregator
Builds mention, sentiment, community/source, share-of-voice, funnel and outcome metrics from durable facts.

### ResearchService
Runs bounded evidence-backed investigations and stores report provenance.

## 8. Adapter strategy

### First certified source: Reddit
Reuse the existing OAuth adapter and commercial-access gate. Phase A must work with deterministic fixtures when live credentials are absent.

### Later sources
X, Hacker News, Bluesky, Facebook, LinkedIn, YouTube, Discord, Mastodon, Slack/community directories or other networks can be considered only when the deployment has a compliant provider/API path, appropriate scopes and clear commercial usage permission.

There must be no silent anonymous-scraping fallback when an authenticated/commercial API boundary is required.

## 9. Safety, security and reliability

- Social posts are untrusted input and must never become system/tool instructions.
- Strip or isolate prompt-like content before model/tool orchestration.
- Keep workspace/tenant filters on every read and write.
- Do not put provider secrets, auth headers or raw tokens in receipts/logs/prompts.
- Apply request/response size bounds and provider timeouts.
- Respect rate limits and backoff.
- Maintain stable idempotency keys for ingestion, classification, opportunity creation and notification.
- Preserve source URL/provider/post ID and evidence lineage.
- Minimize stored PII and expose retention/deletion controls.
- Keep outbound engagement behind policy and human approval by default.
- Store AI/rule versions with classification receipts so historical decisions remain explainable.
- Make Slack/webhook actions replay-safe and auditable.

## 10. Feature delta from current Intent Revenue OS

### Already present
- product intelligence;
- query/signal generation;
- durable queue and worker;
- Reddit OAuth boundary;
- post normalization/deduplication;
- ingestion telemetry;
- persistent tenancy/product state;
- seeded radar experience.

### Pluggo-derived gaps
- durable Community/SourceCommunity registry;
- evidence-backed community candidate discovery;
- deterministic community ranking;
- structured ClassificationReceipt;
- rule DSL / custom analysis rules;
- opportunity state machine for unread/saved/replied/ignored;
- Slack notification plus feedback actions;
- reply drafting tied to evidence;
- learning from explicit feedback without rewriting history;
- mention/sentiment/source/community analytics;
- share-of-voice and trend windows;
- research copilot/reports;
- additional compliant source adapters;
- optional public community directory and free research tools.

## 11. Phased implementation

### Phase A — community and evidence contracts
Scope: no new external side effects.

Deliver:
- Community, SourceCommunity, CommunityCandidate and CommunityEvidence;
- ClassificationReceipt;
- OpportunityStatus / OpportunityTransition;
- FeedbackEvent;
- DeliveryAttempt contract;
- deterministic community scoring;
- normalized Reddit post -> classification receipt -> idempotent opportunity path;
- fixtures and focused tests.

Acceptance:
- same evidence replay cannot duplicate a community/opportunity;
- scoring is deterministic for fixed inputs;
- every accepted/rejected decision has a receipt;
- source provenance is retained;
- exact-head tests/CI pass.

### Phase B — classification, rules and inbox
Deliver structured relevance/intent/sentiment decisions, custom rules, filters and full inbox lifecycle.

### Phase C — Slack and feedback
Deliver idempotent Slack notification, signed/authorized feedback actions, retries, dead-letter handling and audit events.

### Phase D — assisted replies
Deliver evidence-backed reply suggestions and approval records. No automatic posting by default.

### Phase E — analytics
Deliver mention/sentiment/source/community metrics, share of voice, trend windows and conversion/outcome attribution.

### Phase F — research and discovery surfaces
Deliver research reports/citations, community directory/search and selected free/public tools.

### Phase G — additional source adapters
Add adapters one by one with explicit authentication, ToS/access checks, fixtures, rate limits and production certification.

## 12. Phase A implementation shape

Suggested additions should follow the repository's existing architecture instead of creating a parallel stack:

- database migration for community/evidence/receipt/opportunity-transition/feedback/delivery entities;
- domain types and repositories;
- deterministic community ranking module;
- classification receipt builder with provider-neutral AI metadata;
- idempotent promotion from accepted receipt to opportunity;
- API/admin surface to inspect receipts and community candidates;
- fixtures for accepted, rejected, duplicate and replayed Reddit posts;
- unit/integration tests around tenancy, idempotency and provenance.

The first PR after this dossier should remain bounded to Phase A. Slack, outbound replies, analytics and multi-source provider work should be separate follow-on slices.

## 13. Evidence notes

Public evidence reviewed on 2026-09-24:
- originating r/SideProject thread;
- Pluggo public homepage and product pages;
- Pluggo public community-result pages;
- Pluggo social-listening/community-discovery material;
- Pluggo terms/current source descriptions;
- publicly visible screenshots/search-result imagery.

Public materials from different dates list somewhat different source-network sets. Treat that as product evolution and configuration variability; do not hard-code a claim that every historical/current network is simultaneously active.

## 14. Definition of truthful status

This branch proves the donor has been mapped and the implementation delta is defined. It does **not** prove Pluggo parity, hosted behavior, live Slack delivery, live multi-platform monitoring, production provider credentials, or Phase A runtime implementation.
