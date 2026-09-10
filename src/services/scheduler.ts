import { isSourceConfigured } from "@/adapters/sources/registry";
import { enqueueJob } from "@/repositories/jobs";
import {
  listDueSourceQueries,
  markSourceQueryScheduled,
} from "@/repositories/source-queries";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function hourBucket(date: Date): string {
  return date.toISOString().slice(0, 13).replace(/[-T:]/g, "");
}

export async function scheduleDueSourceQueries(limit = 50) {
  const now = new Date();
  const due = await listDueSourceQueries(limit);
  let scheduled = 0;
  let skippedUnconfigured = 0;

  for (const query of due) {
    if (!isSourceConfigured(query.platform)) {
      skippedUnconfigured += 1;
      continue;
    }

    const result = await enqueueJob({
      workspaceId: query.workspaceId,
      type: "SOURCE_INGEST",
      payload: {
        queryId: query.id,
        cursor: null,
      },
      idempotencyKey:
        "source-ingest:" + query.id + ":scheduled:" + hourBucket(now),
      priority: query.priority,
    });

    await markSourceQueryScheduled(
      query.id,
      new Date(now.getTime() + SIX_HOURS_MS),
    );

    if (result.created) scheduled += 1;
  }

  return {
    due: due.length,
    scheduled,
    skippedUnconfigured,
  };
}
