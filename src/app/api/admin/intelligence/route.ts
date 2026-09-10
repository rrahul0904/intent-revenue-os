import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { getSourceConfiguration } from "@/adapters/sources/registry";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { listIngestionRunsForActor } from "@/repositories/ingestion-runs";
import { listSourceCandidatesForActor } from "@/repositories/source-candidates";
import {
  getQueueSummaryForActor,
  listQueueJobsForActor,
} from "@/repositories/jobs";

export async function GET(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({
      persistent: false,
      sources: getSourceConfiguration(),
      queue: {
        queued: 0,
        running: 0,
        retry: 0,
        succeeded: 0,
        dead_letter: 0,
      },
      jobs: [],
      runs: [],
      candidates: [],
    });
  }

  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = params.get("workspaceId");

    if (!workspaceId || !z.string().uuid().safeParse(workspaceId).success) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const [queue, jobs, runs, candidates] = await Promise.all([
      getQueueSummaryForActor(actor.userId, workspaceId),
      listQueueJobsForActor(actor.userId, workspaceId, 30),
      listIngestionRunsForActor(actor.userId, workspaceId, 30),
      listSourceCandidatesForActor(actor.userId, workspaceId, 30),
    ]);

    return NextResponse.json({
      persistent: true,
      sources: getSourceConfiguration(),
      queue,
      jobs,
      runs,
      candidates,
    });
  } catch (error) {
    return apiError(error);
  }
}
