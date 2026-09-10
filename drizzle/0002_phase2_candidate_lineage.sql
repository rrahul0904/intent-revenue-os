CREATE TABLE IF NOT EXISTS source_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  query_id uuid NOT NULL REFERENCES source_queries(id) ON DELETE CASCADE,
  source_post_id uuid NOT NULL REFERENCES source_posts(id) ON DELETE CASCADE,
  ingestion_run_id uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS source_candidates_product_post_query_uidx
  ON source_candidates (product_id, source_post_id, query_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS source_candidates_workspace_last_seen_idx
  ON source_candidates (workspace_id, last_seen_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS source_candidates_product_post_idx
  ON source_candidates (product_id, source_post_id);
