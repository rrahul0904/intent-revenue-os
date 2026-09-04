import { NextResponse } from "next/server";
import { hasDatabase, pingDatabase } from "@/db/client";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({
      status: "ok",
      service: "intent-revenue-os",
      mode: "demo",
      database: { configured: false, reachable: false },
    });
  }

  try {
    const latencyMs = await pingDatabase();
    return NextResponse.json({
      status: "ok",
      service: "intent-revenue-os",
      mode: "persistent",
      database: { configured: true, reachable: true, latencyMs },
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "intent-revenue-os",
        mode: "persistent",
        database: { configured: true, reachable: false },
      },
      { status: 503 },
    );
  }
}
