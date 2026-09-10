import { createHash } from "node:crypto";
import type {
  CandidateClassificationContext,
  ClassificationGenerationResult,
  RawIntentClassification,
} from "@/domain/classification/types";

const BUYING_PHRASES = [
  "looking for",
  "recommend",
  "recommendations",
  "what are people using",
  "what do you use",
  "is there a tool",
  "does anything exist",
  "open to paying",
  "need a tool",
  "need software",
  "worth it",
  "currently paying",
];

const SWITCHING_PHRASES = [
  "alternative to",
  "alternatives to",
  "moving away from",
  "replace",
  "replacement",
  "switching from",
  "outgrowing",
  "hitting the limits",
  "before renewing",
  "renewal",
];

const URGENCY_PHRASES = [
  "asap",
  "urgent",
  "this week",
  "this month",
  "next month",
  "right now",
  "immediately",
  "before renewal",
  "renewing",
  "deadline",
  "things are slipping",
  "falling apart",
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function terms(values: string[]): string[] {
  const found = new Set<string>();
  for (const value of values) {
    for (const token of normalize(value).split(" ")) {
      if (token.length >= 4) found.add(token);
    }
  }
  return [...found];
}

function phraseHits(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
}

function termCoverage(text: string, candidates: string[]): number {
  if (candidates.length === 0) return 0;
  const normalized = " " + normalize(text) + " ";
  const hits = candidates.filter((term) => normalized.includes(" " + term + " ")).length;
  return hits / Math.min(candidates.length, 10);
}

function sentenceCandidates(context: CandidateClassificationContext): string[] {
  const bodySentences = context.body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return [context.title.trim(), ...bodySentences].filter(Boolean);
}

function chooseEvidence(
  context: CandidateClassificationContext,
  preferredPhrases: string[],
  preferredTerms: string[],
): string {
  const sentences = sentenceCandidates(context);
  for (const phrase of preferredPhrases) {
    const match = sentences.find((sentence) =>
      sentence.toLowerCase().includes(phrase.toLowerCase()),
    );
    if (match) return match.slice(0, 900);
  }

  for (const term of preferredTerms) {
    const match = sentences.find((sentence) =>
      normalize(sentence).split(" ").includes(term),
    );
    if (match) return match.slice(0, 900);
  }

  return (sentences[0] || context.title || context.body).slice(0, 900);
}

export function classifyHeuristically(
  context: CandidateClassificationContext,
): ClassificationGenerationResult {
  const started = Date.now();
  const source = [context.title, context.body].filter(Boolean).join("\n");
  const profileTerms = terms([
    context.productProfile.summary,
    context.productProfile.idealCustomer,
    ...context.productProfile.pains,
    ...(context.productProfile.categoryTerms ?? []),
  ]);
  const competitorTerms = context.productProfile.competitors
    .map(normalize)
    .filter(Boolean);
  const queryTerms = terms([context.queryText]);

  const genericBuyingHits = phraseHits(source, BUYING_PHRASES);
  const profileSignalHits = phraseHits(
    source,
    context.productProfile.buyingSignals,
  );
  const switchingHits = phraseHits(source, [
    ...SWITCHING_PHRASES,
    ...competitorTerms,
  ]);
  const urgencyHits = phraseHits(source, URGENCY_PHRASES);

  const profileCoverage = termCoverage(source, profileTerms);
  const queryCoverage = termCoverage(source, queryTerms);
  const competitorCoverage = termCoverage(source, competitorTerms);

  const problemMatch = clamp(
    20 +
      profileCoverage * 65 +
      queryCoverage * 25 +
      Math.min(genericBuyingHits.length, 2) * 5,
  );
  const buyingIntent = clamp(
    18 +
      genericBuyingHits.length * 18 +
      profileSignalHits.length * 14 +
      (source.includes("?") ? 6 : 0),
  );
  const productFit = clamp(
    18 + profileCoverage * 70 + queryCoverage * 20,
  );
  const switchingIntent = clamp(
    switchingHits.length * 28 + competitorCoverage * 35,
  );
  const urgency = clamp(20 + urgencyHits.length * 24);
  const relevant =
    (problemMatch >= 45 && buyingIntent >= 35) ||
    buyingIntent >= 70 ||
    switchingIntent >= 65;
  const confidence = clamp(
    48 +
      profileCoverage * 28 +
      Math.min(genericBuyingHits.length + profileSignalHits.length, 4) * 6 +
      Math.min(switchingHits.length, 2) * 5,
  );

  const evidence = chooseEvidence(
    context,
    [
      ...switchingHits,
      ...genericBuyingHits,
      ...profileSignalHits,
      ...urgencyHits,
    ],
    [...queryTerms, ...profileTerms],
  );

  const rationale = relevant
    ? "The source describes a problem aligned with the product profile and contains measurable purchase, recommendation, or switching intent."
    : "The source has some topical overlap, but the available language does not yet show enough purchase or switching intent to prioritize outreach.";

  const recommendedAction =
    relevant && buyingIntent >= 65
      ? "public_reply"
      : relevant && switchingIntent >= 70
        ? "dm"
        : "observe";

  const firstPain = context.productProfile.pains[0] || "the workflow";
  const draftReply =
    recommendedAction === "observe"
      ? "It may help to map the exact bottleneck first—volume, ownership, handoffs, or follow-up—before adding another tool."
      : "A useful way to evaluate this is to map the current " +
        firstPain +
        " process, identify where ownership or follow-up breaks, and compare tools against those specific failure points rather than feature count alone.";

  const classification: RawIntentClassification = {
    relevant,
    confidence,
    problemMatch,
    buyingIntent,
    productFit,
    switchingIntent,
    urgency,
    rationale,
    evidence,
    recommendedAction,
    draftReply,
  };

  const promptVersion = process.env.CLASSIFIER_VERSION || "phase3-v1";
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion,
        productId: context.productId,
        sourcePostId: context.sourcePostId,
        queryText: context.queryText,
        source,
      }),
    )
    .digest("hex");

  return {
    classification,
    provider: "heuristic",
    model: "deterministic-intent-v1",
    promptVersion,
    requestHash,
    responseId: null,
    inputTokens: Math.ceil(
      (source.length + JSON.stringify(context.productProfile).length) / 4,
    ),
    outputTokens: Math.ceil(JSON.stringify(classification).length / 4),
    cachedTokens: 0,
    costMicros: 0,
    latencyMs: Math.max(1, Date.now() - started),
  };
}
