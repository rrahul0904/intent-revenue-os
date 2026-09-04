import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import {
  createProductForActor,
  listProductsForActor,
} from "@/repositories/products";

const createProductSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  name: z.string().trim().min(1).max(160).optional(),
});

export async function GET(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ data: [], mode: "demo", persistent: false });
  }

  try {
    const actor = await requireActor(request);
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId || !z.string().uuid().safeParse(workspaceId).success) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const data = await listProductsForActor(actor.userId, workspaceId);
    return NextResponse.json({ data, persistent: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required to create a product" },
      { status: 503 },
    );
  }

  try {
    const actor = await requireActor(request);
    const parsed = createProductSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "workspaceId and a valid product URL are required" },
        { status: 400 },
      );
    }

    const product = await createProductForActor({
      userId: actor.userId,
      ...parsed.data,
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
