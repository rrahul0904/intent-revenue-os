import { describe, expect, it } from "vitest";
import { slugify } from "../src/lib/slug";

describe("workspace slugs", () => {
  it("normalizes a workspace name", () => {
    expect(slugify("  Revenue Intelligence Team  ")).toBe("revenue-intelligence-team");
  });

  it("returns a stable fallback for punctuation-only names", () => {
    expect(slugify("!!!")).toBe("workspace");
  });
});
