DO $$ BEGIN
  CREATE TYPE queue_job_status AS ENUM ('queued', 'running', 'retry', 'succeeded', 'dead_letter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE ingestion_run_status AS ENUM ('queued', 'running', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS website_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  status_code integer NOT NULL,
  content_type varchar(191),
  title text,
  description text,
  text_content text NOT NULL,
  content_hash varchar(64) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS website_snapshots_product_hash_uidx
  ON website_snapshots (product_id, content_hash);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS website_snapshots_product_fetched_idx
  ON website_snapshots (product_id, fetched_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS source_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  query_type varchar(32) NOT NULL,
  query_text text NOT NULL,
  community varchar(255),
  priority integer NOT NULL DEFAULT 50,
  enabled boolean NOT NULL DEFAULT true,
  origin varchar(32) NOT NULL DEFAULT 'generated',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS source_queries_product_platform_query_uidx
  ON source_queries (product_id, platform, query_text);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS source_queries_due_idx
  ON source_queries (enabled, next_run_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  query_id uuid REFERENCES source_queries(id) ON DELETE SET NULL,
  platform platform NOT NULL,
  status ingestion_run_status NOT NULL DEFAULT 'queued',
  cursor text,
  candidates_found integer NOT NULL DEFAULT 0,
  inserted_posts integer NOT NULL DEFAULT 0,
  error_code varchar(96),
  error_message text,
  metadata jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ingestion_runs_workspace_created_idx
  ON ingestion_runs (workspace_id, created_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ingestion_runs_query_created_idx
  ON ingestion_runs (query_id, created_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS queue_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type varchar(64) NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  status queue_job_status NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 50,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_owner varchar(191),
  leased_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS queue_jobs_idempotency_uidx
  ON queue_jobs (idempotency_key);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS queue_jobs_claim_idx
  ON queue_jobs (status, available_at, priority);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS queue_jobs_workspace_created_idx
  ON queue_jobs (workspace_id, created_at);
--> statement-breakpoint

ALTER TABLE source_posts
  ADD COLUMN IF NOT EXISTS content_hash varchar(64);
--> statement-breakpoint

ALTER TABLE source_posts
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;
--> statement-breakpoint

ALTER TABLE source_posts
  ADD COLUMN IF NOT EXISTS retrieved_at timestamptz NOT NULL DEFAULT now();
