import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", ["reddit", "x", "linkedin"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "approved", "replied", "ignored"]);
export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "member"]);
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "paused"]);
export const queueJobStatusEnum = pgEnum("queue_job_status", [
  "queued",
  "running",
  "retry",
  "succeeded",
  "dead_letter",
]);
export const ingestionRunStatusEnum = pgEnum("ingestion_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspaces_slug_uidx").on(table.slug),
]);

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 191 }).notNull(),
  role: membershipRoleEnum("role").default("member").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("memberships_workspace_user_uidx").on(table.workspaceId, table.userId),
  index("memberships_user_idx").on(table.userId),
]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  url: text("url").notNull(),
  status: productStatusEnum("status").default("draft").notNull(),
  profile: jsonb("profile").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("products_workspace_idx").on(table.workspaceId),
]);

export const productProfiles = pgTable("product_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  profile: jsonb("profile").notNull(),
  sourceHash: varchar("source_hash", { length: 128 }),
  model: varchar("model", { length: 191 }),
  promptVersion: varchar("prompt_version", { length: 64 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("product_profiles_product_version_uidx").on(table.productId, table.version),
]);

export const websiteSnapshots = pgTable("website_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  contentType: varchar("content_type", { length: 191 }),
  title: text("title"),
  description: text("description"),
  textContent: text("text_content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("website_snapshots_product_hash_uidx").on(table.productId, table.contentHash),
  index("website_snapshots_product_fetched_idx").on(table.productId, table.fetchedAt),
]);

export const sourceQueries = pgTable("source_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  queryType: varchar("query_type", { length: 32 }).notNull(),
  queryText: text("query_text").notNull(),
  community: varchar("community", { length: 255 }),
  priority: integer("priority").default(50).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  origin: varchar("origin", { length: 32 }).default("generated").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("source_queries_product_platform_query_uidx").on(
    table.productId,
    table.platform,
    table.queryText,
  ),
  index("source_queries_due_idx").on(table.enabled, table.nextRunAt),
]);

export const sourcePosts = pgTable("source_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: platformEnum("platform").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  community: varchar("community", { length: 255 }),
  author: varchar("author", { length: 255 }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull(),
  contentHash: varchar("content_hash", { length: 64 }),
  rawPayload: jsonb("raw_payload"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("source_posts_platform_external_uidx").on(table.platform, table.externalId),
]);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  queryId: uuid("query_id").references(() => sourceQueries.id, { onDelete: "set null" }),
  platform: platformEnum("platform").notNull(),
  status: ingestionRunStatusEnum("status").default("queued").notNull(),
  cursor: text("cursor"),
  candidatesFound: integer("candidates_found").default(0).notNull(),
  insertedPosts: integer("inserted_posts").default(0).notNull(),
  errorCode: varchar("error_code", { length: 96 }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("ingestion_runs_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("ingestion_runs_query_created_idx").on(table.queryId, table.createdAt),
]);

export const queueJobs = pgTable("queue_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  payload: jsonb("payload").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  status: queueJobStatusEnum("status").default("queued").notNull(),
  priority: integer("priority").default(50).notNull(),
  availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
  leaseOwner: varchar("lease_owner", { length: 191 }),
  leasedUntil: timestamp("leased_until", { withTimezone: true }),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("queue_jobs_idempotency_uidx").on(table.idempotencyKey),
  index("queue_jobs_claim_idx").on(table.status, table.availableAt, table.priority),
  index("queue_jobs_workspace_created_idx").on(table.workspaceId, table.createdAt),
]);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sourcePostId: uuid("source_post_id").notNull().references(() => sourcePosts.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  status: leadStatusEnum("status").default("new").notNull(),
  rationale: text("rationale").notNull(),
  evidence: text("evidence").notNull(),
  breakdown: jsonb("breakdown").notNull(),
  recommendedAction: varchar("recommended_action", { length: 32 }).notNull(),
  draftReply: text("draft_reply"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("leads_product_source_uidx").on(table.productId, table.sourcePostId),
  index("leads_product_score_idx").on(table.productId, table.score),
]);

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id", { length: 191 }).notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 191 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_events_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("audit_events_actor_idx").on(table.actorId),
]);
