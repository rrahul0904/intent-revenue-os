# Intent Revenue OS — Initial Code Structure

## Current repository

```text
.
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CODE_STRUCTURE.md
│   ├── IMPLEMENTATION.md
│   ├── PROJECT_PLAN.md
│   └── ROADMAP.md
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── leads/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── intent-dashboard.tsx
│   ├── db/
│   │   └── schema.ts
│   └── lib/
│       ├── mock-data.ts
│       ├── product-intelligence.ts
│       ├── scoring.ts
│       └── types.ts
├── tests/
│   └── scoring.test.ts
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

## What the starter code currently demonstrates

### Intent Radar
A high-density dashboard showing:
- opportunity count
- hot-intent count
- approvals
- average score
- platform/community metadata
- evidence
- score dimensions
- AI recommended action
- editable approval workflow

### Product analysis
`POST /api/analyze` currently returns deterministic demo intelligence from a supplied URL. It intentionally does not pretend to crawl or call an LLM yet.

### Leads API
`GET /api/leads` exposes seeded cross-platform examples so the UI can be developed before live ingestion exists.

### Health API
`GET /api/health` surfaces demo vs connected mode.

### Scoring
The scoring engine is deterministic, typed, and tested independently from the UI.

### Data model
The initial Drizzle schema already separates:
- workspaces
- products
- source posts
- product-specific leads
- lead lifecycle events

This separation is essential for future multi-product matching and reclassification.

## Planned structure expansion

As the project leaves demo mode, add:

```text
src/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   ├── admin/
│   └── api/
├── domain/
│   ├── products/
│   ├── leads/
│   ├── scoring/
│   ├── ingestion/
│   └── execution/
├── repositories/
├── services/
├── adapters/
│   ├── sources/
│   ├── ai/
│   ├── email/
│   └── billing/
└── workers/
```

And later:

```text
extension/
mcp/
evals/
fixtures/
scripts/
```

## Engineering rule

Keep domain logic independent of UI frameworks and source-provider payloads. Next.js routes, Reddit providers, Chrome extension code, and MCP handlers should call the same domain services rather than reimplementing business rules.
