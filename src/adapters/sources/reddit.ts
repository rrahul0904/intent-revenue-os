import { createHash } from "node:crypto";
import type { NormalizedSourcePost } from "@/lib/types";
import {
  SourceAdapterError,
  type SourceAdapter,
  type SourceSearchPage,
  type SourceSearchQuery,
} from "@/adapters/sources/types";

type RedditChild = {
  kind?: string;
  data?: Record<string, unknown>;
};

type RedditListing = {
  data?: {
    after?: string | null;
    children?: RedditChild[];
  };
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCommunity(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/^r\//i, "").trim();
  if (!/^[A-Za-z0-9_]{2,21}$/.test(normalized)) {
    throw new SourceAdapterError("Invalid Reddit community name", {
      code: "REDDIT_INVALID_COMMUNITY",
      retryable: false,
    });
  }
  return normalized;
}

export function normalizeRedditPost(child: RedditChild): NormalizedSourcePost | null {
  if (child.kind !== "t3" || !child.data) return null;

  const data = child.data;
  const id = asString(data.id);
  if (!id) return null;

  const title = asString(data.title).trim();
  const body = asString(data.selftext).trim();
  const permalink = asString(data.permalink);
  const createdUtc = asNumber(data.created_utc);
  const community =
    asString(data.subreddit_name_prefixed).replace(/^r\//i, "") ||
    asString(data.subreddit) ||
    null;
  const author = asString(data.author) || null;
  const url = permalink
    ? "https://www.reddit.com" + permalink
    : "https://www.reddit.com/comments/" + id;

  const contentHash = createHash("sha256")
    .update([id, title, body, community ?? "", author ?? ""].join("\n"))
    .digest("hex");

  return {
    platform: "reddit",
    externalId: id,
    community,
    author,
    title: title || "(untitled)",
    body,
    url,
    publishedAt: createdUtc > 0 ? new Date(createdUtc * 1000) : new Date(),
    contentHash,
    rawPayload: data,
  };
}

export class RedditSourceAdapter implements SourceAdapter {
  readonly platform = "reddit" as const;

  isConfigured(): boolean {
    return (
      process.env.REDDIT_API_ENABLED === "true" &&
      process.env.REDDIT_COMMERCIAL_ACCESS_APPROVED === "true" &&
      Boolean(process.env.REDDIT_ACCESS_TOKEN?.trim()) &&
      Boolean(process.env.REDDIT_USER_AGENT?.trim())
    );
  }

  async search(
    query: SourceSearchQuery,
    cursor?: string | null,
  ): Promise<SourceSearchPage> {
    if (!this.isConfigured()) {
      throw new SourceAdapterError(
        "Reddit Data API is not enabled and approved for this deployment",
        {
          code: "REDDIT_NOT_CONFIGURED",
          retryable: false,
        },
      );
    }

    const community = normalizeCommunity(query.community);
    const baseUrl = community
      ? "https://oauth.reddit.com/r/" + community + "/search"
      : "https://oauth.reddit.com/search";
    const url = new URL(baseUrl);
    url.searchParams.set("q", query.queryText);
    url.searchParams.set("sort", "new");
    url.searchParams.set("t", "month");
    url.searchParams.set("raw_json", "1");

    const configuredLimit = Number.parseInt(process.env.REDDIT_SEARCH_LIMIT || "50", 10);
    const limit = Number.isFinite(configuredLimit)
      ? Math.min(Math.max(configuredLimit, 1), 100)
      : 50;
    url.searchParams.set("limit", String(limit));

    if (community) {
      url.searchParams.set("restrict_sr", "on");
    }
    if (cursor) {
      url.searchParams.set("after", cursor);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + process.env.REDDIT_ACCESS_TOKEN,
        "User-Agent": process.env.REDDIT_USER_AGENT || "SignalOS/0.3",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") || "60", 10);
      throw new SourceAdapterError("Reddit API rate limit reached", {
        code: "REDDIT_RATE_LIMITED",
        retryable: true,
        retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : 60,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new SourceAdapterError(
        "Reddit API rejected credentials with HTTP " + response.status,
        {
          code: "REDDIT_AUTH_REJECTED",
          retryable: false,
        },
      );
    }

    if (!response.ok) {
      throw new SourceAdapterError(
        "Reddit API returned HTTP " + response.status,
        {
          code: "REDDIT_API_ERROR",
          retryable: response.status >= 500,
        },
      );
    }

    const listing = (await response.json()) as RedditListing;
    const children = listing.data?.children ?? [];
    const items = children
      .map(normalizeRedditPost)
      .filter((item): item is NormalizedSourcePost => Boolean(item));

    return {
      items,
      after: listing.data?.after ?? null,
      metadata: {
        returned: items.length,
        community,
      },
    };
  }
}
