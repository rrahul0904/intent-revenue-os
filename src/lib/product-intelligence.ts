import type { ProductProfile } from "@/lib/types";

export function buildDemoProfile(url: string): ProductProfile {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const name = host.split(".")[0]?.replace(/[-_]/g, " ") || "New Product";
  const displayName = name.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    name: displayName,
    url,
    summary: `AI-generated starter profile for ${displayName}. Connect a web extraction provider and model gateway to replace demo inference with live website intelligence.`,
    idealCustomer: "Teams experiencing a recurring operational pain that the product can solve",
    pains: ["manual work", "fragmented workflow", "slow follow-up"],
    buyingSignals: ["recommendations for", "alternative to", "open to paying", "outgrowing"],
    competitors: [],
  };
}
