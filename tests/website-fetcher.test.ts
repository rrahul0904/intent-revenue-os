import { describe, expect, it } from "vitest";
import {
  extractReadableWebsite,
  isPrivateAddress,
} from "../src/adapters/web/website-fetcher";

describe("website fetch safety", () => {
  it("blocks common private address ranges", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.20.30.40")).toBe(true);
    expect(isPrivateAddress("172.20.1.2")).toBe(true);
    expect(isPrivateAddress("192.168.1.1")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("extracts useful text while removing executable content", () => {
    const result = extractReadableWebsite(
      [
        "<html>",
        "<head><title>Example Product</title>",
        '<meta name="description" content="A useful operations product.">',
        "<style>.secret{display:none}</style></head>",
        "<body><h1>Automate intake</h1>",
        "<script>stealCookies()</script>",
        "<p>Track every request and follow-up.</p></body></html>",
      ].join(""),
      "https://example.com/",
    );

    expect(result.title).toBe("Example Product");
    expect(result.description).toBe("A useful operations product.");
    expect(result.textContent).toContain("Automate intake");
    expect(result.textContent).toContain("Track every request");
    expect(result.textContent).not.toContain("stealCookies");
    expect(result.contentHash).toHaveLength(64);
  });
});
