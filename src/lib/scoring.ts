import type { ScoreBreakdown } from "@/lib/types";

const weights: Record<keyof ScoreBreakdown, number> = {
  problemMatch: 0.28,
  buyingIntent: 0.24,
  productFit: 0.18,
  switchingIntent: 0.12,
  urgency: 0.10,
  freshness: 0.08,
};

export function calculateLeadScore(breakdown: ScoreBreakdown): number {
  const raw = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + breakdown[key as keyof ScoreBreakdown] * weight;
  }, 0);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreBand(score: number): "hot" | "strong" | "watch" | "low" {
  if (score >= 90) return "hot";
  if (score >= 75) return "strong";
  if (score >= 55) return "watch";
  return "low";
}
