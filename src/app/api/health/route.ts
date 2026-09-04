import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "intent-revenue-os", mode: process.env.DATABASE_URL ? "connected" : "demo" });
}
