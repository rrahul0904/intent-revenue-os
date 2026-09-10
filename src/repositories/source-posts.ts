import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcePosts } from "@/db/schema";
import type { NormalizedSourcePost } from "@/lib/types";

export async function upsertSourcePost(post: NormalizedSourcePost) {
  const db = getDb();

  const inserted = await db
    .insert(sourcePosts)
    .values({
      platform: post.platform,
      externalId: post.externalId,
      community: post.community,
      author: post.author,
      title: post.title,
      body: post.body,
      url: post.url,
      contentHash: post.contentHash,
      rawPayload: post.rawPayload,
      publishedAt: post.publishedAt,
      retrievedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [sourcePosts.platform, sourcePosts.externalId],
    })
    .returning({ id: sourcePosts.id });

  if (inserted[0]) {
    return { id: inserted[0].id, inserted: true };
  }

  const [updated] = await db
    .update(sourcePosts)
    .set({
      community: post.community,
      author: post.author,
      title: post.title,
      body: post.body,
      url: post.url,
      contentHash: post.contentHash,
      rawPayload: post.rawPayload,
      publishedAt: post.publishedAt,
      retrievedAt: new Date(),
    })
    .where(
      and(
        eq(sourcePosts.platform, post.platform),
        eq(sourcePosts.externalId, post.externalId),
      ),
    )
    .returning({ id: sourcePosts.id });

  if (!updated) throw new Error("Unable to upsert source post");
  return { id: updated.id, inserted: false };
}
