import assert from "node:assert/strict";
import test from "node:test";
import { recentContent } from "../lib/db.js";

test("uses a Supabase secret key in apikey only", async (context) => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  context.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.headers.apikey, "sb_secret_test");
    assert.equal(init.headers.Authorization, undefined);
    return Response.json([]);
  });
  assert.deepEqual(await recentContent(), []);
  delete process.env.SUPABASE_SECRET_KEY;
});
