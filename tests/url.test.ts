import { describe, expect, it } from "vitest";
import { canonicalizeProductUrl, productNameFromUrl } from "../src/lib/url";

describe("product URLs", () => {
  it("canonicalizes marketing URLs before persistence", () => {
    expect(
      canonicalizeProductUrl("https://WWW.Example-App.com/pricing/?utm_source=test#plans"),
    ).toBe("https://example-app.com/pricing");
  });

  it("derives a readable starter product name", () => {
    expect(productNameFromUrl("https://reply-rocket.example")).toBe("Reply Rocket");
  });

  it("rejects non-http schemes", () => {
    expect(() => canonicalizeProductUrl("ftp://example.com/file")).toThrow(
      "Only http and https",
    );
  });
});
