import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

export interface WebsiteSnapshotData {
  url: string;
  statusCode: number;
  contentType: string | null;
  title: string | null;
  description: string | null;
  textContent: string;
  contentHash: string;
}

export class WebsiteFetchError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, options: { code: string; retryable: boolean }) {
    super(message);
    this.name = "WebsiteFetchError";
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

function ipv4Parts(address: string): number[] | null {
  if (net.isIP(address) !== 4) return null;
  const parts = address.split(".").map((part) => Number(part));
  return parts.length === 4 && parts.every((part) => Number.isInteger(part))
    ? parts
    : null;
}

export function isPrivateAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase();
  const ipv4 = ipv4Parts(normalized);

  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }

  if (net.isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
    if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;

    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      return isPrivateAddress(mapped);
    }
  }

  return false;
}

async function assertPublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new WebsiteFetchError("Website URL is invalid", {
      code: "WEBSITE_INVALID_URL",
      retryable: false,
    });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new WebsiteFetchError("Only http and https website URLs are allowed", {
      code: "WEBSITE_UNSUPPORTED_SCHEME",
      retryable: false,
    });
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new WebsiteFetchError("Private network website targets are blocked", {
      code: "WEBSITE_PRIVATE_TARGET",
      retryable: false,
    });
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new WebsiteFetchError("Private network website targets are blocked", {
        code: "WEBSITE_PRIVATE_TARGET",
        retryable: false,
      });
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new WebsiteFetchError("Website hostname could not be resolved", {
      code: "WEBSITE_DNS_FAILED",
      retryable: true,
    });
  }

  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new WebsiteFetchError("Website resolved to a private network address", {
      code: "WEBSITE_PRIVATE_TARGET",
      retryable: false,
    });
  }

  return url;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function extractTagText(html: string, tag: string): string | null {
  const pattern = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) || null;
}

function attributeValue(tag: string, name: string): string | null {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i");
  const match = tag.match(pattern);
  return match?.[2] ? decodeHtmlEntities(match[2].trim()) : null;
}

function extractMetaDescription(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const name = (attributeValue(tag, "name") || attributeValue(tag, "property") || "")
      .toLowerCase();
    if (name === "description" || name === "og:description") {
      const content = attributeValue(tag, "content");
      if (content) return content;
    }
  }

  return null;
}

export function extractReadableWebsite(
  html: string,
  url: string,
): Omit<WebsiteSnapshotData, "statusCode" | "contentType"> {
  const title = extractTagText(html, "title");
  const description = extractMetaDescription(html);
  const cleaned = html
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style|noscript|svg|form|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const textContent = decodeHtmlEntities(cleaned)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 120_000);

  const contentHash = createHash("sha256")
    .update(url + "\n" + (title ?? "") + "\n" + (description ?? "") + "\n" + textContent)
    .digest("hex");

  return {
    url,
    title,
    description,
    textContent,
    contentHash,
  };
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let output = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;

    received += chunk.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new WebsiteFetchError("Website response exceeded the configured size limit", {
        code: "WEBSITE_TOO_LARGE",
        retryable: false,
      });
    }

    output += decoder.decode(chunk.value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

export async function fetchWebsiteSnapshot(input: string): Promise<WebsiteSnapshotData> {
  if (process.env.WEBSITE_FETCH_ENABLED === "false") {
    throw new WebsiteFetchError("Website fetching is disabled", {
      code: "WEBSITE_FETCH_DISABLED",
      retryable: false,
    });
  }

  const timeoutMs = Math.min(
    Math.max(Number.parseInt(process.env.WEBSITE_FETCH_TIMEOUT_MS || "12000", 10) || 12000, 1000),
    30000,
  );
  const maxBytes = Math.min(
    Math.max(Number.parseInt(process.env.WEBSITE_FETCH_MAX_BYTES || "1200000", 10) || 1200000, 100_000),
    5_000_000,
  );

  let current = await assertPublicHttpUrl(input);

  for (let redirect = 0; redirect <= 4; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent":
            process.env.WEBSITE_FETCH_USER_AGENT ||
            "SignalOS/0.3 (+https://github.com/rrahul0904/intent-revenue-os)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof WebsiteFetchError) throw error;
      throw new WebsiteFetchError("Website request failed", {
        code: "WEBSITE_NETWORK_ERROR",
        retryable: true,
      });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new WebsiteFetchError("Website redirect did not include a location", {
          code: "WEBSITE_BAD_REDIRECT",
          retryable: false,
        });
      }

      if (redirect === 4) {
        throw new WebsiteFetchError("Website exceeded the redirect limit", {
          code: "WEBSITE_REDIRECT_LIMIT",
          retryable: false,
        });
      }

      current = await assertPublicHttpUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new WebsiteFetchError("Website returned HTTP " + response.status, {
        code: "WEBSITE_HTTP_ERROR",
        retryable: response.status >= 500 || response.status === 429,
      });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.toLowerCase().includes("text/html")) {
      throw new WebsiteFetchError("Website did not return HTML content", {
        code: "WEBSITE_NON_HTML",
        retryable: false,
      });
    }

    const html = await readLimitedBody(response, maxBytes);
    const extracted = extractReadableWebsite(html, current.toString());

    if (extracted.textContent.length < 40) {
      throw new WebsiteFetchError("Website did not contain enough readable text", {
        code: "WEBSITE_EMPTY_CONTENT",
        retryable: false,
      });
    }

    return {
      ...extracted,
      statusCode: response.status,
      contentType,
    };
  }

  throw new WebsiteFetchError("Website fetch failed", {
    code: "WEBSITE_UNKNOWN",
    retryable: true,
  });
}
