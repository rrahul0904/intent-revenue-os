import { NextResponse } from "next/server";
import { demoLeads } from "@/lib/mock-data";

export function GET() {
  return NextResponse.json({ data: demoLeads, meta: { count: demoLeads.length, mode: "demo" } });
}
