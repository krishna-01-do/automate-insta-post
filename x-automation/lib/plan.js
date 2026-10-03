// One fresh text post per slot. These topics are deliberately varied; the AI
// must not repeat the example connection prompts verbatim.
export const SLOT_PLAN = [
  { kind: "connection", angle: "Ask founders and builders what they are working on; invite specific replies." },
  { kind: "prospecting", angle: "Give a practical B2B prospecting tip; no product pitch." },
  { kind: "applyvelocity", angle: "Share a useful insight on finding better-fit clients; mention ApplyVelocity only when natural." },
  { kind: "startup", angle: "Share a concrete founder or SaaS lesson from building a product." },
  { kind: "applyvelocity", angle: "Show one realistic ApplyVelocity use case with a specific ideal-customer prompt." },
  { kind: "connection", angle: "Ask founders to share their startup or product and who it helps, in a fresh format." },
  { kind: "applyvelocity", angle: "Share a founder/build-in-public lesson from working on ApplyVelocity, without invented metrics." },
  { kind: "startup", angle: "Share a useful idea about AI, automation, web apps, marketing, or distribution." },
  { kind: "applyvelocity", angle: "Ask a thoughtful question about lead research or outreach; a natural product mention is optional." },
  { kind: "startup", angle: "Give a specific insight on SaaS customer acquisition or founder distribution." },
];

export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function slotForPath(pathname) {
  const match = /^\/api\/cron\/(10|[1-9])$/.exec(pathname);
  return match ? Number(match[1]) : null;
}
