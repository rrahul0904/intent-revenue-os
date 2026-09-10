import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { enqueueJob } from "@/repositories/jobs";
import { getProductForActor } from "@/repositories/products";

type RouteContext = { params: Promise<{ id: string }> };

function hourBucket(date: Date): string {
  return date.toISOString().slice(0, 13).replace(/[-T:]/g, "");
}

export async function POST(request: Request, context: RouteContext) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Persistent database is not configured" },
      { status: 503 },
    );
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

    let force = false;
    try {
      const body = await request.json();
      force = body?.force === true;
    } catch {
      // Empty body is valid.
    }

    const key = force
      ? "product-fetch:" + id + ":force:" + randomUUID()
      : "product-fetch:" + id + ":" + hourBucket(new Date());

    const queued = await enqueueJob({
      workspaceId: product.workspaceId,
      type: "PRODUCT_FETCH",
      payload: { productId: product.id },
      idempotencyKey: key,
      priority: 100,
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
