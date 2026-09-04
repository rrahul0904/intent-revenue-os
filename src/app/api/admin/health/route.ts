import { NextResponse } from "next/server";
import { getAuthMode, requireActor } from "@/lib/auth";
import { hasDatabase, pingDatabase } from "@/db/client";
import { apiError } from "@/lib/http";
import { getOperationsSummaryForActor } from "@/repositories/operations";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);

    if (!hasDatabase()) {
      return NextResponse.json({
        status: "degraded",
        database: { configured: false, reachable: false },
        auth: { mode: getAuthMode(), actor: actor.userId },
        summary: { workspaces: 0, products: 0, leads: 0, auditEvents: 0 },
      });
    }

    const latencyMs = await pingDatabase();
    const summary = await getOperationsSummaryForActor(actor.userId);

    return NextResponse.json({
      status: "ok",
      database: { configured: true, reachable: true, latencyMs },
      auth: { mode: getAuthMode(), actor: actor.userId },
      summary,
    });
  } catch (error) {
    return apiError(error);
  }
}
