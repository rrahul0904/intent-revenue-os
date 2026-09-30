import type {
  DistributionAgent,
  DraftRevision,
  ExactDraftSendRequest,
  FitReceipt,
  OutreachDraft,
  Prospect,
  SendReceipt,
} from "./types";

const FIT_WEIGHTS = {
  problemMatch: 0.35,
  buyingIntent: 0.3,
  productFit: 0.25,
  urgency: 0.1,
} as const;

function clampSignal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function intersectAllowedChannels(agent: DistributionAgent, prospect: Prospect) {
  return agent.policy.allowedChannels.filter((channel) =>
    prospect.allowedChannels.includes(channel),
  );
}

export function calculateProspectFit(prospect: Prospect): number {
  const score =
    clampSignal(prospect.signals.problemMatch) * FIT_WEIGHTS.problemMatch +
    clampSignal(prospect.signals.buyingIntent) * FIT_WEIGHTS.buyingIntent +
    clampSignal(prospect.signals.productFit) * FIT_WEIGHTS.productFit +
    clampSignal(prospect.signals.urgency) * FIT_WEIGHTS.urgency;

  return Math.round(score);
}

export function createFitReceipt(
  agent: DistributionAgent,
  prospect: Prospect,
): FitReceipt {
  const score = calculateProspectFit(prospect);
  const hasEvidence = prospect.evidence.length > 0;
  const hasAllowedChannel = intersectAllowedChannels(agent, prospect).length > 0;
  const policyChecks = {
    accountEligible: prospect.accountEligible,
    hasEvidence,
    hasAllowedChannel,
  };

  let decision: FitReceipt["decision"];
  if (!policyChecks.accountEligible || !hasEvidence || !hasAllowedChannel) {
    decision = "skip";
  } else if (score >= 70) {
    decision = "draft";
  } else if (score >= 50) {
    decision = "observe";
  } else {
    decision = "skip";
  }

  const reasons = [
    `problem match ${clampSignal(prospect.signals.problemMatch)}`,
    `buying intent ${clampSignal(prospect.signals.buyingIntent)}`,
    `product fit ${clampSignal(prospect.signals.productFit)}`,
    `urgency ${clampSignal(prospect.signals.urgency)}`,
  ];

  if (!prospect.accountEligible) reasons.push(prospect.eligibilityReason);
  if (!hasEvidence) reasons.push("no evidence available for a grounded draft");
  if (!hasAllowedChannel) reasons.push("no policy-permitted outreach channel");

  return {
    id: `fit:${agent.id}:${prospect.id}:v1`,
    agentId: agent.id,
    prospectId: prospect.id,
    score,
    decision,
    reasons,
    evidenceIds: prospect.evidence.map((item) => item.id).sort(),
    policyChecks,
  };
}

export function rankProspects(
  agent: DistributionAgent,
  prospects: Prospect[],
): FitReceipt[] {
  return prospects
    .map((prospect) => createFitReceipt(agent, prospect))
    .sort((left, right) => {
      if (left.decision === "skip" && right.decision !== "skip") return 1;
      if (right.decision === "skip" && left.decision !== "skip") return -1;
      if (right.score !== left.score) return right.score - left.score;
      return left.prospectId.localeCompare(right.prospectId);
    });
}

export function generateEvidenceLinkedDraft(
  agent: DistributionAgent,
  prospect: Prospect,
  fitReceipt: FitReceipt,
): OutreachDraft {
  if (fitReceipt.agentId !== agent.id || fitReceipt.prospectId !== prospect.id) {
    throw new Error("fit receipt does not match agent and prospect");
  }
  if (fitReceipt.decision !== "draft") {
    throw new Error("prospect is not eligible for drafting");
  }

  const channel = intersectAllowedChannels(agent, prospect)[0];
  if (!channel) throw new Error("no policy-permitted outreach channel");

  const problemEvidence =
    prospect.evidence.find((item) => item.kind === "problem") ??
    prospect.evidence[0];
  const intentEvidence =
    prospect.evidence.find((item) => item.kind === "intent") ??
    prospect.evidence.find((item) => item.kind === "fit") ??
    prospect.evidence[1] ??
    problemEvidence;

  if (!problemEvidence || !intentEvidence) {
    throw new Error("evidence-linked drafting requires source evidence");
  }

  const proofPoint =
    agent.proofPoints[0] ??
    `support for ${agent.idealCustomer.toLowerCase()}`;

  const body =
    `You mentioned “${problemEvidence.text}”. ` +
    `Given “${intentEvidence.text}”, it may be useful to compare options around ${proofPoint}. ` +
    `If helpful, I can share how ${agent.productName} approaches that problem.`;

  return {
    id: `draft:${agent.id}:${prospect.id}`,
    agentId: agent.id,
    prospectId: prospect.id,
    fitReceiptId: fitReceipt.id,
    channel,
    body,
    revision: 1,
    evidenceIds: [problemEvidence.id, intentEvidence.id].filter(
      (value, index, values) => values.indexOf(value) === index,
    ),
    approval: null,
    skipped: false,
  };
}

export function approveDraft(
  draft: OutreachDraft,
  approvedBy: string,
): OutreachDraft {
  if (draft.skipped) throw new Error("skipped drafts cannot be approved");
  if (!approvedBy.trim()) throw new Error("approvedBy is required");

  return {
    ...draft,
    approval: {
      approvedRevision: draft.revision,
      approvedBy,
    },
  };
}

export function reviseDraft(
  draft: OutreachDraft,
  nextBody: string,
  editedBy: string,
): { draft: OutreachDraft; revision: DraftRevision } {
  const trimmed = nextBody.trim();
  if (!trimmed) throw new Error("draft body cannot be empty");
  if (trimmed === draft.body) throw new Error("draft revision must change the body");
  if (!editedBy.trim()) throw new Error("editedBy is required");

  const fromRevision = draft.revision;
  const toRevision = fromRevision + 1;
  const revision: DraftRevision = {
    id: `revision:${draft.id}:${toRevision}`,
    draftId: draft.id,
    fromRevision,
    toRevision,
    previousBody: draft.body,
    nextBody: trimmed,
    editedBy,
    approvalInvalidated: draft.approval !== null,
  };

  return {
    draft: {
      ...draft,
      body: trimmed,
      revision: toRevision,
      approval: null,
    },
    revision,
  };
}

export function skipDraft(draft: OutreachDraft): OutreachDraft {
  return { ...draft, skipped: true, approval: null };
}

export function authorizeExactDraftSend(
  agent: DistributionAgent,
  draft: OutreachDraft,
  request: ExactDraftSendRequest,
): SendReceipt {
  let status: SendReceipt["status"] = "denied";
  let reason = "send authorization denied";

  if (request.draftId !== draft.id) {
    reason = "request does not name this exact draft";
  } else if (request.revision !== draft.revision) {
    reason = "request revision is stale or does not match the current draft";
  } else if (draft.skipped) {
    reason = "skipped drafts cannot be authorized";
  } else if (!agent.policy.allowedChannels.includes(draft.channel)) {
    reason = "draft channel is not permitted by agent policy";
  } else if (!draft.approval) {
    reason = "draft has not been approved";
  } else if (draft.approval.approvedRevision !== draft.revision) {
    reason = "approval does not cover the current revision";
  } else {
    status = "authorized_simulation";
    reason =
      "exact approved revision authorized for simulation only; no provider write performed";
  }

  return {
    id: `send:${draft.id}:r${request.revision}:${status}`,
    draftId: draft.id,
    revision: request.revision,
    authorizedBy: request.authorizedBy,
    status,
    providerWrite: false,
    reason,
  };
}
