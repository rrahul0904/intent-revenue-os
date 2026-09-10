function rate(name: string): number {
  const value = Number.parseFloat(process.env[name] || "0");
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function calculateGenerationCostMicros(input: {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}): number {
  const uncachedInput = Math.max(0, input.inputTokens - input.cachedTokens);
  const costUsd =
    (uncachedInput / 1_000_000) * rate("AI_INPUT_USD_PER_MILLION") +
    (input.cachedTokens / 1_000_000) * rate("AI_CACHED_INPUT_USD_PER_MILLION") +
    (input.outputTokens / 1_000_000) * rate("AI_OUTPUT_USD_PER_MILLION");

  return Math.max(0, Math.round(costUsd * 1_000_000));
}
