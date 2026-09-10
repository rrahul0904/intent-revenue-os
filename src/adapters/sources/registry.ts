import { RedditSourceAdapter } from "@/adapters/sources/reddit";
import {
  SourceAdapterError,
  type SourceAdapter,
} from "@/adapters/sources/types";
import type { Platform } from "@/lib/types";

const reddit = new RedditSourceAdapter();

export function getSourceAdapter(platform: Platform): SourceAdapter {
  if (platform === "reddit") return reddit;

  throw new SourceAdapterError(
    "No live source adapter is implemented for " + platform,
    {
      code: "SOURCE_ADAPTER_NOT_IMPLEMENTED",
      retryable: false,
    },
  );
}

export function isSourceConfigured(platform: Platform): boolean {
  try {
    return getSourceAdapter(platform).isConfigured();
  } catch {
    return false;
  }
}

export function getSourceConfiguration() {
  return {
    reddit: {
      configured: reddit.isConfigured(),
      apiEnabled: process.env.REDDIT_API_ENABLED === "true",
      commercialAccessApproved:
        process.env.REDDIT_COMMERCIAL_ACCESS_APPROVED === "true",
      hasAccessToken: Boolean(process.env.REDDIT_ACCESS_TOKEN?.trim()),
      hasUserAgent: Boolean(process.env.REDDIT_USER_AGENT?.trim()),
    },
  };
}
