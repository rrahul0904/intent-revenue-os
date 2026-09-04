import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", ["reddit", "x", "linkedin"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "approved", "replied", "ignored"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  url: text("url").notNull(),
  profile: jsonb("profile").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
}, (table) => [index("source_posts_platform_external_idx").on(table.platform, table.externalId)]);

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
}, (table) => [index("leads_product_score_idx").on(table.productId, table.score)]);

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
