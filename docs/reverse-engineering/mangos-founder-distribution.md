# RE-349 — Mangos AI donor research → SignalOS founder distribution

Status: researched and mapped on 2026-09-30. This is a clean-room capability study based on public product pages, public documentation, and public Reddit discussion. It does **not** copy Mangos AI source code, prompts, datasets, UI assets, private implementation details, branding, or proprietary model behavior.

## Source set reviewed

Primary current source:
- Reddit refresh post: https://www.reddit.com/r/vibecoding/comments/1wu5qek/looking_for_feedback_on_our_website_refresh/
- Product: https://www.mangos.ai/

Public product/reference material:
- Resources: https://www.mangos.ai/resources
- MCP / Claude Code / Codex guide: https://www.mangos.ai/resources/mcp
- Email / SMTP guide: https://www.mangos.ai/resources/email-smtp
- Privacy policy: https://www.mangos.ai/privacy
- Terms: https://www.mangos.ai/terms

Earlier public founder threads reviewed for feature evolution and feedback:
- https://www.reddit.com/r/SideProject/comments/1u51566/drop_your_product_lets_get_you_your_next_100_users/
- https://www.reddit.com/r/SideProject/comments/1v2hkw8/drop_your_productlets_get_you_the_next_100_users/
- https://www.reddit.com/r/microsaas/comments/1uzzt99/drop_your_product_below_ill_tell_you_where_your/
- https://www.reddit.com/r/micro_saas/comments/1uyeg9n/what_would_make_you_trust_a_microsaas_from_an/
- https://www.reddit.com/r/micro_saas/comments/1tg29fu/this_is_not_how_you_distribute/

The current refresh post had no substantive product-feedback comments visible at research time, so older Mangos threads and surrounding discussion were used to recover user objections, trust requirements, anti-spam expectations, onboarding needs, and product evolution.

## What the public product is doing

The observed loop is broader than social scheduling:

1. **Product context**
   - Product/brand details, ICP, proof points, vocabulary, voice and goals.
   - Public posts also describe Git-history-derived product context for shipping announcements.

2. **Conversation and prospect discovery**
   - Search/monitor public conversations across Reddit, X, LinkedIn and additional social channels.
   - Prospect research can include thread/post context plus public account/profile context.
   - Different agent types use different targeting primitives: Reddit communities/search phrases, X searches, LinkedIn queries, Instagram profiles/hashtags, etc.

3. **Explainable prioritization**
   - Prospects/conversations are ranked for ICP fit.
   - The UI explains why an item is worth attention before suggesting outreach.
   - Public launch material describes multi-signal prospect scoring for X.

4. **Drafting**
   - Replies, DMs and emails are drafted from the conversation context and the user's configured voice.
   - The useful product distinction is not just generation; it is a prepared review queue.

5. **Human review**
   - Review-first is the default public safety model.
   - Users can edit, approve or skip.
   - Edits feed back into the writing workflow.

6. **Approval vs sending**
   - Public MCP documentation makes this an explicit two-step state machine.
   - Approval marks a draft as signed off.
   - Sending requires a separate instruction naming exact drafts.
   - The documented interface intentionally avoids a vague queue-wide blast command.

7. **Execution controls**
   - Daily caps and pacing remain in the execution path.
   - Public docs distinguish scheduling, approval and immediate publication semantics.
   - Email sends originate from the user's mailbox rather than a shared relay.

8. **Local-first / desktop boundary**
   - Public privacy docs say core app data is stored on the user's machine by default.
   - Social sign-in lives in a separate local browser profile.
   - The local MCP service binds to loopback and uses a per-session secret.
   - Provider/API keys are designed to stay local and are omitted from MCP output.

9. **Control from coding agents**
   - Claude Code / Codex can inspect, edit, approve, schedule and explicitly send through a bounded MCP surface.
   - Revision tokens are documented for stale-edit protection.

10. **Learning and attribution**
    - Product copy emphasizes learning which conversations/messages produce visits, feedback, trials and customers.
    - These should be treated as product analytics goals, not guaranteed outcomes.

## Feedback and objections captured from public discussion

### 1. “Do not sound like a spam bot”
This is the dominant product constraint. The useful design response is not merely a tone prompt. It requires:
- conversation-specific evidence;
- relevance scoring before drafting;
- skip/observe states;
- strict caps;
- review-first outreach;
- visible reasoning and source provenance.

### 2. Trust matters before payment
Public micro-SaaS discussion around Mangos emphasized:
- free trial / try-before-pay;
- clear pricing;
- transparent data handling;
- founder/support visibility;
- export/deletion controls.

