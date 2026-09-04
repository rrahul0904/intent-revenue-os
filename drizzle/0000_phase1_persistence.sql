DO $$ BEGIN
  CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE platform AS ENUM ('reddit', 'x', 'linkedin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'approved', 'replied', 'ignored');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  slug varchar(180) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_uidx
  ON workspaces (slug);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id varchar(191) NOT NULL,
  role membership_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS memberships_workspace_user_uidx
  ON memberships (workspace_id, user_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS memberships_user_idx
  ON memberships (user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  url text NOT NULL,
  status product_status NOT NULL DEFAULT 'draft',
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS products_workspace_idx
  ON products (workspace_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS product_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version integer NOT NULL,
  profile jsonb NOT NULL,
  source_hash varchar(128),
  model varchar(191),
  prompt_version varchar(64),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS product_profiles_product_version_uidx
  ON product_profiles (product_id, version);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS source_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform NOT NULL,
  external_id varchar(255) NOT NULL,
  community varchar(255),
  author varchar(255),
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL,
  published_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS source_posts_platform_external_uidx
  ON source_posts (platform, external_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_post_id uuid NOT NULL REFERENCES source_posts(id) ON DELETE CASCADE,
  score integer NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  rationale text NOT NULL,
  evidence text NOT NULL,
  breakdown jsonb NOT NULL,
  recommended_action varchar(32) NOT NULL,
  draft_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS leads_product_source_uidx
  ON leads (product_id, source_post_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS leads_product_score_idx
  ON leads (product_id, score);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type varchar(64) NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id varchar(191) NOT NULL,
  action varchar(96) NOT NULL,
  entity_type varchar(64) NOT NULL,
  entity_id varchar(191),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx
  ON audit_events (workspace_id, created_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS audit_events_actor_idx
  ON audit_events (actor_id);
