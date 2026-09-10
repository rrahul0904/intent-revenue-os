import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, products, sourceQueries } from "@/db/schema";
import type { GeneratedSignalQuery } from "@/lib/types";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function upsertGeneratedQueries(
  productId: string,
  queries: GeneratedSignalQuery[],
) {
  const db = getDb();
  const persisted = [];

  for (const query of queries) {
    const [row] = await db
      .insert(sourceQueries)
      .values({
        productId,
        platform: "reddit",
        queryType: query.queryType,
        queryText: query.queryText,
        community: query.community ?? null,
        priority: query.priority,
        enabled: true,
        origin: "generated",
        nextRunAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          sourceQueries.productId,
          sourceQueries.platform,
          sourceQueries.queryText,
        ],
        set: {
          queryType: query.queryType,
          community: query.community ?? null,
          priority: query.priority,
          enabled: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    persisted.push(row);
  }

  return persisted;
}

export async function getSourceQuerySystem(queryId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: sourceQueries.id,
      productId: sourceQueries.productId,
      workspaceId: products.workspaceId,
      platform: sourceQueries.platform,
      queryType: sourceQueries.queryType,
      queryText: sourceQueries.queryText,
      community: sourceQueries.community,
      priority: sourceQueries.priority,
      enabled: sourceQueries.enabled,
      lastRunAt: sourceQueries.lastRunAt,
      nextRunAt: sourceQueries.nextRunAt,
    })
    .from(sourceQueries)
    .innerJoin(products, eq(sourceQueries.productId, products.id))
    .where(eq(sourceQueries.id, queryId))
    .limit(1);

  return row;
}

export async function listSourceQueriesForActor(
  userId: string,
  productId: string,
) {
  const db = getDb();

  return db
    .select({
      id: sourceQueries.id,
      productId: sourceQueries.productId,
      platform: sourceQueries.platform,
      queryType: sourceQueries.queryType,
      queryText: sourceQueries.queryText,
      community: sourceQueries.community,
      priority: sourceQueries.priority,
      enabled: sourceQueries.enabled,
      lastRunAt: sourceQueries.lastRunAt,
      nextRunAt: sourceQueries.nextRunAt,
      createdAt: sourceQueries.createdAt,
    })
    .from(sourceQueries)
    .innerJoin(products, eq(sourceQueries.productId, products.id))
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, products.workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .where(eq(sourceQueries.productId, productId))
    .orderBy(desc(sourceQueries.priority), desc(sourceQueries.createdAt));
}

export async function markSourceQueryRun(
  queryId: string,
  nextRunAt: Date,
) {
  const db = getDb();
  await db
    .update(sourceQueries)
    .set({
      lastRunAt: new Date(),
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(sourceQueries.id, queryId));
}

export async function requireSourceQueryForActor(
  userId: string,
  queryId: string,
) {
  const query = await getSourceQuerySystem(queryId);
  if (!query) throw new Error("Not found");
  await requireWorkspaceMembership(userId, query.workspaceId);
  return query;
}
