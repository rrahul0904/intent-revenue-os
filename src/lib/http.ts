import { NextResponse } from "next/server";
import { AuthenticationError } from "@/lib/auth";
import { WorkspaceAccessError } from "@/repositories/workspaces";

export function apiError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof WorkspaceAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error && error.message === "Not found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
