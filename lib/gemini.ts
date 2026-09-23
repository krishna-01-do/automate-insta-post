import { env } from "./env";
import { CATEGORIES, type GeneratedPost } from "./types";
import { isTooSimilar } from "./similarity";
import { sleep } from "./utils";

const FAST_MODEL = "gemini-3.5-flash-lite";
const QUALITY_MODEL = "gemini-3.6-flash";

class GeminiRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const SYSTEM_INSTRUCTION = `You are the funniest writer for a Gen Z Instagram meme page called @brosaid.it.

Your job is to write original, highly shareable text memes—not normal quotes. Every post should feel like something a clever, sarcastic friend casually said in the group chat. People should instantly relate, laugh, tag someone, send it to a friend, or repost it to their story because it describes them perfectly.

Write about: adult life, dating, relationships, situationships, friendships, money, work, social media, modern behaviour, overthinking, awkward moments, laziness, sleep, texting, being broke, weekend plans, family drama, confidence, social batteries, and everyday human behaviour.

STYLE PRIORITY:
- Funny, sarcastic, savage, cool, and instantly relatable.
- Short meme-style observations, punchlines, confessions, and uncomfortable truths.
- Natural internet language that a real person would post.
- Strong first-read impact; the joke or relatable idea must land immediately.
- Specific everyday situations are better than vague thoughts.
- Most posts should make readers think “this is literally me” or “I know exactly who to send this to.”

AVOID:
- Inspirational, motivational, philosophical, poetic, wholesome, or generic quote-page writing.
- Advice, life lessons, corporate language, forced wisdom, or obvious AI phrasing.
- Famous quotes, recycled viral lines, setup labels, quotation marks, and hashtags inside the quote.
- Explaining the joke.
- Fake medical or psychological claims, slurs, hateful content, or cruel attacks on protected groups.

Most quotes must be 5–24 words. Occasionally use a slightly longer line only when the punchline needs it. Make every idea immediately understandable. Keep the humour edgy and savage without becoming hateful or genuinely abusive.

The caption must be very short and casual. Good examples include: “too real 😭”, “we all know one”, “not naming names”, “why is this accurate”, “send this to them 💀”, “caught in 4k”, “bro really said it”, or just a fitting emoji. Do not force a call to action. Generate 5–10 relevant hashtags. Return valid JSON only.`;

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

async function requestBatch(
  count: number,
  recentQuotes: string[],
  categoryOffset: number,
  model: string,
): Promise<GeneratedPost[]> {
  const categories = Array.from({ length: count }, (_, index) => CATEGORIES[(categoryOffset + index) % CATEGORIES.length]);
  const prompt = `Generate exactly ${count} distinct posts as a JSON array. Use these categories in order, one per post: ${categories.join(", ")}.

Do not repeat or closely rewrite any idea in this recent-content list:\n${recentQuotes.map((quote, index) => `${index + 1}. ${quote}`).join("\n") || "(none)"}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey())}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 1.05 },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    throw new GeminiRequestError(
      response.status,
      `Gemini request failed using ${model} (${response.status}): ${(await response.text()).slice(0, 500)}`,
    );
  }
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

async function requestBatchWithFallback(
  count: number,
  recentQuotes: string[],
  categoryOffset: number,
): Promise<GeneratedPost[]> {
  const primaryModel = env.geminiModel();
  const fallbackModel = primaryModel === FAST_MODEL ? QUALITY_MODEL : FAST_MODEL;
  const attemptModels = [primaryModel, primaryModel, fallbackModel];
  let lastError: unknown;

  for (let attempt = 0; attempt < attemptModels.length; attempt += 1) {
    const model = attemptModels[attempt];
    try {
      return await requestBatch(count, recentQuotes, categoryOffset, model);
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof DOMException
        && (error.name === "TimeoutError" || error.name === "AbortError");
      const isNetworkFailure = error instanceof TypeError;
      const isTemporaryApiFailure = error instanceof GeminiRequestError
        && (error.status === 429 || error.status >= 500);
      if (!isTimeout && !isNetworkFailure && !isTemporaryApiFailure) throw error;
      if (attempt < attemptModels.length - 1) await sleep(attempt === 0 ? 2_000 : 5_000);
    }
  }

  throw lastError;
}

export async function generateUniquePosts(count: number, recentQuotes: string[]): Promise<GeneratedPost[]> {
  const accepted: GeneratedPost[] = [];
  let calls = 0;
  while (accepted.length < count && calls < 3) {
    const needed = count - accepted.length;
    const batch = await requestBatchWithFallback(
      needed,
      [...recentQuotes, ...accepted.map((post) => post.quote)],
      accepted.length,
    );
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
