import { describe, expect, it } from "vitest";
import {
  buildProfileFromWebsite,
  extractCategoryTerms,
  generateSignalQueries,
} from "../src/services/query-generation";
import type { ProductProfile } from "../src/lib/types";

const baseProfile: ProductProfile = {
  name: "FlowSignal",
  url: "https://flowsignal.example",
  summary: "Workflow intelligence for operations teams",
  idealCustomer: "Operations leaders",
  pains: ["manual intake", "missed follow-ups"],
  buyingSignals: ["looking for", "alternative to"],
  competitors: ["Monday"],
};

describe("query generation", () => {
  it("extracts useful category terms from website text", () => {
    const terms = extractCategoryTerms(
      "workflow workflow automation operations intake approvals automation",
    );
    expect(terms[0]).toBe("automation");
    expect(terms).toContain("workflow");
  });

  it("builds a source-grounded product profile", () => {
    const profile = buildProfileFromWebsite(baseProfile, {
      url: "https://flowsignal.example",
      statusCode: 200,
      contentType: "text/html",
      title: "FlowSignal | Operations workflow automation",
      description: "Automate request intake and operational follow-up.",
      textContent:
        "FlowSignal provides workflow automation for operations teams and request intake.",
      contentHash: "abc123",
    });

    expect(profile.sourceContentHash).toBe("abc123");
    expect(profile.summary).toContain("Automate request intake");
    expect(profile.categoryTerms?.length).toBeGreaterThan(0);
  });

  it("generates deduplicated intent searches", () => {
    const queries = generateSignalQueries({
      ...baseProfile,
      categoryTerms: ["workflow", "automation"],
    });

    expect(queries.some((query) => query.queryText.includes("alternative to"))).toBe(true);
    expect(new Set(queries.map((query) => query.queryText.toLowerCase())).size).toBe(
      queries.length,
    );
    expect(queries.length).toBeLessThanOrEqual(24);
  });
});
