import { z } from "zod";
import { SourceAdapterError } from "@/adapters/sources/types";
import { WebsiteFetchError } from "@/adapters/web/website-fetcher";
import type { ClaimedQueueJob } from "@/repositories/jobs";
import { discoverProductIntelligence } from "@/services/product-discovery";
import { runSourceIngestion } from "@/services/ingestion";

const productFetchSchema = z.object({
  productId: z.string().uuid(),
});

const sourceIngestSchema = z.object({
  queryId: z.string().uuid(),
  cursor: z.string().nullable().optional(),
});

export async function handleQueueJob(job: ClaimedQueueJob) {
  if (job.type === "PRODUCT_FETCH") {
    const payload = productFetchSchema.parse(job.payload);
    return discoverProductIntelligence(payload.productId);
  }

  if (job.type === "SOURCE_INGEST") {
    const payload = sourceIngestSchema.parse(job.payload);
    return runSourceIngestion(payload.queryId, payload.cursor);
  }

  throw new Error("Unsupported queue job type: " + job.type);
}

export function classifyJobError(error: unknown) {
  if (error instanceof SourceAdapterError) {
    return {
      retryable: error.retryable,
      retryAfterSeconds: error.retryAfterSeconds,
      message: error.code + ": " + error.message,
    };
  }

  if (error instanceof WebsiteFetchError) {
    return {
      retryable: error.retryable,
      message: error.code + ": " + error.message,
    };
  }

  if (error instanceof z.ZodError) {
    return {
      retryable: false,
      message: "INVALID_JOB_PAYLOAD: " + error.message,
    };
  }

  return {
    retryable: true,
    message:
      "UNHANDLED_JOB_ERROR: " +
      (error instanceof Error ? error.message : "Unknown worker error"),
  };
}
