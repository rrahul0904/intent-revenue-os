import { buildDemoProfile } from "@/lib/product-intelligence";
import type { ProductProfile } from "@/lib/types";
import {
  fetchWebsiteSnapshot,
  WebsiteFetchError,
} from "@/adapters/web/website-fetcher";
import {
  getProductSystem,
  persistDiscoveredProductProfile,
  persistWebsiteSnapshot,
} from "@/repositories/product-intelligence";
import { upsertGeneratedQueries } from "@/repositories/source-queries";
import { buildProfileFromWebsite, generateSignalQueries } from "@/services/query-generation";

function asProductProfile(value: unknown, url: string): ProductProfile {
  if (
    value &&
    typeof value === "object" &&
    "summary" in value &&
    "pains" in value &&
    "buyingSignals" in value
  ) {
    return value as ProductProfile;
  }
  return buildDemoProfile(url);
}

export async function discoverProductIntelligence(productId: string) {
  const product = await getProductSystem(productId);
  if (!product) throw new Error("Not found");

  const existing = asProductProfile(product.profile, product.url);
  const snapshot = await fetchWebsiteSnapshot(product.url);
  const persistedSnapshot = await persistWebsiteSnapshot(product.id, snapshot);
  const profile = buildProfileFromWebsite(existing, snapshot);
  const profileResult = await persistDiscoveredProductProfile({
    productId: product.id,
    profile,
    sourceHash: snapshot.contentHash,
  });

  const generated = generateSignalQueries(profile);
  const queries = await upsertGeneratedQueries(product.id, generated);

  return {
    productId: product.id,
    workspaceId: product.workspaceId,
    snapshotId: persistedSnapshot.snapshot.id,
    snapshotChanged: persistedSnapshot.created,
    profileVersion: profileResult.profileVersion,
    profileChanged: profileResult.changed,
    queries,
  };
}

export function classifyProductDiscoveryError(error: unknown) {
  if (error instanceof WebsiteFetchError) {
    return {
      code: error.code,
      retryable: error.retryable,
      message: error.message,
    };
  }

  return {
    code: "PRODUCT_DISCOVERY_ERROR",
    retryable: true,
    message: error instanceof Error ? error.message : "Unknown product discovery error",
  };
}
