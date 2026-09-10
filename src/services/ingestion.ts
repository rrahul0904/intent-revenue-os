import { SourceAdapterError } from "@/adapters/sources/types";
import { getSourceAdapter } from "@/adapters/sources/registry";
import {
  completeIngestionRun,
  createIngestionRun,
  failIngestionRun,
} from "@/repositories/ingestion-runs";
import { enqueueJob } from "@/repositories/jobs";
import { upsertSourcePost } from "@/repositories/source-posts";
import { recordSourceCandidate } from "@/repositories/source-candidates";
import {
  getSourceQuerySystem,
  markSourceQueryRun,
} from "@/repositories/source-queries";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function runSourceIngestion(
  queryId: string,
  cursor?: string | null,
) {
  const query = await getSourceQuerySystem(queryId);
  if (!query) throw new Error("Not found");
  if (!query.enabled) {
    throw new SourceAdapterError("Source query is disabled", {
      code: "SOURCE_QUERY_DISABLED",
      retryable: false,
    });
  }

  const adapter = getSourceAdapter(query.platform);
  const run = await createIngestionRun({
    workspaceId: query.workspaceId,
    productId: query.productId,
    queryId: query.id,
    platform: query.platform,
    cursor,
  });

  try {
    const page = await adapter.search(
      {
        id: query.id,
        platform: query.platform,
        queryText: query.queryText,
        community: query.community,
      },
      cursor,
    );

    let insertedPosts = 0;
    for (const item of page.items) {
      const persisted = await upsertSourcePost(item);
      if (persisted.inserted) insertedPosts += 1;

      await recordSourceCandidate({
        workspaceId: query.workspaceId,
        productId: query.productId,
        queryId: query.id,
        sourcePostId: persisted.id,
        ingestionRunId: run.id,
      });
    }

    const nextRunAt = new Date(Date.now() + SIX_HOURS_MS);
    await markSourceQueryRun(query.id, nextRunAt);

    if (page.after) {
      await enqueueJob({
        workspaceId: query.workspaceId,
        type: "SOURCE_INGEST",
        payload: {
          queryId: query.id,
          cursor: page.after,
        },
        idempotencyKey:
          "source-ingest:" + query.id + ":cursor:" + page.after,
        priority: Math.max(1, query.priority - 5),
      });
    }

    await completeIngestionRun({
      runId: run.id,
      candidatesFound: page.items.length,
      insertedPosts,
      metadata: {
        after: page.after,
        adapter: query.platform,
        ...page.metadata,
      },
    });

    return {
      runId: run.id,
      candidatesFound: page.items.length,
      insertedPosts,
      after: page.after,
    };
  } catch (error) {
    const code =
      error instanceof SourceAdapterError
        ? error.code
        : "SOURCE_INGESTION_ERROR";
    const message =
      error instanceof Error ? error.message : "Unknown source ingestion error";

    await failIngestionRun({
      runId: run.id,
      errorCode: code,
      errorMessage: message,
    });

    throw error;
  }
}
