import { createHash } from "node:crypto";
import { rawClassificationSchema, ClassificationError } from "@/domain/classification/validation";
import { calculateGenerationCostMicros } from "@/domain/classification/cost";
import type {
  CandidateClassificationContext,
  ClassificationGenerationResult,
} from "@/domain/classification/types";

type ResponseUsage = {
  input_tokens?: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens?: number;
};

type OpenAIResponse = {
  id?: string;
  status?: string;
  error?: { code?: string; message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: ResponseUsage;
};

const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    relevant: { type: "boolean" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    problemMatch: { type: "integer", minimum: 0, maximum: 100 },
    buyingIntent: { type: "integer", minimum: 0, maximum: 100 },
    productFit: { type: "integer", minimum: 0, maximum: 100 },
    switchingIntent: { type: "integer", minimum: 0, maximum: 100 },
    urgency: { type: "integer", minimum: 0, maximum: 100 },
    rationale: { type: "string" },
    evidence: { type: "string" },
    recommendedAction: {
      type: "string",
      enum: ["public_reply", "dm", "observe"],
    },
    draftReply: { type: "string" },
  },
  required: [
    "relevant",
    "confidence",
    "problemMatch",
    "buyingIntent",
    "productFit",
    "switchingIntent",
    "urgency",
    "rationale",
    "evidence",
    "recommendedAction",
    "draftReply",
  ],
} as const;

function outputText(response: OpenAIResponse): string {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }
  return "";
}

export async function classifyWithOpenAI(
  context: CandidateClassificationContext,
): Promise<ClassificationGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey || !model) {
    throw new ClassificationError(
      "OPENAI_API_KEY and OPENAI_MODEL are required when AI_MODE=openai",
      {
        code: "OPENAI_NOT_CONFIGURED",
        retryable: false,
      },
    );
  }

  const promptVersion = process.env.CLASSIFIER_VERSION || "phase3-v1";
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    .replace(/\/+$/, "");
  const timeoutMs = Math.min(
    Math.max(
      Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "30000", 10) || 30000,
      3000,
    ),
    120000,
  );

  const input = JSON.stringify({
    product: {
      name: context.productName,
      url: context.productUrl,
      profile: context.productProfile,
    },
    discovery: {
      matchedQuery: context.queryText,
      platform: context.platform,
      community: context.community,
    },
    sourcePost: {
      title: context.title,
      body: context.body,
      publishedAt: context.publishedAt.toISOString(),
      url: context.sourceUrl,
    },
  });

  const instructions = [
    "Classify purchase intent for the supplied product and public source post.",
    "Use only the supplied source post as evidence.",
    "The evidence field MUST be an exact verbatim excerpt from the title or body.",
    "Do not invent facts, budgets, urgency, identities, or product capabilities.",
    "Draft a useful non-spammy response; do not claim to be the source author.",
  ].join(" ");

  const requestHash = createHash("sha256")
    .update(promptVersion + "\n" + model + "\n" + instructions + "\n" + input)
    .digest("hex");
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch(baseUrl + "/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: "intent_classification",
            strict: true,
            schema: CLASSIFICATION_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new ClassificationError("OpenAI request failed", {
      code: "OPENAI_NETWORK_ERROR",
      retryable: true,
    });
  }

  const payload = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new ClassificationError(
      payload.error?.message || "OpenAI returned HTTP " + response.status,
      {
        code: payload.error?.code || "OPENAI_HTTP_" + response.status,
        retryable:
          response.status === 408 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status >= 500,
      },
    );
  }

  if (payload.status && payload.status !== "completed") {
    throw new ClassificationError(
      "OpenAI response did not complete: " + payload.status,
      {
        code: "OPENAI_INCOMPLETE_RESPONSE",
        retryable: true,
      },
    );
  }

  const text = outputText(payload);
  if (!text) {
    throw new ClassificationError("OpenAI response did not contain output text", {
      code: "OPENAI_EMPTY_OUTPUT",
      retryable: true,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ClassificationError("OpenAI structured output was not valid JSON", {
      code: "OPENAI_INVALID_JSON",
      retryable: true,
    });
  }

  const classification = rawClassificationSchema.safeParse(parsed);
  if (!classification.success) {
    throw new ClassificationError("OpenAI structured output failed local validation", {
      code: "OPENAI_SCHEMA_MISMATCH",
      retryable: true,
    });
  }

  const inputTokens = payload.usage?.input_tokens ?? 0;
  const outputTokens = payload.usage?.output_tokens ?? 0;
  const cachedTokens = payload.usage?.input_tokens_details?.cached_tokens ?? 0;

  return {
    classification: classification.data,
    provider: "openai",
    model,
    promptVersion,
    requestHash,
    responseId: payload.id ?? null,
    inputTokens,
    outputTokens,
    cachedTokens,
    costMicros: calculateGenerationCostMicros({
      inputTokens,
      outputTokens,
      cachedTokens,
    }),
    latencyMs: Math.max(1, Date.now() - started),
  };
}
