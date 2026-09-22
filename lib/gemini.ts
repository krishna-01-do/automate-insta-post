import { env } from "./env";
import { CATEGORIES, type GeneratedPost } from "./types";
import { isTooSimilar } from "./similarity";
import { withRetry } from "./utils";

const SYSTEM_INSTRUCTION = `You are writing original content for a Gen Z Instagram text-based page.

The goal is to create posts people instantly relate to, laugh at, save, share, repost to their story, or send to friends.

Write about: adult life, dating, relationships, situationships, friendships, money, work, social media, modern behaviour, overthinking, awkward situations, sarcasm, dark humour, human behaviour, and psychology-inspired observations.

The writing must feel like a clever real person wrote it. Do not sound like AI. Do not write generic motivational quotes. Do not use corporate language. Do not copy famous quotes. Do not make fake medical or psychological claims. Do not use hashtags inside the quote. Most quotes should be between 5 and 30 words. Make the idea immediately understandable.

Prefer relatable observations, uncomfortable truths, witty jokes, short sarcastic thoughts, modern dating observations, adulting struggles, and social behaviour.

The caption should be short. Sometimes captions can be: "too real 😭", "we all know one", "not naming names", "why is this accurate", or "send this to them 💀". Do not force a CTA every time. Generate 5–10 relevant hashtags. Return valid JSON only.`;

const schema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    required: ["category", "quote", "caption", "hashtags"],
    properties: {
      category: { type: "STRING" }, quote: { type: "STRING" }, caption: { type: "STRING" },
      hashtags: { type: "ARRAY", items: { type: "STRING" }, minItems: 5, maxItems: 10 },
    },
  },
};

function cleanPost(value: unknown): GeneratedPost | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.quote !== "string" || typeof item.caption !== "string" || !Array.isArray(item.hashtags)) return null;
  const category = typeof item.category === "string" ? item.category.trim() : "Relatable";
  const quote = item.quote.trim().replace(/^['\"“]|['\"”]$/g, "");
  const caption = item.caption.trim();
  const hashtags = item.hashtags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => `#${tag.replace(/^#/, "").replace(/\s+/g, "")}`)
    .filter((tag) => tag.length > 1)
    .slice(0, 10);
  if (!quote || !caption || hashtags.length < 5) return null;
  return { category, quote, caption, hashtags };
}

async function requestBatch(count: number, recentQuotes: string[], categoryOffset: number): Promise<GeneratedPost[]> {
  const categories = Array.from({ length: count }, (_, index) => CATEGORIES[(categoryOffset + index) % CATEGORIES.length]);
  const prompt = `Generate exactly ${count} distinct posts as a JSON array. Use these categories in order, one per post: ${categories.join(", ")}.

Do not repeat or closely rewrite any idea in this recent-content list:\n${recentQuotes.map((quote, index) => `${index + 1}. ${quote}`).join("\n") || "(none)"}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel())}:generateContent?key=${encodeURIComponent(env.geminiApiKey())}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 1.05 },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!text) throw new Error("Gemini returned no text");
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Gemini response was not an array");
  return parsed
    .map(cleanPost)
    .filter((post): post is GeneratedPost => post !== null)
    .map((post, index) => ({ ...post, category: categories[index] || post.category }));
}

export async function generateUniquePosts(count: number, recentQuotes: string[]): Promise<GeneratedPost[]> {
  const accepted: GeneratedPost[] = [];
  let calls = 0;
  while (accepted.length < count && calls < 3) {
    const needed = count - accepted.length;
    const batch = await withRetry(() => requestBatch(needed, [...recentQuotes, ...accepted.map((p) => p.quote)], accepted.length), 3, 800);
    calls += 1;
    for (const post of batch) {
      const prior = [...recentQuotes, ...accepted.map((item) => item.quote)];
      if (!isTooSimilar(post.quote, prior)) accepted.push(post);
      if (accepted.length === count) break;
    }
  }
  if (accepted.length < count) throw new Error(`Only ${accepted.length} of ${count} generated posts passed duplicate checks`);
  return accepted;
}
