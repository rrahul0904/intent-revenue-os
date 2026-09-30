import type {
  AuthorizedSendIntent,
  DistributionAgent,
  ExactSendRequest,
  FitBreakdown,
  FitReceipt,
  OutreachDraft,
  Prospect,
  RecommendedTouch,
  SimulatedSendReceipt,
} from "@/lib/distribution/types";

const fitWeights: Record<keyof FitBreakdown, number> = {
  problemMatch: 0.27,
  personaFit: 0.20,
  buyingIntent: 0.22,
  timing: 0.12,
  trustContext: 0.10,
  freshness: 0.09,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compactEvidence(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function calculateFitScore(breakdown: FitBreakdown): number {
  const weighted = Object.entries(fitWeights).reduce((total, [key, weight]) => {
    return total + breakdown[key as keyof FitBreakdown] * weight;
  }, 0);

  return clampScore(weighted);
}

export function createFitReceipt(input: {
  breakdown: FitBreakdown;
  rationale: string;
  evidence: FitReceipt["evidence"];
  evaluatedAt: string;
}): FitReceipt {
  return {
    version: "fit-v1",
    score: calculateFitScore(input.breakdown),
    rationale: input.rationale.trim(),
    breakdown: input.breakdown,
    evidence: input.evidence.map((item) => ({
      ...item,
      excerpt: compactEvidence(item.excerpt),
    })),
    evaluatedAt: input.evaluatedAt,
  };
}

export function rankProspects(prospects: Prospect[]): Prospect[] {
  return [...prospects].sort((a, b) => {
    const eligibilityDelta =
      Number(b.eligibility === "eligible") - Number(a.eligibility === "eligible");
    if (eligibilityDelta !== 0) return eligibilityDelta;
    if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score;
    return a.id.localeCompare(b.id);
  });
}

function touchToKind(touch: RecommendedTouch): OutreachDraft["kind"] {
  if (touch === "observe") {
    throw new Error("Observe-only prospects cannot create outreach drafts");
  }
  return touch;
}

function draftBody(agent: DistributionAgent, prospect: Prospect): string {
  const evidence =
    prospect.fit.evidence[0]?.excerpt ||
    compactEvidence(prospect.context) ||
    "the problem you described";

  if (prospect.recommendedTouch === "public_reply") {
    return [
      `The part that stands out is “${evidence}”.`,
      "I’d solve the narrow workflow first: identify the repeated handoff, make ownership explicit, and measure whether the follow-up actually improves.",
      `That is the exact class of problem ${agent.productName} is built around, but even without a tool I’d start with that operating loop.`,
    ].join(" ");
  }

  if (prospect.recommendedTouch === "email") {
    return [
      `I saw your note about “${evidence}”.`,
      `We built ${agent.productName} for teams dealing with that exact pattern.`,
      "If it is useful, I can share the short workflow we use to qualify the problem before asking anyone to change tools.",
    ].join(" ");
  }

  return [
    `Your comment about “${evidence}” caught my eye.`,
    "I work on this problem every day and had one specific thought that may save you some trial-and-error.",
    "Happy to share it here; no pitch needed if the timing is not right.",
  ].join(" ");
}

export function createDraft(
  agent: DistributionAgent,
  prospect: Prospect,
  id = `draft_${prospect.id}`,
): OutreachDraft {
  if (agent.approvalMode !== "review_required") {
    throw new Error("This implementation only supports review-required agents");
  }
  if (prospect.eligibility !== "eligible") {
    throw new Error(`Prospect is not eligible: ${prospect.eligibility}`);
  }

  const kind = touchToKind(prospect.recommendedTouch);
  const subject =
    kind === "email"
      ? `Quick thought on ${prospect.title.slice(0, 72)}`
      : undefined;

  return {
    id,
    prospectId: prospect.id,
    channel: prospect.channel,
    kind,
    recipientLabel: prospect.identity,
    subject,
    body: draftBody(agent, prospect),
    sourceEvidenceIds: prospect.fit.evidence.map((item) => item.id),
    status: "draft",
    revision: 1,
  };
}

export function buildReviewQueue(
  agent: DistributionAgent,
  prospects: Prospect[],
): OutreachDraft[] {
  return rankProspects(prospects)
    .filter(
      (prospect) =>
        prospect.eligibility === "eligible" &&
        prospect.recommendedTouch !== "observe",
    )
    .map((prospect) => createDraft(agent, prospect));
}

export function editDraft(
  draft: OutreachDraft,
  body: string,
  editedAt: string,
): OutreachDraft {
  const nextBody = body.trim();
  if (nextBody.length < 12) {
    throw new Error("Draft body is too short");
  }

  return {
    ...draft,
    body: nextBody,
    status: "draft",
    revision: draft.revision + 1,
    approvedRevision: undefined,
    approvedAt: undefined,
    skippedAt: undefined,
    editedAt,
  };
}

export function approveDraft(
  draft: OutreachDraft,
  approvedAt: string,
): OutreachDraft {
  if (draft.status === "skipped") {
    throw new Error("Skipped drafts must be restored by editing before approval");
  }

  return {
    ...draft,
    status: "approved",
    approvedRevision: draft.revision,
    approvedAt,
  };
}

export function skipDraft(
  draft: OutreachDraft,
  skippedAt: string,
): OutreachDraft {
  return {
    ...draft,
    status: "skipped",
    approvedRevision: undefined,
    approvedAt: undefined,
    skippedAt,
  };
}

export function authorizeExactSend(
  draft: OutreachDraft,
  request: ExactSendRequest,
  authorizedAt: string,
): AuthorizedSendIntent {
  if (request.draftId !== draft.id) {
    throw new Error("Send request must name the exact draft");
  }
  if (request.expectedRevision !== draft.revision) {
    throw new Error("Draft changed after the send request was prepared");
  }
  if (draft.status !== "approved") {
    throw new Error("Draft must be approved before send authorization");
  }
  if (draft.approvedRevision !== draft.revision) {
    throw new Error("Approval is stale for the current draft revision");
  }

  return {
    draftId: draft.id,
    revision: draft.revision,
    channel: draft.channel,
    body: draft.body,
    subject: draft.subject,
    authorizedAt,
    idempotencyKey: `outreach:${draft.id}:r${draft.revision}`,
  };
}

export function simulateAuthorizedSend(
  intent: AuthorizedSendIntent,
  simulatedAt: string,
): SimulatedSendReceipt {
  return {
    receiptVersion: "send-sim-v1",
    draftId: intent.draftId,
    revision: intent.revision,
    channel: intent.channel,
    provider: "demo-no-write",
    status: "simulated",
    idempotencyKey: intent.idempotencyKey,
    simulatedAt,
  };
}
