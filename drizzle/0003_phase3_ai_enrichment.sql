CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES source_candidates(id) ON DELETE SET NULL,
  purpose varchar(64) NOT NULL,
  provider varchar(64) NOT NULL,
  model varchar(191) NOT NULL,
  prompt_version varchar(64) NOT NULL,
  request_hash varchar(64) NOT NULL,
  response_id varchar(191),
  status varchar(32) NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cached_tokens integer NOT NULL DEFAULT 0,
  cost_micros integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  structured_output jsonb,
  error_code varchar(96),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ai_generations_workspace_created_idx
  ON ai_generations (workspace_id, created_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ai_generations_candidate_idx
  ON ai_generations (candidate_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS candidate_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES source_candidates(id) ON DELETE CASCADE,
  generation_id uuid REFERENCES ai_generations(id) ON DELETE SET NULL,
  classifier_version varchar(64) NOT NULL,
  relevant boolean NOT NULL,
  confidence integer NOT NULL,
  score integer NOT NULL,
  rationale text NOT NULL,
  evidence text NOT NULL,
  breakdown jsonb NOT NULL,
  recommended_action varchar(32) NOT NULL,
  draft_reply text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS candidate_classifications_candidate_version_uidx
  ON candidate_classifications (candidate_id, classifier_version);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS candidate_classifications_workspace_score_idx
  ON candidate_classifications (workspace_id, score);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS candidate_classifications_candidate_idx
  ON candidate_classifications (candidate_id);
--> statement-breakpoint

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS classification_id uuid REFERENCES candidate_classifications(id) ON DELETE SET NULL;
