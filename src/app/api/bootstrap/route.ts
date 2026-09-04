import { NextResponse } from "next/server";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { ensureActorWorkspace } from "@/repositories/workspaces";

export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required for persistent bootstrap" },
      { status: 503 },
    );
  }

  try {
    const actor = await requireActor(request);
    let suggestedName = `${actor.name}'s workspace`;

    try {
      const body = await request.json();
      if (typeof body?.name === "string" && body.name.trim()) {
        suggestedName = body.name.trim().slice(0, 160);
      }
    } catch {
      // An empty body is valid for bootstrap.
    }

    const result = await ensureActorWorkspace(actor.userId, suggestedName);
    return NextResponse.json({ data: result.workspace, created: result.created });
  } catch (error) {
    return apiError(error);
  }
}
