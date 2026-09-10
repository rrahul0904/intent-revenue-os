import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/db/client";
import { requireActor } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { enqueueJob } from "@/repositories/jobs";
import {
  createProductForActor,
  listProductsForActor,
} from "@/repositories/products";

const createProductSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  name: z.string().trim().min(1).max(160).optional(),
});

function hourBucket(date: Date): string {
  return date.toISOString().slice(0, 13).replace(/[-T:]/g, "");
}

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

    const discovery = await enqueueJob({
      workspaceId: product.workspaceId,
      type: "PRODUCT_FETCH",
      payload: { productId: product.id },
      idempotencyKey:
        "product-fetch:" + product.id + ":" + hourBucket(new Date()),
      priority: 100,
    });

    return NextResponse.json(
      {
        data: product,
        discovery: {
          jobId: discovery.job.id,
          created: discovery.created,
          status: discovery.job.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
