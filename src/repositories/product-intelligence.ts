import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  auditEvents,
  productProfiles,
  products,
  websiteSnapshots,
} from "@/db/schema";
import type { ProductProfile } from "@/lib/types";
import type { WebsiteSnapshotData } from "@/adapters/web/website-fetcher";

export async function getProductSystem(productId: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return product;
}

export async function persistWebsiteSnapshot(
  productId: string,
  snapshot: WebsiteSnapshotData,
) {
  const db = getDb();
  const inserted = await db
    .insert(websiteSnapshots)
    .values({
      productId,
      url: snapshot.url,
      statusCode: snapshot.statusCode,
      contentType: snapshot.contentType,
      title: snapshot.title,
      description: snapshot.description,
      textContent: snapshot.textContent,
      contentHash: snapshot.contentHash,
    })
    .onConflictDoNothing({
      target: [websiteSnapshots.productId, websiteSnapshots.contentHash],
    })
    .returning();

  if (inserted[0]) return { snapshot: inserted[0], created: true };

  const [existing] = await db
    .select()
    .from(websiteSnapshots)
    .where(eq(websiteSnapshots.productId, productId))
    .orderBy(desc(websiteSnapshots.fetchedAt))
    .limit(1);

  if (!existing) throw new Error("Unable to persist website snapshot");
  return { snapshot: existing, created: false };
}

export async function persistDiscoveredProductProfile(input: {
  productId: string;
  profile: ProductProfile;
  sourceHash: string;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!product) throw new Error("Not found");

    const [latest] = await tx
      .select()
      .from(productProfiles)
      .where(eq(productProfiles.productId, input.productId))
      .orderBy(desc(productProfiles.version))
      .limit(1);

    if (latest?.sourceHash === input.sourceHash) {
      await tx
        .update(products)
        .set({
          profile: input.profile,
          name: input.profile.name || product.name,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId));

      return { profileVersion: latest.version, changed: false };
    }

    const nextVersion = (latest?.version ?? 0) + 1;
    await tx.insert(productProfiles).values({
      productId: input.productId,
      version: nextVersion,
      profile: input.profile,
      sourceHash: input.sourceHash,
      model: "deterministic-website-intelligence",
      promptVersion: "phase2-v1",
    });

    await tx
      .update(products)
      .set({
        profile: input.profile,
        name: input.profile.name || product.name,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId));

    await tx.insert(auditEvents).values({
      workspaceId: product.workspaceId,
      actorId: "system:product-discovery",
      action: "product.intelligence_refreshed",
      entityType: "product",
      entityId: product.id,
      metadata: {
        profileVersion: nextVersion,
        sourceHash: input.sourceHash,
      },
    });

    return { profileVersion: nextVersion, changed: true };
  });
}
