import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import {
  getProductForActor,
  updateProductForActor,
} from "@/repositories/products";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
}).refine((value) => value.name !== undefined || value.status !== undefined, {
  message: "At least one field is required",
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Persistent database is not configured" }, { status: 503 });
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

    return NextResponse.json({ data: product });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Persistent database is not configured" }, { status: 503 });
  }

  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await request.json());

    if (!z.string().uuid().safeParse(id).success || !parsed.success) {
      return NextResponse.json({ error: "Invalid product update" }, { status: 400 });
    }

    const product = await updateProductForActor({
      userId: actor.userId,
      productId: id,
      ...parsed.data,
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    return apiError(error);
  }
}
