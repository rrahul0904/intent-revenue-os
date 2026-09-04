import {
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

export const sourcePosts = pgTable("source_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  platform: platformEnum("platform").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  community: varchar("community", { length: 255 }),
  author: varchar("author", { length: 255 }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("source_posts_platform_external_uidx").on(table.platform, table.externalId),
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
