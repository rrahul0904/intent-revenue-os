import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getProductForActor } from "@/repositories/products";
import { listSourceQueriesForActor } from "@/repositories/source-queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!hasDatabase()) {
    return NextResponse.json({ data: [], persistent: false });
  }

  try {
    const actor = await requireActor(request);
    const { id } = await context.params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await getProductForActor(actor.userId, id);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await listSourceQueriesForActor(actor.userId, id);
    return NextResponse.json({ data, persistent: true });
  } catch (error) {
    return apiError(error);
  }
}
