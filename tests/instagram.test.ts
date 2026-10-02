import assert from "node:assert/strict";
import test from "node:test";
import { createMediaContainer, findReelAudio } from "../lib/instagram.ts";

test("selects catalog music and attaches it to a Reel", async (context) => {
  process.env.INSTAGRAM_ACCESS_TOKEN = "EAA_test";
  process.env.INSTAGRAM_ACCOUNT_ID = "12345";
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    return Response.json(url.pathname.endsWith("/ig_audio")
      ? { audio: [{ audio_id: "track-1", title: "Hindi comedy", duration_in_ms: 20_000 }] }
      : { id: "container-1" });
  });

  const id = await createMediaContainer("https://example.com/reel.mp4", "Caption", "Indian family sarcasm", "12345678-test");
  assert.equal(id, "container-1");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get("audio_type"), "music");
  assert.equal(calls[0].url.searchParams.get("ig_user_id"), "12345");
  const body = calls[1].init?.body as URLSearchParams;
  assert.equal(body.get("media_type"), "REELS");
  assert.equal(body.get("video_url"), "https://example.com/reel.mp4");
  assert.equal(JSON.parse(body.get("audio_configuration") || "{}").audio_id, "track-1");
});

test("fails when no matching music is available", async (context) => {
  process.env.INSTAGRAM_ACCESS_TOKEN = "EAA_test";
  process.env.INSTAGRAM_ACCOUNT_ID = "12345";
  context.mock.method(globalThis, "fetch", async () => Response.json({ audio: [] }));
  await assert.rejects(findReelAudio("Desi adulting", "12345678-test"), /No suitable Meta catalog track/);
});
