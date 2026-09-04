export function canonicalizeProductUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https product URLs are supported");
  }

  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.search = "";

  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function productNameFromUrl(input: string): string {
  const hostname = new URL(input).hostname.replace(/^www\./, "");
  const token = hostname.split(".")[0] || "Product";
  return token
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
