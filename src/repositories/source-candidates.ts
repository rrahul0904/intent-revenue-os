import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateClassifications,
  products,
  sourceCandidates,
  sourcePosts,
  sourceQueries,
} from "@/db/schema";
import type { CandidateClassificationContext } from "@/domain/classification/types";
import type { ProductProfile } from "@/lib/types";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export async function recordSourceCandidate(input: {
  workspaceId: string;
  productId: string;
  queryId: string;
  sourcePostId: string;
  ingestionRunId: string;
}) {
  const db = getDb();
  const [candidate] = await db
    .insert(sourceCandidates)
    .values({
      workspaceId: input.workspaceId,
      productId: input.productId,
      queryId: input.queryId,
      sourcePostId: input.sourcePostId,
      ingestionRunId: input.ingestionRunId,
    })
    .onConflictDoUpdate({
      target: [
        sourceCandidates.productId,
        sourceCandidates.sourcePostId,
        sourceCandidates.queryId,
      ],
      set: {
        ingestionRunId: input.ingestionRunId,
        lastSeenAt: new Date(),
      },
    })
    .returning();

  return candidate;
}

export async function getCandidateClassificationContextSystem(
  candidateId: string,
): Promise<CandidateClassificationContext | undefined> {
  const db = getDb();
  const [row] = await db
    .select({
      workspaceId: sourceCandidates.workspaceId,
      candidateId: sourceCandidates.id,
      productId: products.id,
      productName: products.name,
      productUrl: products.url,
      productProfile: products.profile,
      sourcePostId: sourcePosts.id,
      platform: sourcePosts.platform,
      community: sourcePosts.community,
      author: sourcePosts.author,
      title: sourcePosts.title,
      body: sourcePosts.body,
      sourceUrl: sourcePosts.url,
      publishedAt: sourcePosts.publishedAt,
      queryText: sourceQueries.queryText,
    })
    .from(sourceCandidates)
    .innerJoin(products, eq(sourceCandidates.productId, products.id))
    .innerJoin(sourceQueries, eq(sourceCandidates.queryId, sourceQueries.id))
    .innerJoin(sourcePosts, eq(sourceCandidates.sourcePostId, sourcePosts.id))
    .where(eq(sourceCandidates.id, candidateId))
    .limit(1);

  if (!row) return undefined;

  return {
    ...row,
    productProfile: row.productProfile as ProductProfile,
  };
}

export async function listUnclassifiedCandidates(
  classifierVersion: string,
  limit = 100,
) {
  const db = getDb();

  return db
    .select({
      id: sourceCandidates.id,
      workspaceId: sourceCandidates.workspaceId,
      lastSeenAt: sourceCandidates.lastSeenAt,
    })
    .from(sourceCandidates)
    .leftJoin(
      candidateClassifications,
      and(
        eq(candidateClassifications.candidateId, sourceCandidates.id),
        eq(candidateClassifications.classifierVersion, classifierVersion),
      ),
    )
    .where(isNull(candidateClassifications.id))
    .orderBy(desc(sourceCandidates.lastSeenAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function listSourceCandidatesForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select({
      id: sourceCandidates.id,
      productId: sourceCandidates.productId,
      productName: products.name,
      queryId: sourceCandidates.queryId,
      queryText: sourceQueries.queryText,
      sourcePostId: sourceCandidates.sourcePostId,
      platform: sourcePosts.platform,
      community: sourcePosts.community,
      author: sourcePosts.author,
      title: sourcePosts.title,
      body: sourcePosts.body,
      url: sourcePosts.url,
      publishedAt: sourcePosts.publishedAt,
      firstSeenAt: sourceCandidates.firstSeenAt,
      lastSeenAt: sourceCandidates.lastSeenAt,
    })
    .from(sourceCandidates)
    .innerJoin(products, eq(sourceCandidates.productId, products.id))
    .innerJoin(sourceQueries, eq(sourceCandidates.queryId, sourceQueries.id))
    .innerJoin(sourcePosts, eq(sourceCandidates.sourcePostId, sourcePosts.id))
    .where(eq(sourceCandidates.workspaceId, workspaceId))
    .orderBy(desc(sourceCandidates.lastSeenAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}
