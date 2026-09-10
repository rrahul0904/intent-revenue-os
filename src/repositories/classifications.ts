import { desc, eq } from "drizzle-orm";
import { candidateClassifications } from "@/db/schema";
import { getDb } from "@/db/client";
import type { FinalIntentClassification } from "@/domain/classification/types";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function getCandidateClassification(
  candidateId: string,
  classifierVersion: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(candidateClassifications)
    .where(eq(candidateClassifications.candidateId, candidateId))
    .orderBy(desc(candidateClassifications.createdAt))
    .limit(1);

  if (row?.classifierVersion === classifierVersion) return row;
  return undefined;
}

export async function persistCandidateClassification(input: {
  workspaceId: string;
  candidateId: string;
  generationId: string | null;
  classifierVersion: string;
  classification: FinalIntentClassification;
}) {
  const db = getDb();
  const inserted = await db
    .insert(candidateClassifications)
    .values({
      workspaceId: input.workspaceId,
      candidateId: input.candidateId,
      generationId: input.generationId,
      classifierVersion: input.classifierVersion,
      relevant: input.classification.relevant,
      confidence: input.classification.confidence,
      score: input.classification.score,
      rationale: input.classification.rationale,
      evidence: input.classification.evidence,
      breakdown: input.classification.breakdown,
      recommendedAction: input.classification.recommendedAction,
      draftReply: input.classification.draftReply,
    })
    .onConflictDoNothing({
      target: [
        candidateClassifications.candidateId,
        candidateClassifications.classifierVersion,
      ],
    })
    .returning();

  if (inserted[0]) return { row: inserted[0], created: true };

  const [existing] = await db
    .select()
    .from(candidateClassifications)
    .where(eq(candidateClassifications.candidateId, input.candidateId))
    .orderBy(desc(candidateClassifications.createdAt))
    .limit(1);

  if (!existing) throw new Error("Unable to persist candidate classification");
  return { row: existing, created: false };
}

export async function listClassificationsForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select()
    .from(candidateClassifications)
    .where(eq(candidateClassifications.workspaceId, workspaceId))
    .orderBy(desc(candidateClassifications.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
