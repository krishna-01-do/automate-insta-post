function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function db(path, options = {}) {
  const url = new URL(`/rest/v1/${path}`, required("SUPABASE_URL"));
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${body?.message || "unknown error"}`);
  return body;
}

export async function claimSlot(date, slot, kind) {
  return db("rpc/claim_x_slot", {
    method: "POST",
    body: JSON.stringify({ p_date: date, p_slot: slot, p_kind: kind }),
  });
}

export async function recentContent() {
  const rows = await db("x_posts?select=content&content=not.is.null&order=created_at.desc&limit=100");
  return rows.map((row) => row.content);
}

export async function updateClaim(post, changes) {
  const params = new URLSearchParams({
    post_date: `eq.${post.post_date}`,
    slot: `eq.${post.slot}`,
    lease_id: `eq.${post.lease_id}`,
    status: `eq.${post.status}`,
    select: "post_date,slot,status,content,tweet_id",
  });
  const rows = await db(`x_posts?${params}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...changes, updated_at: new Date().toISOString() }),
  });
  if (rows.length !== 1) throw new Error("Post claim changed; stopping to avoid a duplicate");
  Object.assign(post, rows[0]);
  return post;
}
