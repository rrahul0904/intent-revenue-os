import type {
  CandidateClassificationContext,
  ClassificationGenerationResult,
} from "@/domain/classification/types";
import { classifyHeuristically } from "@/services/classification/heuristic";
import { classifyWithOpenAI } from "@/services/classification/openai";

export function getClassifierMode(): "heuristic" | "openai" {
  return process.env.AI_MODE === "openai" ? "openai" : "heuristic";
}

export function classifierConfiguration() {
  const mode = getClassifierMode();
  return {
    mode,
    classifierVersion: process.env.CLASSIFIER_VERSION || "phase3-v1",
    configured:
      mode === "heuristic" ||
      (Boolean(process.env.OPENAI_API_KEY?.trim()) &&
        Boolean(process.env.OPENAI_MODEL?.trim())),
    model:
      mode === "openai"
        ? process.env.OPENAI_MODEL?.trim() || null
        : "deterministic-intent-v1",
  };
}

export async function generateClassification(
  context: CandidateClassificationContext,
): Promise<ClassificationGenerationResult> {
  if (getClassifierMode() === "openai") {
    return classifyWithOpenAI(context);
  }

  return classifyHeuristically(context);
}