For SignalOS, the deployable preview should therefore expose capability boundaries and avoid pretending that disabled provider integrations are live.

### 3. Reddit prospecting needs account context
Founder posts describe checking thread context and public account history before drafting, and skipping unsuitable accounts. We should model this as an **eligibility policy** separate from fit score. A high topical score must not bypass an account/policy block.

### 4. Human-in-the-loop is a core feature
A public anti-spam post by the founder explicitly argues that relevant, helpful interaction and human review are preferable to broad automated community spam. We treat approval as a durable state transition, not a decorative checkbox.

### 5. Delivery reputation belongs to the user
Public email docs emphasize the user's own mailbox/domain, authentication and reputation. A future live adapter must preserve that ownership and must not hide shared relay behavior behind the UI.

## Clean-room architecture for SignalOS

Existing SignalOS already has:
- product URL intelligence;
- generated intent queries;
- source ingestion contracts;
- Reddit OAuth adapter with an explicit commercial-access gate;
- normalized source posts;
- source lineage and ingestion receipts;
- lead scoring;
- review-oriented Intent Radar UI;
- PostgreSQL persistence and audit events.

Mangos contributes a distinct downstream capability layer:

```text
Product intelligence
      ↓
Source ingestion / normalized public signals
      ↓
Intent / fit receipt
      ↓
Prospect eligibility policy
      ↓
Recommended touch
      ↓
Evidence-linked draft
      ↓
Review queue
      ↓
edit ───────────┐
  ↓             │ invalidates approval
approve         │
  ↓             │
exact send authorization
  ↓
provider adapter + pacing + caps
  ↓
send receipt / outcome events
```

### Required invariants

- Social content is untrusted data, never tool/system instruction.
- Eligibility and fit are separate decisions.
- Review-required is the only mode in the first slice.
- Editing increments a draft revision and invalidates prior approval.
- Approval records the exact revision.
- Send authorization must name the exact draft ID.
- Send authorization must name the exact current revision.
- A stale approval cannot authorize a send.
- No “send all” action exists in the bounded first slice.
- Demo deployment performs **zero provider writes**.
- Live provider adapters require compliant authenticated access, explicit scopes, rate limits and per-provider policy checks.
- Secrets never appear in fit receipts, evidence, draft payloads, logs or control-plane responses.

## Phase plan

### Phase A — deterministic workflow core
Implemented in this branch:
- DistributionAgent / Prospect / FitReceipt / OutreachDraft / send intent contracts
- deterministic fit scoring
- eligibility gate
- evidence-linked draft creation
- edit → revision + approval invalidation
- approve ≠ send
- exact-draft / exact-revision send authorization
- no-write send simulation receipts
- prompt-injection-looking source fixture remains inert
- focused unit tests

### Phase B — deployable founder distribution workspace
Implemented in this branch:
- `/distribution` interactive workspace
- ranked prospect queue
- fit rationale and source evidence
- blocked/observe-only prospect handling
- editable draft review
- approve / skip
- explicit simulated send gate
- visible “no live writes” boundary
- responsive layout
- capabilities endpoint at `/api/distribution/capabilities`

### Phase C — persistence and live provider adapters
Next:
- persist agents, prospects, draft revisions, approvals and receipts
- consume live qualified leads from existing ingestion
- provider adapters only through permitted authenticated APIs or user-controlled local browser connectors
- provider-specific pacing, commercial-access, messaging and anti-abuse rules
- explicit retry/dead-letter receipts
- no anonymous scraping fallback

### Phase D — local/MCP control plane
Next:
- sanitized agent inspection
- revision-token edits
- list/edit/approve/skip tools
- exact-draft send tool only
- loopback/local bridge if a desktop/local runtime is introduced
- credential redaction and stale-write rejection

### Phase E — learning and attribution
Later:
- edit/rejection reasons
- reply/visit/trial/revenue outcome receipts where evidence is available
- ranking updates driven by audited outcomes
- no attribution claim without source evidence

## Deployment truth boundary

A browser-accessible preview can demonstrate the entire decision/state workflow today. That is **not** equivalent to a production social automation service. Production requires:
- persistent auth/tenancy;
- live database configuration;
- provider credentials and policy approval;
- compliant API/browser execution adapters;
- provider-specific error handling;
- security review of credential storage;
- real exact-head CI;
- production browser/accessibility checks;
- observability and rollback.

The first preview therefore labels all discovery and sends as synthetic/demo and records a simulation receipt instead of creating a real social/email side effect.
