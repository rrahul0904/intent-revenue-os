export type DistributionChannel = "public_reply" | "dm" | "email";
export type ProspectPlatform = "reddit" | "x" | "linkedin" | "public_web";
export type FitDecision = "draft" | "observe" | "skip";

export interface DistributionPolicy {
  reviewRequired: true;
  anonymousScraping: "disabled";
  queueWideSend: "disabled";
  allowedChannels: DistributionChannel[];
  maxDraftsPerRun: number;
}

export interface DistributionAgent {
  id: string;
  name: string;
  productName: string;
  idealCustomer: string;
  proofPoints: string[];
  voice: {
    style: string;
    forbiddenClaims: string[];
  };
  policy: DistributionPolicy;
}

export interface ProspectEvidence {
  id: string;
  kind: "problem" | "intent" | "fit" | "context" | "eligibility";
  text: string;
  sourceUrl: string;
}

export interface Prospect {
  id: string;
  platform: ProspectPlatform;
  handle: string;
  contextTitle: string;
  contextBody: string;
  sourceUrl: string;
  accountEligible: boolean;
  eligibilityReason: string;
  allowedChannels: DistributionChannel[];
  signals: {
    problemMatch: number;
    buyingIntent: number;
    productFit: number;
    urgency: number;
  };
  evidence: ProspectEvidence[];
}

export interface FitReceipt {
  id: string;
  agentId: string;
  prospectId: string;
  score: number;
  decision: FitDecision;
  reasons: string[];
  evidenceIds: string[];
  policyChecks: {
    accountEligible: boolean;
    hasEvidence: boolean;
    hasAllowedChannel: boolean;
  };
}

export interface OutreachDraft {
  id: string;
  agentId: string;
  prospectId: string;
  fitReceiptId: string;
  channel: DistributionChannel;
  body: string;
  revision: number;
  evidenceIds: string[];
  approval: {
    approvedRevision: number;
    approvedBy: string;
  } | null;
  skipped: boolean;
}

export interface DraftRevision {
  id: string;
  draftId: string;
  fromRevision: number;
  toRevision: number;
  previousBody: string;
  nextBody: string;
  editedBy: string;
  approvalInvalidated: boolean;
}

export interface ExactDraftSendRequest {
  draftId: string;
  revision: number;
  authorizedBy: string;
}

export interface SendReceipt {
  id: string;
  draftId: string;
  revision: number;
  authorizedBy: string;
  status: "authorized_simulation" | "denied";
  providerWrite: false;
  reason: string;
}
