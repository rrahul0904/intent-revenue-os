import { describe, expect, it } from "vitest";
import { calculateLeadScore, scoreBand } from "../src/lib/scoring";

describe("lead scoring", () => {
  it("produces a weighted score", () => {
    expect(calculateLeadScore({ problemMatch: 100, buyingIntent: 100, productFit: 100, switchingIntent: 100, urgency: 100, freshness: 100 })).toBe(100);
  });
  it("keeps score within the supported range", () => {
    expect(calculateLeadScore({ problemMatch: -100, buyingIntent: -20, productFit: 0, switchingIntent: 0, urgency: 0, freshness: 0 })).toBe(0);
  });
  it("maps high-intent leads to the hot band", () => {
    expect(scoreBand(94)).toBe("hot");
  });
});
