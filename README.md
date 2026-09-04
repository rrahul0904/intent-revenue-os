# SignalOS — Intent Revenue OS

A production-shaped starter for an AI intent-intelligence platform that discovers public buying signals, explains the evidence behind each opportunity, lets a human approve the response, and prepares the approved work for safe execution.

## What works in this foundation
- Responsive Intent Radar dashboard
- Seeded Reddit/X/LinkedIn opportunities
- Explainable 0-100 score with dimension breakdown
- Lead selection and approval/ignore state changes
- Product URL onboarding API (`POST /api/analyze`) in credential-free demo mode
- Lead API (`GET /api/leads`)
- Health API (`GET /api/health`)
- Drizzle schema for workspaces, products, source posts, leads, and events
- Docker/Compose production shape
- Unit tests and GitHub Actions CI

## Local development
```bash
cp .env.example .env.local
npm install
npm run dev
```
Open `http://localhost:3000`.

The UI deliberately works without a database or AI key so product development and demos never block on infrastructure credentials.

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

## Architecture
See `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.

## Next implementation milestone
Wire the existing schema to Postgres, add authentication/workspaces, then implement the Reddit ingestion adapter + durable candidate queue + persisted scoring/evidence pipeline. That creates the first true end-to-end live-data flow.
