import { desc, eq } from "drizzle-orm";
import { aiGenerations } from "@/db/schema";
import { getDb, getSql } from "@/db/client";
import type { ClassificationGenerationResult } from "@/domain/classification/types";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function recordGenerationSuccess(input: {
  workspaceId: string;
  candidateId: string;
  generation: ClassificationGenerationResult;
}) {
  const db = getDb();
  const [row] = await db
    .insert(aiGenerations)
    .values({
      workspaceId: input.workspaceId,
      candidateId: input.candidateId,
      purpose: "candidate_intent_classification",
      provider: input.generation.provider,
      model: input.generation.model,
      promptVersion: input.generation.promptVersion,
      requestHash: input.generation.requestHash,
      responseId: input.generation.responseId,
      status: "succeeded",
      inputTokens: input.generation.inputTokens,
      outputTokens: input.generation.outputTokens,
      cachedTokens: input.generation.cachedTokens,
      costMicros: input.generation.costMicros,
      latencyMs: input.generation.latencyMs,
      structuredOutput: input.generation.classification,
    })
    .returning();

  return row;
}

export async function recordGenerationFailure(input: {
  workspaceId: string;
  candidateId: string;
  provider: string;
  model: string;
  promptVersion: string;
  requestHash: string;
  errorCode: string;
  latencyMs: number;
}) {
  const db = getDb();
  const [row] = await db
    .insert(aiGenerations)
    .values({
      workspaceId: input.workspaceId,
      candidateId: input.candidateId,
      purpose: "candidate_intent_classification",
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      requestHash: input.requestHash,
      status: "failed",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costMicros: 0,
      latencyMs: input.latencyMs,
      errorCode: input.errorCode,
    })
    .returning();

  return row;
}

export async function listGenerationsForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select()
    .from(aiGenerations)
    .where(eq(aiGenerations.workspaceId, workspaceId))
    .orderBy(desc(aiGenerations.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getGenerationSummaryForActor(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const sql = getSql();
  const rows = await sql.unsafe(
    "select " +
      "count(*)::int as calls, " +
      "coalesce(sum(input_tokens),0)::bigint as input_tokens, " +
      "coalesce(sum(output_tokens),0)::bigint as output_tokens, " +
      "coalesce(sum(cached_tokens),0)::bigint as cached_tokens, " +
      "coalesce(sum(cost_micros),0)::bigint as cost_micros, " +
      "coalesce(avg(latency_ms),0)::numeric as avg_latency_ms, " +
      "count(*) filter (where status = 'failed')::int as failures " +
      "from ai_generations where workspace_id = $1::uuid",
    [workspaceId],
  );

  const row = rows[0] ?? {};
  return {
    calls: Number(row.calls ?? 0),
    inputTokens: Number(row.input_tokens ?? 0),
    outputTokens: Number(row.output_tokens ?? 0),
    cachedTokens: Number(row.cached_tokens ?? 0),
    costMicros: Number(row.cost_micros ?? 0),
    avgLatencyMs: Math.round(Number(row.avg_latency_ms ?? 0)),
    failures: Number(row.failures ?? 0),
  };
}
