import type { ProductProfile, ScoreBreakdown } from "@/lib/types";

export type RecommendedAction = "public_reply" | "dm" | "observe";

export interface CandidateClassificationContext {
  workspaceId: string;
  candidateId: string;
  productId: string;
  productName: string;
  productUrl: string;
  productProfile: ProductProfile;
  sourcePostId: string;
  platform: "reddit" | "x" | "linkedin";
  community: string | null;
  author: string | null;
  title: string;
  body: string;
  sourceUrl: string;
  publishedAt: Date;
  queryText: string;
}

export interface RawIntentClassification {
  relevant: boolean;
  confidence: number;
  problemMatch: number;
  buyingIntent: number;
  productFit: number;
  switchingIntent: number;
  urgency: number;
  rationale: string;
  evidence: string;
  recommendedAction: RecommendedAction;
  draftReply: string;
}

export interface FinalIntentClassification
  extends Omit<
    RawIntentClassification,
    "problemMatch" | "buyingIntent" | "productFit" | "switchingIntent" | "urgency"
  > {
  score: number;
  breakdown: ScoreBreakdown;
}

export interface ClassificationGenerationResult {
  classification: RawIntentClassification;
  provider: string;
  model: string;
  promptVersion: string;
  requestHash: string;
  responseId: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costMicros: number;
  latencyMs: number;
}
