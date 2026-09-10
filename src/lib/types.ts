export type Platform = "reddit" | "x" | "linkedin";
export type LeadStatus = "new" | "approved" | "replied" | "ignored";

export interface ProductProfile {
  name: string;
  url: string;
  summary: string;
  idealCustomer: string;
  pains: string[];
  buyingSignals: string[];
  competitors: string[];
  categoryTerms?: string[];
  sourceTitle?: string;
  sourceDescription?: string;
  sourceContentHash?: string;
}

export interface ScoreBreakdown {
  problemMatch: number;
  buyingIntent: number;
  productFit: number;
  switchingIntent: number;
  urgency: number;
  freshness: number;
}

export interface Lead {
  id: string;
  platform: Platform;
  community: string;
  author: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  score: number;
  status: LeadStatus;
  rationale: string;
  evidence: string;
  recommendedAction: "public_reply" | "dm" | "observe";
  draftReply: string;
  breakdown: ScoreBreakdown;
}

export interface NormalizedSourcePost {
  platform: Platform;
  externalId: string;
  community: string | null;
  author: string | null;
  title: string;
  body: string;
  url: string;
  publishedAt: Date;
  contentHash: string;
  rawPayload: unknown;
}

export interface GeneratedSignalQuery {
  queryType: "pain" | "recommendation" | "switching" | "competitor" | "category";
  queryText: string;
  community?: string | null;
  priority: number;
}
