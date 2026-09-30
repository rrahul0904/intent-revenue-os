import { describe, expect, it } from "vitest";
import { demoProspects } from "@/lib/distribution/demo-data";
import {
  calculateFitScore,
  rankProspects,
} from "@/lib/distribution/workflow";

describe("distribution fit scoring", () => {
  it("uses a bounded deterministic weighted score", () => {
    const score = calculateFitScore({
      problemMatch: 100,
      personaFit: 100,
      buyingIntent: 100,
      timing: 100,
      trustContext: 100,
      freshness: 100,
    });
    expect(score).toBe(100);

    expect(
      calculateFitScore({
        problemMatch: -20,
        personaFit: 0,
        buyingIntent: 0,
        timing: 0,
        trustContext: 0,
        freshness: 0,
      }),
    ).toBe(0);
  });

  it("ranks eligible prospects ahead of blocked prospects", () => {
    const ranked = rankProspects(demoProspects);
    const firstBlockedIndex = ranked.findIndex(
      (prospect) => prospect.eligibility !== "eligible",
    );

    expect(firstBlockedIndex).toBeGreaterThan(0);
    expect(
      ranked.slice(0, firstBlockedIndex).every(
        (prospect) => prospect.eligibility === "eligible",
      ),
    ).toBe(true);
  });
});
