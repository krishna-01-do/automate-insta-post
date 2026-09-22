import { createHash } from "node:crypto";

export function normalizeQuote(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteHash(value: string): string {
  return createHash("sha256").update(normalizeQuote(value)).digest("hex");
}

function tokens(value: string): Set<string> {
  return new Set(normalizeQuote(value).split(" ").filter((word) => word.length > 2));
}

export function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return normalizeQuote(a) === normalizeQuote(b) ? 1 : 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const jaccard = intersection / (left.size + right.size - intersection);
  const containment = intersection / Math.min(left.size, right.size);
  return Math.max(jaccard, containment);
}

export function isTooSimilar(candidate: string, existing: string[]): boolean {
  const normalized = normalizeQuote(candidate);
  return existing.some((quote) => {
    const prior = normalizeQuote(quote);
    return normalized === prior || normalized.includes(prior) || prior.includes(normalized) || similarity(candidate, quote) >= 0.7;
  });
}
