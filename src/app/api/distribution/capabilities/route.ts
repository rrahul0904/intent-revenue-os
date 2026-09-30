import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      mode: "demo",
      discovery: "synthetic-fixtures",
      liveProviderWrites: false,
      approvalMode: "review_required",
      sendBoundary: {
        exactDraftIdRequired: true,
        exactRevisionRequired: true,
        approvalRequired: true,
        queueWideSendAvailable: false,
      },
      supportedDemoActions: [
        "rank_prospects",
        "create_review_drafts",
        "edit_draft",
        "approve_draft",
        "skip_draft",
        "simulate_exact_send",
      ],
    },
  });
}
