import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ingestionRuns } from "@/db/schema";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function createIngestionRun(input: {
  workspaceId: string;
  productId: string;
  queryId: string;
  platform: "reddit" | "x" | "linkedin";
  cursor?: string | null;
}) {
  const db = getDb();
  const [run] = await db
    .insert(ingestionRuns)
    .values({
      workspaceId: input.workspaceId,
      productId: input.productId,
      queryId: input.queryId,
      platform: input.platform,
      status: "running",
      cursor: input.cursor ?? null,
      startedAt: new Date(),
    })
    .returning();

  return run;
}

export async function completeIngestionRun(input: {
  runId: string;
  candidatesFound: number;
  insertedPosts: number;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db
    .update(ingestionRuns)
    .set({
      status: "succeeded",
      candidatesFound: input.candidatesFound,
      insertedPosts: input.insertedPosts,
      metadata: input.metadata ?? {},
      completedAt: new Date(),
    })
    .where(eq(ingestionRuns.id, input.runId));
}

export async function failIngestionRun(input: {
  runId: string;
  errorCode: string;
  errorMessage: string;
}) {
  const db = getDb();
  await db
    .update(ingestionRuns)
    .set({
      status: "failed",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage.slice(0, 4000),
      completedAt: new Date(),
    })
    .where(eq(ingestionRuns.id, input.runId));
}

export async function listIngestionRunsForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.workspaceId, workspaceId))
    .orderBy(desc(ingestionRuns.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
