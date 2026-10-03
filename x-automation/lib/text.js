const URL = /https?:\/\/\S+|\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?/gi;

export function weightedLength(text) {
  let length = 0;
  let previousEnd = 0;
  for (const match of text.matchAll(URL)) {
    length += [...text.slice(previousEnd, match.index)].reduce((sum, char) => sum + (char.codePointAt(0) > 0x10ff ? 2 : 1), 0);
    length += 23;
    previousEnd = match.index + match[0].length;
  }
  return length + [...text.slice(previousEnd)].reduce((sum, char) => sum + (char.codePointAt(0) > 0x10ff ? 2 : 1), 0);
}

export function normalize(text) {
  return text.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function isTooSimilar(text, recent) {
  const current = normalize(text);
  const words = new Set(current.split(" ").filter((word) => word.length > 3));
  return recent.some((other) => {
    const prior = normalize(other);
    if (current === prior) return true;
    const otherWords = new Set(prior.split(" ").filter((word) => word.length > 3));
    const shared = [...words].filter((word) => otherWords.has(word)).length;
    return words.size >= 4 && otherWords.size >= 4 && shared / Math.min(words.size, otherWords.size) >= 0.8;
  });
}

export function validatePost(text, recent) {
  if (typeof text !== "string") return "Post is not text";
  const trimmed = text.trim();
  if (!trimmed || weightedLength(trimmed) > 260) return "Post must be 1–260 weighted characters";
  if ((trimmed.match(URL) || []).length > 1) return "Use at most one link";
  if (isTooSimilar(trimmed, recent)) return "Post is too similar to recent content";
  if (/guaranteed (clients|sales|revenue)|ready to buy|\$\d+[kKmM]? (revenue|mrr)/i.test(trimmed)) return "Unsupported sales claim";
  return null;
}
