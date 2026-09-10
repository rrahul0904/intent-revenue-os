import { calculateLeadScore } from "@/lib/scoring";
import type {
  FinalIntentClassification,
  RawIntentClassification,
} from "@/domain/classification/types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateFreshness(
  publishedAt: Date,
  now = new Date(),
): number {
  const ageHours = Math.max(
    0,
    (now.getTime() - publishedAt.getTime()) / (60 * 60 * 1000),
  );

  if (ageHours <= 6) return 100;
  if (ageHours <= 24) return 96;
  if (ageHours <= 72) return 88;
  if (ageHours <= 168) return 76;
  if (ageHours <= 336) return 62;
  if (ageHours <= 720) return 45;
  return 25;
}

export function finalizeClassification(
  raw: RawIntentClassification,
  publishedAt: Date,
  now = new Date(),
): FinalIntentClassification {
  const breakdown = {
    problemMatch: clamp(raw.problemMatch),
    buyingIntent: clamp(raw.buyingIntent),
    productFit: clamp(raw.productFit),
    switchingIntent: clamp(raw.switchingIntent),
    urgency: clamp(raw.urgency),
    freshness: calculateFreshness(publishedAt, now),
  };

  return {
    relevant: raw.relevant,
    confidence: clamp(raw.confidence),
    rationale: raw.rationale.trim(),
    evidence: raw.evidence.trim(),
    recommendedAction: raw.recommendedAction,
    draftReply: raw.draftReply.trim(),
    score: calculateLeadScore(breakdown),
    breakdown,
  };
}
