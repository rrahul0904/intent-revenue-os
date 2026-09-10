import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { isSourceConfigured } from "@/adapters/sources/registry";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { enqueueJob } from "@/repositories/jobs";
import { requireSourceQueryForActor } from "@/repositories/source-queries";

const requestSchema = z.object({
  queryId: z.string().uuid(),
  force: z.boolean().optional(),
});

function minuteBucket(date: Date): string {
  return date.toISOString().slice(0, 16).replace(/[-T:]/g, "");
}

export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Persistent database is not configured" },
      { status: 503 },
    );
  }

  try {
    const actor = await requireActor(request);
    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Valid queryId is required" }, { status: 400 });
    }

    const query = await requireSourceQueryForActor(actor.userId, parsed.data.queryId);
    if (!query.enabled) {
      return NextResponse.json({ error: "Source query is disabled" }, { status: 409 });
    }

    if (!isSourceConfigured(query.platform)) {
      return NextResponse.json(
        {
          error:
            query.platform +
            " ingestion is not configured for this deployment",
        },
        { status: 409 },
      );
    }

    const key = parsed.data.force
      ? "source-ingest:" + query.id + ":manual:" + randomUUID()
      : "source-ingest:" + query.id + ":manual:" + minuteBucket(new Date());

    const queued = await enqueueJob({
      workspaceId: query.workspaceId,
      type: "SOURCE_INGEST",
      payload: { queryId: query.id, cursor: null },
      idempotencyKey: key,
      priority: query.priority + 5,
    });

    return NextResponse.json({
      data: {
        jobId: queued.job.id,
        created: queued.created,
        status: queued.job.status,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
