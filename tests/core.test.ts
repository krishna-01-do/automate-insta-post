import assert from "node:assert/strict";
import test from "node:test";
import { createQuoteSvg, wrapQuote } from "../lib/image.ts";
import { createSchedule } from "../lib/scheduler.ts";
import { isTooSimilar, normalizeQuote, quoteHash } from "../lib/similarity.ts";

test("normalizes and fingerprints equivalent quotes", () => {
  assert.equal(normalizeQuote("  Don’t panic! "), "dont panic");
  assert.equal(quoteHash("Don't panic"), quoteHash("DON’T PANIC!"));
  assert.equal(isTooSimilar("Work meetings could be emails", ["Most work meetings could have been emails"]), true);
});

test("creates ten future IST slots with variation", () => {
  const now = new Date("2026-09-22T00:00:00.000Z");
  const schedule = createSchedule(10, [], now, () => 0.5);
  assert.equal(schedule.length, 10);
  assert.equal(new Set(schedule).size, 10);
  assert.ok(schedule.every((value) => new Date(value) > now));
});

test("does not reuse an occupied posting slot", () => {
  const now = new Date("2026-09-22T00:00:00.000Z");
  const occupied = ["2026-09-22T03:00:00.000Z"]; // 08:30 IST
  const [first] = createSchedule(1, occupied, now, () => 0.5);
  assert.ok(new Date(first).getTime() > new Date(occupied[0]).getTime() + 60 * 60_000);
});

test("renders safe 1080 by 1350 SVG with wrapped text", () => {
  const quote = "Dating is just two people pretending they did not see each other's screen time.";
  assert.ok(wrapQuote(quote, 66).length > 1);
  const svg = createQuoteSvg("You & me < coffee", "Relatable", 2);
  assert.match(svg, /width="1080" height="1350"/);
  assert.match(svg, /You &amp; me &lt; coffee/);
  assert.match(svg, /@brosaid\.it/);
  assert.doesNotMatch(svg, />RELATABLE</);
});

test("rotates through five visually distinct meme templates", () => {
  const variants = Array.from({ length: 5 }, (_, index) => createQuoteSvg("Salary came. Bills said welcome back.", "Desi adulting", index));
  assert.equal(new Set(variants).size, 5);
  assert.ok(variants.every((svg) => svg.includes("@brosaid.it")));
});
