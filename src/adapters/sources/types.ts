import type { NormalizedSourcePost, Platform } from "@/lib/types";

export interface SourceSearchQuery {
  id: string;
  platform: Platform;
  queryText: string;
  community: string | null;
}

export interface SourceSearchPage {
  items: NormalizedSourcePost[];
  after: string | null;
  metadata?: Record<string, unknown>;
}

export interface SourceAdapter {
  readonly platform: Platform;
  isConfigured(): boolean;
  search(query: SourceSearchQuery, cursor?: string | null): Promise<SourceSearchPage>;
}

export class SourceAdapterError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      code: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    },
  ) {
    super(message);
    this.name = "SourceAdapterError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
