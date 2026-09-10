import { z } from "zod";
import type {
  CandidateClassificationContext,
  RawIntentClassification,
} from "@/domain/classification/types";

export const rawClassificationSchema = z.object({
  relevant: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  problemMatch: z.number().int().min(0).max(100),
  buyingIntent: z.number().int().min(0).max(100),
  productFit: z.number().int().min(0).max(100),
  switchingIntent: z.number().int().min(0).max(100),
  urgency: z.number().int().min(0).max(100),
  rationale: z.string().trim().min(10).max(1200),
  evidence: z.string().trim().min(2).max(1000),
  recommendedAction: z.enum(["public_reply", "dm", "observe"]),
  draftReply: z.string().trim().min(5).max(1800),
});

export class ClassificationError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, options: { code: string; retryable: boolean }) {
    super(message);
    this.name = "ClassificationError";
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

export function sourceText(context: CandidateClassificationContext): string {
  return [context.title, context.body].filter(Boolean).join("\n");
}

export function validateEvidence(
  context: CandidateClassificationContext,
  classification: RawIntentClassification,
): RawIntentClassification {
  const source = sourceText(context);
  if (!source.includes(classification.evidence)) {
    throw new ClassificationError(
      "Classifier evidence is not an exact excerpt of the source post",
      {
        code: "CLASSIFIER_INVALID_EVIDENCE",
        retryable: true,
      },
    );
  }

  return classification;
}
