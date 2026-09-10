import type {
  GeneratedSignalQuery,
  ProductProfile,
} from "@/lib/types";
import type { WebsiteSnapshotData } from "@/adapters/web/website-fetcher";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "because",
  "been",
  "best",
  "build",
  "can",
  "for",
  "from",
  "get",
  "helps",
  "into",
  "more",
  "our",
  "product",
  "software",
  "that",
  "the",
  "their",
  "this",
  "tool",
  "use",
  "using",
  "with",
  "your",
]);

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function extractCategoryTerms(text: string, max = 6): string[] {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter(
      (token) =>
        token.length >= 4 &&
        token.length <= 28 &&
        !STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([token]) => token);
}

export function buildProfileFromWebsite(
  existing: ProductProfile,
  snapshot: WebsiteSnapshotData,
): ProductProfile {
  const sourceText = [
    snapshot.title ?? "",
    snapshot.description ?? "",
    snapshot.textContent.slice(0, 12_000),
  ].join(" ");

  const categoryTerms = extractCategoryTerms(sourceText);
  const summary =
    snapshot.description?.trim() ||
    snapshot.textContent.replace(/\s+/g, " ").slice(0, 360) ||
    existing.summary;

  const detectedPains = unique([
    ...existing.pains,
    ...categoryTerms.slice(0, 3).map((term) => term + " workflow"),
  ]).slice(0, 8);

  return {
    ...existing,
    name: snapshot.title?.split(/[|–—-]/)[0]?.trim() || existing.name,
    summary,
    pains: detectedPains,
    buyingSignals: unique([
      ...existing.buyingSignals,
      "recommendations for",
      "looking for",
      "alternative to",
      "moving away from",
      "open to paying",
      "outgrowing",
    ]).slice(0, 12),
    categoryTerms,
    sourceTitle: snapshot.title ?? undefined,
    sourceDescription: snapshot.description ?? undefined,
    sourceContentHash: snapshot.contentHash,
  };
}

function quoted(value: string): string {
  const normalized = value.replace(/["\n\r]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.includes(" ") ? '"' + normalized + '"' : normalized;
}

export function generateSignalQueries(
  profile: ProductProfile,
): GeneratedSignalQuery[] {
  const results: GeneratedSignalQuery[] = [];

  for (const pain of profile.pains.slice(0, 5)) {
    results.push({
      queryType: "pain",
      queryText: quoted(pain),
      priority: 70,
    });
  }

  for (const term of (profile.categoryTerms ?? []).slice(0, 5)) {
    results.push(
      {
        queryType: "recommendation",
        queryText: "recommendations " + quoted(term),
        priority: 85,
      },
      {
        queryType: "category",
        queryText: "looking for " + quoted(term),
        priority: 80,
      },
    );
  }

  for (const competitor of profile.competitors.slice(0, 6)) {
    results.push(
      {
        queryType: "switching",
        queryText: "alternative to " + quoted(competitor),
        priority: 95,
      },
      {
        queryType: "competitor",
        queryText: quoted(competitor) + " alternative",
        priority: 90,
      },
    );
  }

  if (results.length < 8) {
    for (const signal of profile.buyingSignals.slice(0, 6)) {
      const category = (profile.categoryTerms ?? [])[0];
      results.push({
        queryType: signal.includes("alternative") ? "switching" : "recommendation",
        queryText: category ? quoted(signal) + " " + quoted(category) : quoted(signal),
        priority: 75,
      });
    }
  }

  const deduped = new Map<string, GeneratedSignalQuery>();
  for (const query of results) {
    const key = query.queryText.toLowerCase().replace(/\s+/g, " ").trim();
    const previous = deduped.get(key);
    if (!previous || query.priority > previous.priority) {
      deduped.set(key, query);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 24);
}
