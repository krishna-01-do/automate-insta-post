import { randomUUID } from "node:crypto";
import { claimSlot, recentContent, updateClaim } from "./db.js";
import { generatePost } from "./gemini.js";
import { indiaDate, SLOT_PLAN, slotForPath } from "./plan.js";
import { validatePost } from "./text.js";
import { createXPost, XRejectedError } from "./x-api.js";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleCron(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ ok: false, error: "Unauthorized" }, 401);
  const slotNumber = slotForPath(new URL(request.url).pathname);
  if (!slotNumber) return json({ ok: false, error: "Invalid slot" }, 400);
  const date = indiaDate();
  const slot = { ...SLOT_PLAN[slotNumber - 1], number: slotNumber };
  try {
    const claim = await claimSlot(date, slotNumber, slot.kind);
    const post = claim?.post;
    if (!post) throw new Error("Supabase returned no slot record");
    if (!claim.claimed) {
      return json({ ok: true, published: post.status === "posted", reason: post.status, slot: slotNumber, postId: post.tweet_id || undefined });
    }

    let recent = await recentContent();
    if (post.content) recent = recent.filter((text) => text !== post.content);
    if (!post.content) {
      try {
        const content = await generatePost(slot, date, recent);
        await updateClaim(post, { content });
      } catch (error) {
        await updateClaim(post, { status: "failed", error_message: String(error).slice(0, 1_000) });
        throw error;
      }
    }
    const validation = validatePost(post.content, recent);
    if (validation) {
      await updateClaim(post, { status: "failed", error_message: validation });
      throw new Error(validation);
    }

    // Once marked sending, automatic retries stop: an interrupted HTTP request
    // might already have created the X post.
    await updateClaim(post, { status: "sending", error_message: null });
    let tweetId;
    try {
      tweetId = await createXPost(post.content);
    } catch (error) {
      if (error instanceof XRejectedError) {
        await updateClaim(post, { status: "failed", error_message: error.message.slice(0, 1_000) });
      } else {
        await updateClaim(post, { status: "uncertain", error_message: `Check X before retrying: ${String(error)}`.slice(0, 1_000) });
      }
      throw error;
    }
    await updateClaim(post, { status: "posted", tweet_id: tweetId, error_message: null });
    return json({ ok: true, published: true, slot: slotNumber, postId: tweetId });
  } catch (error) {
    const requestId = randomUUID();
    console.error("X publisher failed", { requestId, slot: slotNumber, error });
    return json({ ok: false, error: String(error), requestId }, 500);
  }
}
