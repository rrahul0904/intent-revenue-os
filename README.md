# SignalOS — Intent Revenue OS

An AI-native revenue intelligence platform for discovering high-intent public conversations, explaining why each opportunity matters, recommending the safest next action, and learning which signals actually produce revenue.

This project is an original implementation in the same problem category as ReplyHey. It does not copy ReplyHey source code, proprietary data, branding, or private implementation details.

## Initial foundation

The repository currently includes:

- responsive Intent Radar dashboard
- seeded Reddit / X / LinkedIn opportunities
- explainable 0–100 lead scoring
- score-dimension breakdown and evidence
- approval / ignore lead workflow
- credential-free product URL demo analysis
- `GET /api/leads`
- `GET /api/health`
- `POST /api/analyze`
- PostgreSQL / Drizzle domain schema
- Docker + Docker Compose shape
- unit tests
- GitHub Actions CI
- project plan, architecture, implementation guide, code structure, and roadmap

## Documentation

- [Project Plan](docs/PROJECT_PLAN.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Implementation Guide](docs/IMPLEMENTATION.md)
- [Initial Code Structure](docs/CODE_STRUCTURE.md)
- [Delivery Roadmap](docs/ROADMAP.md)

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

## Current implementation status

Phase 0 is an intentionally credential-free foundation. It demonstrates the product and domain model before external APIs are connected.

The next real engineering milestone is:

**Product URL → persisted product intelligence → Reddit ingestion → candidate normalization → AI classification/evidence → persisted lead → Intent Radar.**

## Local development

Local development is optional; the repository can be developed directly through GitHub/Codex workflows.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Docker

```bash
docker compose up --build
```

## Verification

```bash
npm run lint
npm test
npm run build
```

## Product direction

The long-term goal is not merely an AI reply generator. The system should become an **Intent Revenue OS** that connects discovery, intent evidence, action approval, execution, attribution, and conversion learning.
