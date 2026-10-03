import { createHmac, randomBytes } from "node:crypto";

const POST_URL = "https://api.x.com/2/tweets";
const encode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function oauthHeader(method, url, credentials, nonce = randomBytes(16).toString("hex"), timestamp = String(Math.floor(Date.now() / 1000))) {
  const params = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };
  const parsed = new URL(url);
  const all = [...Object.entries(params), ...parsed.searchParams.entries()];
  const normalized = all.map(([key, value]) => [encode(key), encode(value)])
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
    .map(([key, value]) => `${key}=${value}`).join("&");
  const baseUrl = `${parsed.origin}${parsed.pathname}`;
  const base = [method.toUpperCase(), encode(baseUrl), encode(normalized)].join("&");
  const secret = `${encode(credentials.apiSecret)}&${encode(credentials.accessTokenSecret)}`;
  params.oauth_signature = createHmac("sha1", secret).update(base).digest("base64");
  return `OAuth ${Object.entries(params).map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(", ")}`;
}

export class XRejectedError extends Error {}

export async function createXPost(text) {
  const credentials = {
    apiKey: required("X_API_KEY"),
    apiSecret: required("X_API_SECRET"),
    accessToken: required("X_ACCESS_TOKEN"),
    accessTokenSecret: required("X_ACCESS_TOKEN_SECRET"),
  };
  const response = await fetch(POST_URL, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", POST_URL, credentials),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new XRejectedError(`X rejected the post (${response.status}): ${body?.detail || body?.title || body?.errors?.[0]?.detail || "unknown error"}`);
  if (!body?.data?.id) throw new Error("X accepted the request but did not return a post ID");
  return body.data.id;
}
