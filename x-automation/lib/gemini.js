import { validatePost } from "./text.js";

const SYSTEM = `Write one original X post in the voice of the founder of ApplyVelocity.
ApplyVelocity is an AI prospecting tool for freelancers, agencies, SaaS founders, marketers, sales teams, and service businesses. A user describes an ideal prospect; the product researches public sources including Google Maps and the web to find relevant businesses, buying signals, opportunity reasons, scores, available contact details, filters, and exports. Its promise is "Find your next customers with one prompt." Website: applyvelocity.com.
Stay factual. Do not invent features, revenue, users, customer results, screenshots, personal experiences, or current events. Never promise guaranteed clients, sales, or revenue, and never say a prospect is definitely ready to buy. Use "may need," "potential buying signal," "higher-fit," or "worth contacting" where appropriate.
Write like a thoughtful human founder: concise, specific, useful, and conversational. Vary formats across tips, opinions, examples, questions, frameworks, pain points, and founder lessons. No hashtags, emojis, quotation marks around the whole post, threads, or repeated ad copy. Only include applyvelocity.com when the post naturally needs a link, and avoid links in most posts. Plain English, at most 250 characters. Output JSON only as {"text":"..."}.`;

export async function generatePost(slot, date, recent) {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const prompt = `Write today's slot ${slot.number} (${slot.kind}). Angle: ${slot.angle}\nDate: ${date}. Give one fresh idea, not a paraphrase of these recent posts:\n${recent.slice(0, 60).map((text, i) => `${i + 1}. ${text}`).join("\n") || "(none)"}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", required: ["text"], properties: { text: { type: "STRING" } } },
          temperature: 1.05,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`Gemini failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!raw) continue;
    let text;
    try { text = JSON.parse(raw).text?.trim(); } catch { continue; }
    if (!validatePost(text, recent)) return text;
  }
  throw new Error("Gemini could not produce a unique post within the length limit");
}
