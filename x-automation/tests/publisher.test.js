import assert from "node:assert/strict";
import test from "node:test";
import { handleCron } from "../lib/handler.js";
import { oauthHeader } from "../lib/x-api.js";

test("OAuth header includes the user token and a signature", () => {
  const header = oauthHeader("POST", "https://api.x.com/2/tweets", {
    apiKey: "key", apiSecret: "secret", accessToken: "user-token", accessTokenSecret: "user-secret",
  }, "nonce", "123");
  assert.match(header, /oauth_token="user-token"/);
  assert.match(header, /oauth_signature="[^"]+"/);
});

test("publishes a generated post only once for a daily slot", async (context) => {
  Object.assign(process.env, {
    CRON_SECRET: "test-secret", GEMINI_API_KEY: "gemini", SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service", X_API_KEY: "key", X_API_SECRET: "secret",
    X_ACCESS_TOKEN: "user-token", X_ACCESS_TOKEN_SECRET: "user-secret",
  });
  const row = { post_date: "2026-10-03", slot: 1, kind: "connection", status: "working", lease_id: "lease", content: null };
  let posted = 0;
  context.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/claim_x_slot")) {
      return Response.json({ claimed: row.status === "working" && !row.content, post: { ...row } });
    }
    if (url.pathname.endsWith("/x_posts") && init.method === "PATCH") {
      Object.assign(row, JSON.parse(init.body));
      return Response.json([{ ...row }]);
    }
    if (url.pathname.endsWith("/x_posts")) return Response.json([]);
    if (url.hostname === "generativelanguage.googleapis.com") {
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ text: "What are you building this month, founders? Share who it helps." }) }] } }] });
    }
    if (url.hostname === "api.x.com") {
      posted += 1;
      assert.match(init.headers.Authorization, /oauth_token="user-token"/);
      return Response.json({ data: { id: "tweet-1" } }, { status: 201 });
    }
    throw new Error(`Unexpected URL ${url}`);
  });
  const request = new Request("https://example.com/api/cron/1", { headers: { authorization: "Bearer test-secret" } });
  assert.deepEqual(await (await handleCron(request)).json(), { ok: true, published: true, slot: 1, postId: "tweet-1" });
  assert.equal((await (await handleCron(request)).json()).reason, "posted");
  assert.equal(posted, 1);
});

test("rejects calls without the cron secret", async () => {
  process.env.CRON_SECRET = "test-secret";
  const result = await handleCron(new Request("https://example.com/api/cron/1"));
  assert.equal(result.status, 401);
});

test("does not retry a post after an uncertain X network response", async (context) => {
  Object.assign(process.env, {
    CRON_SECRET: "test-secret", SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service", X_API_KEY: "key", X_API_SECRET: "secret",
    X_ACCESS_TOKEN: "user-token", X_ACCESS_TOKEN_SECRET: "user-secret",
  });
  const row = { post_date: "2026-10-03", slot: 2, kind: "prospecting", status: "working", lease_id: "lease-2", content: "A good prospect list starts with a specific customer profile, not a huge spreadsheet." };
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/claim_x_slot")) return Response.json({ claimed: row.status === "working", post: { ...row } });
    if (url.pathname.endsWith("/x_posts") && init.method === "PATCH") {
      Object.assign(row, JSON.parse(init.body));
      return Response.json([{ ...row }]);
    }
    if (url.pathname.endsWith("/x_posts")) return Response.json([row]);
    if (url.hostname === "api.x.com") { calls += 1; throw new TypeError("network lost"); }
    throw new Error(`Unexpected URL ${url}`);
  });
  const request = new Request("https://example.com/api/cron/2", { headers: { authorization: "Bearer test-secret" } });
  assert.equal((await handleCron(request)).status, 500);
  assert.equal(row.status, "uncertain");
  assert.equal((await (await handleCron(request)).json()).reason, "uncertain");
  assert.equal(calls, 1);
});
