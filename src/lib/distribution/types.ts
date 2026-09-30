export type DistributionChannel = "reddit" | "x" | "linkedin" | "email";
export type AgentStatus = "active" | "paused";
export type ApprovalMode = "review_required";
export type ProspectEligibility =
  | "eligible"
  | "dm_closed"
  | "account_too_new"
  | "low_signal"
  | "policy_blocked";

export type RecommendedTouch = "public_reply" | "dm" | "email" | "observe";
export type DraftKind = Exclude<RecommendedTouch, "observe">;
export type DraftStatus = "draft" | "approved" | "skipped";

export interface VoiceProfile {
  tone: string;
  principles: string[];
  avoidPhrases: string[];
}

export interface DistributionAgent {
  id: string;
  name: string;
  productName: string;
  productUrl: string;
  idealCustomer: string;
  proofPoints: string[];
  channels: DistributionChannel[];
  dailyCap: number;
  approvalMode: ApprovalMode;
  status: AgentStatus;
  revision: number;
  voice: VoiceProfile;
}

export interface ProspectEvidence {
  id: string;
  label: string;
  excerpt: string;
  sourceUrl: string;
}

export interface FitBreakdown {
  problemMatch: number;
  personaFit: number;
  buyingIntent: number;
  timing: number;
  trustContext: number;
  freshness: number;
}

export interface FitReceipt {
  version: "fit-v1";
  score: number;
  rationale: string;
  breakdown: FitBreakdown;
  evidence: ProspectEvidence[];
  evaluatedAt: string;
}

export interface Prospect {
  id: string;
  channel: DistributionChannel;
  identity: string;
  handle: string;
  community: string;
  title: string;
  context: string;
  sourceUrl: string;
  eligibility: ProspectEligibility;
  eligibilityReason: string;
  recommendedTouch: RecommendedTouch;
  fit: FitReceipt;
}

export interface OutreachDraft {
  id: string;
  prospectId: string;
  channel: DistributionChannel;
  kind: DraftKind;
  recipientLabel: string;
  subject?: string;
  body: string;
  sourceEvidenceIds: string[];
  status: DraftStatus;
  revision: number;
  approvedRevision?: number;
  approvedAt?: string;
  skippedAt?: string;
  editedAt?: string;
}

export interface ExactSendRequest {
  draftId: string;
  expectedRevision: number;
}

export interface AuthorizedSendIntent {
  draftId: string;
  revision: number;
  channel: DistributionChannel;
  body: string;
  subject?: string;
  authorizedAt: string;
  idempotencyKey: string;
}

export interface SimulatedSendReceipt {
  receiptVersion: "send-sim-v1";
  draftId: string;
  revision: number;
  channel: DistributionChannel;
  provider: "demo-no-write";
  status: "simulated";
  idempotencyKey: string;
  simulatedAt: string;
}
