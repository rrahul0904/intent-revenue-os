import { and, desc, eq, type SQL } from "drizzle-orm";
import {
  auditEvents,
  candidateClassifications,
  leadEvents,
  leads,
  memberships,
  products,
  sourcePosts,
} from "@/db/schema";
import { getDb } from "@/db/client";
import type {
  CandidateClassificationContext,
  FinalIntentClassification,
} from "@/domain/classification/types";
import type { Lead, LeadStatus, ScoreBreakdown } from "@/lib/types";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

function threshold(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

export function qualifiesAsLead(
  classification: FinalIntentClassification,
): boolean {
  return (
    classification.relevant &&
    classification.score >= threshold("LEAD_MIN_SCORE", 55) &&
    classification.confidence >= threshold("LEAD_MIN_CONFIDENCE", 55)
  );
}

export async function applyClassificationToLead(input: {
  context: CandidateClassificationContext;
  classificationId: string;
  classification: FinalIntentClassification;
}) {
  if (!qualifiesAsLead(input.classification)) {
    return { lead: null, surfaced: false };
  }

  const db = getDb();
  const inserted = await db
    .insert(leads)
    .values({
      productId: input.context.productId,
      sourcePostId: input.context.sourcePostId,
      classificationId: input.classificationId,
      score: input.classification.score,
      rationale: input.classification.rationale,
      evidence: input.classification.evidence,
      breakdown: input.classification.breakdown,
      recommendedAction: input.classification.recommendedAction,
      draftReply: input.classification.draftReply,
    })
    .onConflictDoUpdate({
      target: [leads.productId, leads.sourcePostId],
      set: {
        classificationId: input.classificationId,
        score: input.classification.score,
        rationale: input.classification.rationale,
        evidence: input.classification.evidence,
        breakdown: input.classification.breakdown,
        recommendedAction: input.classification.recommendedAction,
        draftReply: input.classification.draftReply,
        updatedAt: new Date(),
      },
    })
    .returning();

  const lead = inserted[0];
  if (!lead) throw new Error("Unable to upsert lead");

  return { lead, surfaced: true };
}

export async function listLeadsForActor(input: {
  userId: string;
  workspaceId: string;
  productId?: string | null;
  limit?: number;
}): Promise<Lead[]> {
  await requireWorkspaceMembership(input.userId, input.workspaceId);
  const db = getDb();
  const conditions: SQL[] = [eq(products.workspaceId, input.workspaceId)];
  if (input.productId) conditions.push(eq(products.id, input.productId));

  const rows = await db
    .select({
      id: leads.id,
      platform: sourcePosts.platform,
      community: sourcePosts.community,
      author: sourcePosts.author,
      title: sourcePosts.title,
      body: sourcePosts.body,
      url: sourcePosts.url,
      publishedAt: sourcePosts.publishedAt,
      score: leads.score,
      status: leads.status,
      rationale: leads.rationale,
      evidence: leads.evidence,
      recommendedAction: leads.recommendedAction,
      draftReply: leads.draftReply,
      breakdown: leads.breakdown,
    })
    .from(leads)
    .innerJoin(products, eq(leads.productId, products.id))
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, products.workspaceId),
        eq(memberships.userId, input.userId),
      ),
    )
    .innerJoin(sourcePosts, eq(leads.sourcePostId, sourcePosts.id))
    .leftJoin(
      candidateClassifications,
      eq(leads.classificationId, candidateClassifications.id),
    )
    .where(and(...conditions))
    .orderBy(desc(leads.score), desc(sourcePosts.publishedAt))
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 250));

  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    community: row.community || row.platform,
    author: row.author || "unknown",
    title: row.title,
    body: row.body,
    url: row.url,
    createdAt: row.publishedAt.toISOString(),
    score: row.score,
    status: row.status,
    rationale: row.rationale,
    evidence: row.evidence,
    recommendedAction:
      row.recommendedAction === "dm" || row.recommendedAction === "observe"
        ? row.recommendedAction
        : "public_reply",
    draftReply: row.draftReply || "",
    breakdown: row.breakdown as ScoreBreakdown,
  }));
}

export async function updateLeadForActor(input: {
  userId: string;
  leadId: string;
  status?: LeadStatus;
  draftReply?: string;
}) {
  const db = getDb();
  const [authorized] = await db
    .select({
      leadId: leads.id,
      workspaceId: products.workspaceId,
    })
    .from(leads)
    .innerJoin(products, eq(leads.productId, products.id))
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, products.workspaceId),
        eq(memberships.userId, input.userId),
      ),
    )
    .where(eq(leads.id, input.leadId))
    .limit(1);

  if (!authorized) throw new Error("Not found");

  const values: {
    status?: LeadStatus;
    draftReply?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.status) values.status = input.status;
  if (input.draftReply !== undefined) values.draftReply = input.draftReply;

  const [updated] = await db
    .update(leads)
    .set(values)
    .where(eq(leads.id, input.leadId))
    .returning();

  await db.insert(leadEvents).values({
    leadId: input.leadId,
    eventType: input.status ? "status_changed" : "draft_updated",
    payload: {
      actorId: input.userId,
      status: input.status,
    },
  });

  await db.insert(auditEvents).values({
    workspaceId: authorized.workspaceId,
    actorId: input.userId,
    action: "lead.updated",
    entityType: "lead",
    entityId: input.leadId,
    metadata: {
      status: input.status,
      draftUpdated: input.draftReply !== undefined,
    },
  });

  return updated;
}
