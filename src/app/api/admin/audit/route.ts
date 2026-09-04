import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { listAuditEventsForActor } from "@/repositories/audit";

export async function GET(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ data: [], persistent: false });
  }

  try {
    const actor = await requireActor(request);
    const params = new URL(request.url).searchParams;
    const workspaceId = params.get("workspaceId");
    const rawLimit = params.get("limit") || "50";

    if (!workspaceId || !z.string().uuid().safeParse(workspaceId).success) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const limit = Number.parseInt(rawLimit, 10);
    const data = await listAuditEventsForActor(
      actor.userId,
      workspaceId,
      Number.isFinite(limit) ? limit : 50,
    );

    return NextResponse.json({ data, persistent: true });
  } catch (error) {
    return apiError(error);
  }
}
