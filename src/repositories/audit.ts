import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditEvents, memberships } from "@/db/schema";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function listAuditEventsForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select({
      id: auditEvents.id,
      workspaceId: auditEvents.workspaceId,
      actorId: auditEvents.actorId,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, auditEvents.workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .where(eq(auditEvents.workspaceId, workspaceId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
