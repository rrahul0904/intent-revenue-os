import { count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditEvents, leads, memberships, products } from "@/db/schema";

export async function getOperationsSummaryForActor(userId: string) {
  const db = getDb();
  const workspaceRows = await db
    .select({ workspaceId: memberships.workspaceId })
    .from(memberships)
    .where(eq(memberships.userId, userId));

  const workspaceIds = workspaceRows.map((row) => row.workspaceId);

  if (workspaceIds.length === 0) {
    return {
      workspaces: 0,
      products: 0,
      leads: 0,
      auditEvents: 0,
    };
  }

  const [[workspaceCount], [productCount], [leadCount], [auditCount]] = await Promise.all([
    db.select({ value: count() }).from(memberships).where(eq(memberships.userId, userId)),
    db.select({ value: count() }).from(products).where(inArray(products.workspaceId, workspaceIds)),
    db
      .select({ value: count() })
      .from(leads)
      .innerJoin(products, eq(leads.productId, products.id))
      .where(inArray(products.workspaceId, workspaceIds)),
    db
      .select({ value: count() })
      .from(auditEvents)
      .where(inArray(auditEvents.workspaceId, workspaceIds)),
  ]);

  return {
    workspaces: Number(workspaceCount.value),
    products: Number(productCount.value),
    leads: Number(leadCount.value),
    auditEvents: Number(auditCount.value),
  };
}
