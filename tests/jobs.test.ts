import { describe, expect, it } from "vitest";
import { calculateRetryDelaySeconds } from "../src/repositories/jobs";

describe("queue retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(calculateRetryDelaySeconds(1)).toBe(15);
    expect(calculateRetryDelaySeconds(2)).toBe(30);
    expect(calculateRetryDelaySeconds(3)).toBe(60);
    expect(calculateRetryDelaySeconds(20)).toBe(3600);
  });
});
