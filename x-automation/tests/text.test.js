import assert from "node:assert/strict";
import test from "node:test";
import { isTooSimilar, validatePost, weightedLength } from "../lib/text.js";
import { SLOT_PLAN, slotForPath } from "../lib/plan.js";

test("ten slots have the intended content mix", () => {
  assert.equal(SLOT_PLAN.length, 10);
  assert.equal(SLOT_PLAN.filter((slot) => slot.kind === "connection").length, 2);
  assert.equal(SLOT_PLAN.filter((slot) => slot.kind === "applyvelocity").length, 4);
  assert.equal(slotForPath("/api/cron/10"), 10);
  assert.equal(slotForPath("/api/cron/11"), null);
});

test("counts links conservatively and rejects long or repeated copy", () => {
  assert.equal(weightedLength("Try applyvelocity.com"), 27);
  assert.equal(validatePost("A".repeat(261), []), "Post must be 1–260 weighted characters");
  assert.equal(validatePost("Find prospects at applyvelocity.com", []), null);
  assert.equal(isTooSimilar("Find better prospects by checking websites and reviews", ["Checking reviews and websites helps find better prospects"]), true);
  assert.match(validatePost("Guaranteed clients with one prompt", []), /Unsupported/);
});
