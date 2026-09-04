import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditEvents, memberships, workspaces } from "@/db/schema";
import { slugify } from "@/lib/slug";

export class WorkspaceAccessError extends Error {
  status = 403;

  constructor(message = "You do not have access to this workspace") {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

export async function listWorkspacesForUser(userId: string) {
  const db = getDb();

  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: memberships.role,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(workspaces.createdAt));
}

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const db = getDb();
  const [membership] = await db
    .select({
      id: memberships.id,
      workspaceId: memberships.workspaceId,
      userId: memberships.userId,
      role: memberships.role,
    })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId)))
    .limit(1);

  return membership;
}

export async function requireWorkspaceMembership(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new WorkspaceAccessError();
  }
  return membership;
}

export async function createWorkspace(name: string, userId: string) {
  const db = getDb();
  const slug = `${slugify(name)}-${randomUUID().slice(0, 6)}`;

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name, slug })
      .returning();

    await tx.insert(memberships).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    await tx.insert(auditEvents).values({
      workspaceId: workspace.id,
      actorId: userId,
      action: "workspace.created",
      entityType: "workspace",
      entityId: workspace.id,
      metadata: { name, slug },
    });

    return workspace;
  });
}

export async function ensureActorWorkspace(userId: string, suggestedName: string) {
  const existing = await listWorkspacesForUser(userId);
  if (existing.length > 0) {
    return { workspace: existing[0], created: false };
  }

  const workspace = await createWorkspace(suggestedName, userId);
  return {
    workspace: { ...workspace, role: "owner" as const },
    created: true,
  };
}
