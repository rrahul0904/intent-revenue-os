import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { createWorkspace, listWorkspacesForUser } from "@/repositories/workspaces";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

export async function GET(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ data: [], mode: "demo", persistent: false });
  }

  try {
    const actor = await requireActor(request);
    const data = await listWorkspacesForUser(actor.userId);
    return NextResponse.json({ data, persistent: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required to create a workspace" },
      { status: 503 },
    );
  }

  try {
    const actor = await requireActor(request);
    const parsed = createWorkspaceSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Workspace name must be between 2 and 160 characters" },
        { status: 400 },
      );
    }

    const workspace = await createWorkspace(parsed.data.name, actor.userId);
    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
