import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditEvents, memberships, productProfiles, products } from "@/db/schema";
import { buildDemoProfile } from "@/lib/product-intelligence";
import { canonicalizeProductUrl, productNameFromUrl } from "@/lib/url";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function listProductsForActor(userId: string, workspaceId: string) {
  const db = getDb();

  return db
    .select({
      id: products.id,
      workspaceId: products.workspaceId,
      name: products.name,
      url: products.url,
      status: products.status,
      profile: products.profile,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, products.workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .where(eq(products.workspaceId, workspaceId))
    .orderBy(desc(products.createdAt));
}

export async function getProductForActor(userId: string, productId: string) {
  const db = getDb();
  const [product] = await db
    .select({
      id: products.id,
      workspaceId: products.workspaceId,
      name: products.name,
      url: products.url,
      status: products.status,
      profile: products.profile,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(
      memberships,
      and(
        eq(memberships.workspaceId, products.workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .where(eq(products.id, productId))
    .limit(1);

  return product;
}

export async function createProductForActor(input: {
  userId: string;
  workspaceId: string;
  url: string;
  name?: string;
}) {
  await requireWorkspaceMembership(input.userId, input.workspaceId);

  const db = getDb();
  const canonicalUrl = canonicalizeProductUrl(input.url);
  const name = input.name?.trim() || productNameFromUrl(canonicalUrl);
  const profile = buildDemoProfile(canonicalUrl);

  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        workspaceId: input.workspaceId,
        name,
        url: canonicalUrl,
        profile,
        status: "draft",
      })
      .returning();

    await tx.insert(productProfiles).values({
      productId: product.id,
      version: 1,
      profile,
      model: "deterministic-demo",
      promptVersion: "phase1-bootstrap",
    });

    await tx.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      actorId: input.userId,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      metadata: { name, url: canonicalUrl },
    });

    return product;
  });
}

export async function updateProductForActor(input: {
  userId: string;
  productId: string;
  name?: string;
  status?: "draft" | "active" | "paused";
}) {
  const current = await getProductForActor(input.userId, input.productId);
  if (!current) {
    throw new Error("Not found");
  }

  const db = getDb();
  const values: {
    name?: string;
    status?: "draft" | "active" | "paused";
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.name?.trim()) {
    values.name = input.name.trim();
  }
  if (input.status) {
    values.status = input.status;
  }

  const [updated] = await db
    .update(products)
    .set(values)
    .where(eq(products.id, current.id))
    .returning();

  await db.insert(auditEvents).values({
    workspaceId: current.workspaceId,
    actorId: input.userId,
    action: "product.updated",
    entityType: "product",
    entityId: current.id,
    metadata: {
      previous: { name: current.name, status: current.status },
      next: { name: updated.name, status: updated.status },
    },
  });

  return updated;
}
