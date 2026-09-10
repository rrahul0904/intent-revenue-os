import { createHash } from "node:crypto";
import {
  ClassificationError,
  rawClassificationSchema,
  validateEvidence,
} from "@/domain/classification/validation";
import { finalizeClassification } from "@/domain/classification/scoring";
import { classifierConfiguration, generateClassification } from "@/services/classification/provider";
import {
  recordGenerationFailure,
  recordGenerationSuccess,
} from "@/repositories/ai-generations";
import {
  getCandidateClassification,
  persistCandidateClassification,
} from "@/repositories/classifications";
import { applyClassificationToLead } from "@/repositories/leads";
import { getCandidateClassificationContextSystem } from "@/repositories/source-candidates";

function fallbackRequestHash(candidateId: string, version: string): string {
  return createHash("sha256")
    .update(candidateId + "\n" + version)
    .digest("hex");
}

export async function classifyCandidate(candidateId: string) {
  const classifierVersion = process.env.CLASSIFIER_VERSION || "phase3-v1";
  const existing = await getCandidateClassification(candidateId, classifierVersion);
  const context = await getCandidateClassificationContextSystem(candidateId);

  if (!context) throw new Error("Not found");

  if (existing) {
    return {
      classificationId: existing.id,
      score: existing.score,
      relevant: existing.relevant,
      created: false,
    };
  }

  const started = Date.now();
  const config = classifierConfiguration();

  try {
    const generation = await generateClassification(context);
    const locallyValidated = rawClassificationSchema.parse(
      generation.classification,
    );
    const evidenceValidated = validateEvidence(context, locallyValidated);
    const finalClassification = finalizeClassification(
      evidenceValidated,
      context.publishedAt,
    );

    const generationRow = await recordGenerationSuccess({
      workspaceId: context.workspaceId,
      candidateId: context.candidateId,
      generation: {
        ...generation,
        classification: evidenceValidated,
      },
    });

    const persisted = await persistCandidateClassification({
      workspaceId: context.workspaceId,
      candidateId: context.candidateId,
      generationId: generationRow.id,
      classifierVersion,
      classification: finalClassification,
    });

    const leadResult = await applyClassificationToLead({
      context,
      classificationId: persisted.row.id,
      classification: finalClassification,
    });

    return {
      classificationId: persisted.row.id,
      score: finalClassification.score,
      relevant: finalClassification.relevant,
      surfaced: leadResult.surfaced,
      leadId: leadResult.lead?.id ?? null,
      created: persisted.created,
    };
  } catch (error) {
    const code =
      error instanceof ClassificationError
        ? error.code
        : "CLASSIFICATION_UNHANDLED_ERROR";

    await recordGenerationFailure({
      workspaceId: context.workspaceId,
      candidateId: context.candidateId,
      provider: config.mode,
      model: config.model || "unconfigured",
      promptVersion: classifierVersion,
      requestHash: fallbackRequestHash(candidateId, classifierVersion),
      errorCode: code,
      latencyMs: Math.max(1, Date.now() - started),
    });

    throw error;
  }
}

export function classifyClassificationError(error: unknown) {
  if (error instanceof ClassificationError) {
    return {
      code: error.code,
      retryable: error.retryable,
      message: error.message,
    };
  }

  return {
    code: "CLASSIFICATION_UNHANDLED_ERROR",
    retryable: true,
    message: error instanceof Error ? error.message : "Unknown classification error",
  };
}
