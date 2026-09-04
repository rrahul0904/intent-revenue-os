import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDemoProfile } from "@/lib/product-intelligence";

const requestSchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid absolute URL, including https://" }, { status: 400 });
  }
  return NextResponse.json({ data: buildDemoProfile(parsed.data.url), mode: "demo" });
}
